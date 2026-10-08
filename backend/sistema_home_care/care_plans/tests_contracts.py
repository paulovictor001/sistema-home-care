from django.test import TestCase
from django.core.exceptions import ValidationError
from . import tests_api as fixtures
from .models import CarePlan
from .contracts import planned_requirement


class PlanIntegrationContractTests(TestCase):
    setUp = fixtures.PlanAPITests.setUp
    create = fixtures.PlanAPITests.create

    def test_read_contract_keeps_planned_professional_distinct_from_future_assignment(self):
        data = self.create()
        base = f"/api/planos-cuidados/{data['id']}/necessidades/{data['need_links'][0]['id']}/"
        self.client.post(base + 'configurar/', self.configuration, format='json')
        link = CarePlan.objects.get(pk=data['id']).need_links.get()
        contract = planned_requirement(link)
        self.assertEqual(contract['required_profession_id'], self.professional.profession_id)
        self.assertEqual(contract['required_professional_id'], self.professional.pk)
        self.assertEqual(contract['patient_id'], self.patient.pk)
        contract['resources'].clear()
        self.assertEqual(link.resources.count(), 1)
        self.client.post(base + 'remover/', {'reason': 'Revisão'}, format='json')
        link.refresh_from_db()
        with self.assertRaises(ValidationError):
            planned_requirement(link)
