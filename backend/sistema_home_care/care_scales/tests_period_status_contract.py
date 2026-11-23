from datetime import date
from assessments.tests_api import auth_client
from . import services
from .models import ScaleStatus
from .test_support import ScaleFixture


class PeriodStatusContractTests(ScaleFixture):
    def test_every_status_pair_allowed_when_activation_requirements_met(self):
        item = services.add_need(actor=self.manager, scale=self.scale, plan_need=self.link)
        services.add_professional(actor=self.manager, scale=self.scale, item_id=item.pk, professional=self.professional)
        client = auth_client(self.manager)
        url = f'/api/escalas/{self.scale.pk}/status/'
        for source in ScaleStatus.values:
            self.assertEqual(client.post(url, {'status': source}, format='json').status_code, 200)
            for target in ScaleStatus.values:
                response = client.post(url, {'status': target}, format='json')
                self.assertEqual(response.status_code, 200, response.data)
                self.assertEqual(response.data['status'], target)
                self.assertEqual(client.post(url, {'status': source}, format='json').status_code, 200)
        self.plan.end_date = date(2026, 10, 31)
        self.plan.save()
        self.scale.refresh_from_db()
        self.assertEqual(self.scale.end_date, date(2026, 11, 30))
        self.assertEqual(client.post(url, {'status': 'ACTIVE'}, format='json').status_code, 400)
        self.assertEqual(client.patch(f'/api/escalas/{self.scale.pk}/', {'end_date': '2026-10-31'}, format='json').status_code, 200)
        self.assertEqual(client.post(url, {'status': 'ACTIVE'}, format='json').status_code, 200)
