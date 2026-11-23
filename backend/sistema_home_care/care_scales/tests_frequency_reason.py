from assessments.tests_api import auth_client
from .models import ScaleNeed
from .test_support import ScaleFixture


class FrequencyReasonTests(ScaleFixture):
    def test_reason_optional_preserved_when_omitted_and_can_be_cleared(self):
        item = ScaleNeed.objects.create(scale=self.scale, plan_need=self.link, frequency_quantity=2, frequency_period='WEEK')
        client = auth_client(self.manager)
        url = f'/api/escalas/{self.scale.pk}/necessidades/{item.pk}/configurar/'
        for data, expected in (({'frequency_quantity': 3}, ''),
                               ({'frequency_quantity': 1, 'frequency_reason': 'Disponibilidade familiar'}, 'Disponibilidade familiar'),
                               ({'frequency_quantity': 4}, 'Disponibilidade familiar'),
                               ({'frequency_reason': ''}, '')):
            self.assertEqual(client.post(url, data, format='json').status_code, 200)
            item.refresh_from_db()
            self.assertEqual(item.frequency_reason, expected)
