from rest_framework.exceptions import ValidationError
from assessments.tests_api import auth_client
from . import services
from .contracts import scheduling_requirement
from .test_support import ScaleFixture


class ClosedScaleTests(ScaleFixture):
    def test_closed_history_consultable_and_reopening_reuses_same_record(self):
        item = services.add_need(actor=self.manager, scale=self.scale, plan_need=self.link)
        services.add_professional(actor=self.manager, scale=self.scale, item_id=item.pk, professional=self.professional)
        services.change_status(actor=self.manager, scale=self.scale, status='ACTIVE')
        before = scheduling_requirement(self.scale)
        created = self.scale.created_at
        services.change_status(actor=self.manager, scale=self.scale, status='CLOSED')
        client = auth_client(self.manager)
        response = client.get(f'/api/escalas/{self.scale.pk}/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['status'], 'CLOSED')
        self.assertEqual(client.get(f'/api/escalas/{self.scale.pk}/historico/').status_code, 200)
        with self.assertRaises(ValidationError):
            scheduling_requirement(self.scale)
        # RN-ESC-12 permite alterações em qualquer status; não gera agendamento.
        services.add_professional(actor=self.manager, scale=self.scale, item_id=item.pk, professional=self.other_professional)
        with self.assertRaises(ValidationError):
            scheduling_requirement(self.scale)
        services.change_status(actor=self.manager, scale=self.scale, status='ACTIVE')
        self.scale.refresh_from_db()
        self.assertEqual(self.scale.created_at, created)
        after = scheduling_requirement(self.scale)
        self.assertEqual(after['scale_id'], before['scale_id'])
        self.assertEqual(len(after['items'][0]['professional_ids']), 2)
