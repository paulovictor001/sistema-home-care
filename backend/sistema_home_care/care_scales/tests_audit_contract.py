from rest_framework.exceptions import ValidationError, PermissionDenied
from assessments.tests_api import SEM_GRUPO_CPF
from . import services
from .test_support import ScaleFixture


class AuditContractTests(ScaleFixture):
    def test_simple_removals_logged_generally_without_substitution_and_failure_does_not_log(self):
        item = services.add_need(actor=self.manager, scale=self.scale, plan_need=self.link)
        assignment = services.add_professional(actor=self.manager, scale=self.scale, item_id=item.pk, professional=self.professional)
        services.remove_professional(actor=self.manager, scale=self.scale, item_id=item.pk, assignment_id=assignment.pk)
        event = self.scale.audit_events.get(action='REMOVE_PROFESSIONAL')
        self.assertIsNone(event.previous_data['items'][0]['assignments'][0]['removed_at'])
        self.assertIsNotNone(event.new_data['items'][0]['assignments'][0]['removed_at'])
        self.assertFalse(self.scale.substitutions.exists())
        count = self.scale.audit_events.count()
        with self.assertRaises(ValidationError):
            services.change_status(actor=self.manager, scale=self.scale, status='ACTIVE')
        with self.assertRaises(PermissionDenied):
            services.update_scale(actor=self.users[SEM_GRUPO_CPF], scale=self.scale, data={'observation': 'Negada'})
        self.assertEqual(self.scale.audit_events.count(), count)
        services.remove_need(actor=self.manager, scale=self.scale, item_id=item.pk)
        removed = self.scale.audit_events.get(action='REMOVE_NEED')
        self.assertEqual(removed.actor_id, self.manager.pk)
        self.assertIsNotNone(removed.created_at)
        self.assertIsNotNone(removed.new_data['items'][0]['removed_at'])
        services.delete_scale(actor=self.manager, scale=self.scale)
        self.assertEqual(set(self.scale.audit_events.values_list('action', flat=True)), {'ADD_NEED', 'ADD_PROFESSIONAL', 'REMOVE_PROFESSIONAL', 'REMOVE_NEED', 'DELETE'})
