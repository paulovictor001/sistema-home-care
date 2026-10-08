from django.test import TestCase
from . import tests_api as fixtures
from .models import CarePlan


class PlanHTTPExclusivityTests(TestCase):
    setUp = fixtures.PlanAPITests.setUp
    create = fixtures.PlanAPITests.create

    def test_activation_conflict_same_need_and_reuse_after_closing(self):
        first, second = self.create(), self.create()
        for data in (first, second):
            path = f"/api/planos-cuidados/{data['id']}/necessidades/{data['need_links'][0]['id']}/configurar/"
            self.assertEqual(self.client.post(path, self.configuration, format='json').status_code, 200)
        one, two = (f"/api/planos-cuidados/{data['id']}/" for data in (first, second))
        self.assertEqual(self.client.post(one + 'ativar/').status_code, 200)
        self.assertEqual(self.client.post(two + 'ativar/').status_code, 400)
        self.assertEqual(CarePlan.objects.get(pk=second['id']).status, 'DRAFT')
        self.assertEqual(CarePlan.objects.filter(status='ACTIVE', patient=self.patient).count(), 1)
        self.assertEqual(self.client.post(one + 'encerrar/').status_code, 200)
        self.assertEqual(self.client.post(two + 'ativar/').status_code, 200)
        self.assertEqual(self.client.post(one + 'reativar/').status_code, 400)
        self.need.refresh_from_db()
        self.assertTrue(self.need.is_active)
        self.assertEqual(self.need.care_plan_links.count(), 2)
