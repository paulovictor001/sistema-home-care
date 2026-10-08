from assessments.tests_api import auth_client
from .models import ScaleNeed
from .test_support import ScaleFixture


class FrequencyConfigurationTests(ScaleFixture):
    def test_frequency_can_increase_decrease_and_change_period_independently(self):
        item = ScaleNeed.objects.create(scale=self.scale, plan_need=self.link, frequency_quantity=2, frequency_period='WEEK', planned_quantity=2, planned_period='WEEK')
        client = auth_client(self.manager)
        url = f'/api/escalas/{self.scale.pk}/necessidades/{item.pk}/configurar/'
        for quantity, period in ((5, 'WEEK'), (1, 'MONTH'), (3, 'DAY')):
            response = client.post(url, {'frequency_quantity': quantity, 'frequency_period': period}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
            item.refresh_from_db()
            self.assertEqual(item.frequency_quantity, quantity)
            self.assertEqual(item.planned_quantity, 2)
            self.assertEqual(item.planned_period, 'WEEK')
        for payload in ({'frequency_quantity': 0}, {'frequency_quantity': -1}, {'frequency_quantity': 1.5}, {'frequency_period': 'YEAR'}, {'planned_quantity': 8}):
            self.assertEqual(client.post(url, payload, format='json').status_code, 400)
        self.link.refresh_from_db()
        self.assertEqual(self.link.frequency_quantity, 2)
