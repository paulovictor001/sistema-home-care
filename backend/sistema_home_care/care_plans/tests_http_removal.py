from django.test import TestCase
from . import tests_api as fixtures
from .models import CarePlan
from assessments.models import CareNeed
from care_plans.models import CarePlanNeed


class PlanHTTPRemovalTests(TestCase):
    setUp = fixtures.PlanAPITests.setUp
    create = fixtures.PlanAPITests.create

    def test_required_reason_and_snapshot_preserve_need_and_resources(self):
        data = self.create()
        other = CareNeed.objects.create(assessment=self.need.assessment, need_type=self.need.need_type,
            description='Outra necessidade', priority='MEDIUM')
        CarePlanNeed.objects.create(care_plan_id=data['id'], care_need=other)
        base = f"/api/planos-cuidados/{data['id']}/"
        link = base + f"necessidades/{data['need_links'][0]['id']}/"
        self.client.post(link + 'configurar/', self.configuration, format='json')
        for payload in ({}, {'reason': None}, {'reason': ''}, {'reason': '   '}):
            self.assertEqual(self.client.post(link + 'remover/', payload, format='json').status_code, 400)
        plan = CarePlan.objects.get(pk=data['id'])
        self.assertEqual(plan.history.count(), 2)
        self.assertIsNone(plan.need_links.get(pk=data['need_links'][0]['id']).removed_at)
        response = self.client.post(link + 'remover/', {'reason': '  Revisão  '}, format='json')
        self.assertEqual(response.status_code, 200)
        removed = plan.need_links.get(pk=data['need_links'][0]['id'])
        self.assertEqual(removed.removal_reason, 'Revisão')
        self.assertEqual(removed.resources.count(), 1)
        self.need.refresh_from_db()
        self.assertTrue(self.need.is_active)
        self.assertEqual(self.need.status, 'IDENTIFIED')
        self.assertEqual(self.need.description, 'Curativo')
        event = plan.history.first()
        self.assertEqual(event.event_type, 'REMOVE_NEED')
        self.assertIsNone(event.previous_data['needs'][0]['removed_at'])
        self.assertEqual(event.new_data['needs'][0]['removal_reason'], 'Revisão')
        self.assertEqual(self.client.post(link + 'remover/', {'reason': 'Duplicado'}, format='json').status_code, 400)
        self.assertEqual(plan.history.count(), 3)

    def test_http_rejects_removing_last_current_need(self):
        data = self.create()
        link = f"/api/planos-cuidados/{data['id']}/necessidades/{data['need_links'][0]['id']}/remover/"
        response = self.client.post(link, {'reason': 'Revisão'}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('ao menos uma necessidade vigente', str(response.data))
