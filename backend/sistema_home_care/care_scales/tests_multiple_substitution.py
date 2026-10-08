from rest_framework.exceptions import ValidationError
from professionals.models import Professional
from . import services
from .test_support import ScaleFixture


class MultipleSubstitutionTests(ScaleFixture):
    def test_substitution_keeps_other_assignments_and_rejects_existing_replacement(self):
        third = Professional.objects.create(full_name='Pedro', profession=self.profession)
        item = services.add_need(actor=self.manager, scale=self.scale, plan_need=self.link)
        assignments = services.add_professionals(actor=self.manager, scale=self.scale, item_id=item.pk,
            professionals=[self.professional, self.other_professional])
        with self.assertRaises(ValidationError):
            services.substitute_professional(actor=self.manager, scale=self.scale, item_id=item.pk,
                assignment_id=assignments[0].pk, professional=self.other_professional)
        self.assertEqual(item.assignments.filter(removed_at__isnull=True).count(), 2)
        self.assertFalse(self.scale.substitutions.exists())
        services.substitute_professional(actor=self.manager, scale=self.scale, item_id=item.pk,
            assignment_id=assignments[0].pk, professional=third)
        self.assertEqual(set(item.assignments.filter(removed_at__isnull=True).values_list('professional_id', flat=True)), {self.other_professional.pk, third.pk})
        self.assertEqual(item.assignments.count(), 3)
        services.remove_professional(actor=self.manager, scale=self.scale, item_id=item.pk, assignment_id=assignments[1].pk)
        self.assertEqual(self.scale.substitutions.count(), 1)
