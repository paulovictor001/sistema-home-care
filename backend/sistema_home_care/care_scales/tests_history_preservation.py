from . import services
from .test_support import ScaleFixture


class HistoryPreservationTests(ScaleFixture):
    def test_substitution_names_and_actor_survive_rename_and_user_deletion(self):
        self.manager.first_name = 'Rubens'
        self.manager.save()
        item = services.add_need(actor=self.manager, scale=self.scale, plan_need=self.link)
        assignment = services.add_professional(actor=self.manager, scale=self.scale, item_id=item.pk, professional=self.professional)
        services.substitute_professional(actor=self.manager, scale=self.scale, item_id=item.pk,
            assignment_id=assignment.pk, professional=self.other_professional)
        history = self.scale.substitutions.get()
        self.professional.full_name = 'João atualizado'
        self.professional.save()
        self.other_professional.full_name = 'Maria atualizada'
        self.other_professional.save()
        self.manager.delete()
        history.refresh_from_db()
        self.assertEqual(history.previous_name, 'João')
        self.assertEqual(history.new_name, 'Maria')
        self.assertEqual(history.actor_name, 'Rubens')
        self.assertIsNone(history.actor_id)
        event = self.scale.audit_events.get(action='SUBSTITUTE')
        self.assertEqual(event.actor_name, 'Rubens')
        self.assertIsNone(event.actor_id)
        self.assertEqual(event.previous_data['items'][0]['assignments'][0]['professional_name'], 'João')
