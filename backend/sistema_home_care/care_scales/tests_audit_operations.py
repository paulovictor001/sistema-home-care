from unittest.mock import patch
from assessments.tests_api import auth_client
from . import services
from .models import ScaleAuditEvent
from .test_support import ScaleFixture


class AuditOperationsTests(ScaleFixture):
    def test_mutations_capture_actor_old_and_new_and_idempotent_status(self):
        scale = services.create_scale(actor=self.manager, patient=self.patient, care_plan=self.plan,
            start_date=self.scale.start_date, end_date=self.scale.end_date)
        item = services.add_need(actor=self.manager, scale=scale, plan_need=self.link)
        assignment = services.add_professional(actor=self.manager, scale=scale, item_id=item.pk, professional=self.professional)
        services.substitute_professional(actor=self.manager, scale=scale, item_id=item.pk, assignment_id=assignment.pk, professional=self.other_professional)
        services.configure_need(actor=self.manager, scale=scale, item_id=item.pk, data={'frequency_quantity': 4, 'frequency_reason': 'Maior demanda'})
        services.change_status(actor=self.manager, scale=scale, status='ACTIVE')
        count = scale.audit_events.count()
        services.change_status(actor=self.manager, scale=scale, status='ACTIVE')
        self.assertEqual(scale.audit_events.count(), count)
        event = scale.audit_events.get(action='CONFIGURE_NEED')
        self.assertEqual(event.previous_data['items'][0]['frequency_quantity'], 2)
        self.assertEqual(event.new_data['items'][0]['frequency_quantity'], 4)
        self.assertEqual(event.actor_id, self.manager.pk)
        self.assertTrue(event.actor_name)
        self.assertEqual(auth_client(self.manager).get(f'/api/escalas/{scale.pk}/historico/').status_code, 200)
        self.assertEqual(scale.substitutions.count(), 1)
        services.delete_scale(actor=self.manager, scale=scale)
        self.assertTrue(scale.audit_events.filter(action='DELETE').exists())

    def test_failed_audit_rolls_back_change_and_validation_does_not_log(self):
        with patch.object(ScaleAuditEvent.objects, 'create', side_effect=RuntimeError('Falha simulada')):
            with self.assertRaises(RuntimeError):
                services.update_scale(actor=self.manager, scale=self.scale, data={'observation': 'Rollback'})
        self.scale.refresh_from_db()
        self.assertEqual(self.scale.observation, '')
        self.assertFalse(self.scale.audit_events.exists())
