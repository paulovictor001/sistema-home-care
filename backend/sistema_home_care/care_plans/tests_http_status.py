from django.test import TestCase
from assessments.tests_api import auth_client, ENFERMEIRO_CPF
from . import tests_api as fixtures
from .models import CarePlan


class PlanHTTPCycleTests(TestCase):
    setUp = fixtures.PlanAPITests.setUp
    create = fixtures.PlanAPITests.create

    def test_cycle_preserves_pk_timestamps_configuration_and_history(self):
        data = self.create()
        base = f"/api/planos-cuidados/{data['id']}/"
        self.client.post(base + f"necessidades/{data['need_links'][0]['id']}/configurar/", self.configuration, format='json')
        before = CarePlan.objects.get(pk=data['id'])
        for client, action, status in ((self.client, 'ativar', 'ACTIVE'),
            (auth_client(self.users[ENFERMEIRO_CPF]), 'encerrar', 'CLOSED'),
            (auth_client(self.users[ENFERMEIRO_CPF]), 'reativar', 'ACTIVE')):
            response = client.post(base + action + '/')
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['id'], before.pk)
            self.assertEqual(response.data['created_at'], data['created_at'])
            self.assertEqual(response.data['status'], status)
            self.assertEqual(response.data['need_links'][0]['required_professional'], self.professional.pk)
            self.assertEqual(response.data['need_links'][0]['resources'][0]['resource'], self.resource.pk)
        events = list(before.history.filter(event_type='STATUS').order_by('pk'))
        self.assertEqual([(event.previous_data['status'], event.new_data['status']) for event in events],
                         [('DRAFT', 'ACTIVE'), ('ACTIVE', 'CLOSED'), ('CLOSED', 'ACTIVE')])
        self.assertEqual(CarePlan.objects.count(), 1)
        self.assertEqual(self.client.post(base + 'ativar/').status_code, 400)
