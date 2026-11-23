from django.test import TestCase
from .models import CareScale
from . import test_support


class CareScaleModelTests(TestCase):
    def test_entity_timestamps_and_table(self):
        scale = CareScale.objects.create()
        self.assertEqual(scale._meta.db_table, 'care_scales')
        self.assertIsNotNone(scale.created_at)
        self.assertIsNotNone(scale.updated_at)
        self.assertIn(str(scale.pk), str(scale))


class ScaleRelationsTests(test_support.ScaleFixture):
    def test_status_and_frequency_constraints(self):
        from django.db import IntegrityError, transaction
        from .models import ScaleNeed, ScaleStatus
        self.assertEqual(self.scale.status, 'DRAFT')
        for status in ScaleStatus.values:
            self.scale.status = status
            self.scale.full_clean()
        with self.assertRaises(IntegrityError), transaction.atomic():
            CareScale.objects.filter(pk=self.scale.pk).update(status='INVALID')
        item = ScaleNeed.objects.create(scale=self.scale, plan_need=self.link, frequency_quantity=2, frequency_period='WEEK')
        for field, value in (('frequency_quantity', 0), ('frequency_quantity', -1), ('frequency_period', 'YEAR')):
            with self.assertRaises(IntegrityError), transaction.atomic():
                ScaleNeed.objects.filter(pk=item.pk).update(**{field: value})

    def test_links_use_plan_item_and_specific_professionals(self):
        from django.db.models import ProtectedError
        from .models import ScaleNeed, ScaleAssignment
        item = ScaleNeed.objects.create(scale=self.scale, plan_need=self.link, required_profession=self.profession)
        assignment = ScaleAssignment.objects.create(item=item, professional=self.professional)
        self.assertEqual(assignment.item.plan_need.care_need, self.need)
        self.assertEqual(self.scale.care_plan.patient, self.patient)
        for obj in (self.plan, self.link, self.professional, item):
            with self.assertRaises(ProtectedError):
                obj.delete()
