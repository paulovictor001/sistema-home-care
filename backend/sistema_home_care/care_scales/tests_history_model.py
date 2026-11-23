from . import test_support
from .models import ScaleAuditEvent, ScaleSubstitution


class ScaleHistoryStructureTests(test_support.ScaleFixture):
    def test_author_deletion_preserves_audit_and_substitution_names(self):
        event = ScaleAuditEvent.objects.create(scale=self.scale, actor=self.manager, actor_name='Gerente', action='CREATE', new_data={'id': self.scale.pk})
        substitution = ScaleSubstitution.objects.create(scale=self.scale,
            previous_professional=self.professional, new_professional=self.other_professional,
            previous_name='João', new_name='Maria', actor=self.manager, actor_name='Gerente')
        self.manager.delete()
        event.refresh_from_db()
        substitution.refresh_from_db()
        self.assertIsNone(event.actor_id)
        self.assertIsNone(substitution.actor_id)
        self.assertEqual(event.actor_name, 'Gerente')
        self.assertEqual(substitution.previous_name, 'João')
        self.assertEqual(event.new_data, {'id': self.scale.pk})
