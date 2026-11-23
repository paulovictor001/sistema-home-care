from assessments.tests_api import auth_client
from . import services
from .test_support import ScaleFixture


class FrequencyContractTests(ScaleFixture):
    def test_positive_adjustments_each_unit_optional_reason_and_failed_edit_audit(self):
        item = services.add_need(actor=self.manager, scale=self.scale, plan_need=self.link)
        client = auth_client(self.manager)
        url = f'/api/escalas/{self.scale.pk}/necessidades/{item.pk}/configurar/'
        for quantity, period in ((8, 'DAY'), (1, 'WEEK'), (12, 'MONTH')):
            self.assertEqual(client.post(url, {'frequency_quantity': quantity, 'frequency_period': period, 'frequency_reason': ''}, format='json').status_code, 200)
        count = self.scale.audit_events.count()
        for value in (None, '', 'abc', 0, -2, 1.25):
            self.assertEqual(client.post(url, {'frequency_quantity': value, 'frequency_reason': 'Não salvar'}, format='json').status_code, 400)
        item.refresh_from_db()
        self.assertEqual((item.frequency_quantity, item.frequency_period, item.frequency_reason), (12, 'MONTH', ''))
        self.assertEqual((item.planned_quantity, item.planned_period), (2, 'WEEK'))
        self.assertEqual(self.scale.audit_events.count(), count)
        self.link.refresh_from_db()
        self.assertEqual((self.link.frequency_quantity, self.link.frequency_period), (2, 'WEEK'))
