from assessments.models import CareNeed
from care_plans.models import CarePlanNeed
from assessments.tests_api import auth_client
from . import services
from .test_support import ScaleFixture


class ActivationContractTests(ScaleFixture):
    def test_each_current_need_requires_professional_and_removed_item_is_ignored(self):
        item = services.add_need(actor=self.manager, scale=self.scale, plan_need=self.link)
        services.add_professional(actor=self.manager, scale=self.scale, item_id=item.pk, professional=self.professional)
        second_need = CareNeed.objects.create(assessment=self.need.assessment, need_type=self.need.need_type, description='Outra necessidade', priority='LOW')
        second_link = CarePlanNeed.objects.create(care_plan=self.plan, care_need=second_need,
            required_professional=self.professional, frequency_quantity=1, frequency_period='DAY')
        second_item = services.add_need(actor=self.manager, scale=self.scale, plan_need=second_link)
        client = auth_client(self.manager)
        url = f'/api/escalas/{self.scale.pk}/status/'
        count = self.scale.audit_events.count()
        self.assertEqual(client.post(url, {'status': 'ACTIVE'}, format='json').status_code, 400)
        self.assertEqual(self.scale.audit_events.count(), count)
        services.remove_need(actor=self.manager, scale=self.scale, item_id=second_item.pk)
        self.assertEqual(client.post(url, {'status': 'ACTIVE'}, format='json').status_code, 200)
        services.remove_need(actor=self.manager, scale=self.scale, item_id=item.pk)
        self.assertEqual(client.post(url, {'status': 'SUSPENDED'}, format='json').status_code, 200)
        self.assertEqual(client.post(url, {'status': 'ACTIVE'}, format='json').status_code, 400)
        self.scale.refresh_from_db()
        self.assertEqual(self.scale.status, 'SUSPENDED')
