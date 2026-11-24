from django.test import TestCase
from assessments.tests_api import MEDICO_CPF
from .models import CarePlanHistory
from . import tests_api as api_contract
from .models import CarePlanNeed
from assessments.models import CareNeed


class PlanHistoryContractTests(TestCase):
    setUp = api_contract.PlanAPITests.setUp
    create = api_contract.PlanAPITests.create
    # Reutiliza as fixtures do contrato HTTP e cobre preservação dos snapshots.
    def test_event_types_actor_identity_and_immutable_names(self):
        data = self.create()
        other = CareNeed.objects.create(assessment=self.assessment, need_type=self.need.need_type,
            description='Outra necessidade', priority='MEDIUM')
        CarePlanNeed.objects.create(care_plan_id=data['id'], care_need=other)
        base = f"/api/planos-cuidados/{data['id']}/"
        link = data['need_links'][0]['id']
        self.assertEqual(self.client.post(base + f'necessidades/{link}/configurar/', self.configuration, format='json').status_code, 200)
        self.assertEqual(self.client.patch(base, {'objective': 'Novo objetivo'}, format='json').status_code, 200)
        self.assertEqual(self.client.post(base + f'necessidades/{link}/remover/', {'reason': 'Revisão'}, format='json').status_code, 200)
        events = CarePlanHistory.objects.filter(care_plan_id=data['id']).order_by('pk')
        self.assertEqual(list(events.values_list('event_type', flat=True)), ['CREATE', 'CONFIGURE_NEED', 'UPDATE', 'REMOVE_NEED'])
        configuration_event = events[1]
        original = configuration_event.new_data
        self.professional.full_name = 'Nome atualizado'
        self.professional.save()
        self.resource.name = 'Nome atualizado do recurso'
        self.resource.save()
        self.users[MEDICO_CPF].delete()
        configuration_event.refresh_from_db()
        self.assertIsNone(configuration_event.changed_by_id)
        self.assertTrue(configuration_event.actor_name)
        self.assertEqual(configuration_event.new_data, original)
        self.assertEqual(original['needs'][0]['professional_name'], 'João')
        self.assertEqual(original['needs'][0]['resources'][0]['resource__name'], 'Gaze')

    def test_plan_response_exposes_creation_and_update_author_names(self):
        data = self.create()
        self.assertEqual(data['created_by'], self.users[MEDICO_CPF].pk)
        self.assertEqual(data['created_by_name'], self.users[MEDICO_CPF].get_full_name())
        self.assertEqual(data['updated_by'], self.users[MEDICO_CPF].pk)
        self.assertEqual(data['updated_by_name'], self.users[MEDICO_CPF].get_full_name())

    def test_history_endpoint_exposes_actor_event_and_snapshots(self):
        data = self.create()
        response = self.client.get(f"/api/planos-cuidados/{data['id']}/historico/")
        self.assertEqual(response.status_code, 200)
        event = response.data[0]
        self.assertEqual(event['event_type'], 'CREATE')
        self.assertTrue(event['actor_name'])
        self.assertEqual(event['previous_data'], {})
        self.assertIn('status', event['new_data'])
