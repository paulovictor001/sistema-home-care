from assessments.tests_api import auth_client
from care_plans.models import CarePlan, CarePlanNeed
from .models import ScaleNeed
from .test_support import ScaleFixture


class ScaleNeedManagementTests(ScaleFixture):
    def test_add_remove_readd_preserves_plan_and_frequency_snapshot(self):
        client = auth_client(self.manager)
        url = f'/api/escalas/{self.scale.pk}/necessidades/'
        response = client.post(url, {'plan_need': self.link.pk}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        item = ScaleNeed.objects.get(scale=self.scale)
        self.assertEqual(item.planned_quantity, 2)
        self.assertEqual(item.required_profession_id, self.profession.pk)
        self.assertEqual(client.post(url, {'plan_need': self.link.pk}, format='json').status_code, 400)
        self.link.frequency_quantity = 5
        self.link.save()
        item.refresh_from_db()
        self.assertEqual(item.frequency_quantity, 2)
        self.assertEqual(client.post(f'{url}{item.pk}/remover/', {}, format='json').status_code, 200)
        self.link.refresh_from_db()
        self.assertIsNone(self.link.removed_at)
        self.assertEqual(client.post(url, {'plan_need': self.link.pk}, format='json').status_code, 201)
        self.assertEqual(self.scale.items.count(), 2)

    def test_removed_or_other_plan_need_rejected(self):
        other = CarePlan.objects.create(patient=self.patient, start_date=self.plan.start_date)
        link = CarePlanNeed.objects.create(care_plan=other, care_need=self.need)
        client = auth_client(self.manager)
        url = f'/api/escalas/{self.scale.pk}/necessidades/'
        self.assertEqual(client.post(url, {'plan_need': link.pk}, format='json').status_code, 400)
        from django.utils import timezone
        self.link.removed_at = timezone.now()
        self.link.removal_reason = "Retirada clínica"
        self.link.save()
        self.assertEqual(client.post(url, {'plan_need': self.link.pk}, format='json').status_code, 400)
        self.assertFalse(self.scale.items.exists())
