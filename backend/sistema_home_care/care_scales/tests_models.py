from django.test import TestCase
from .models import CareScale


class CareScaleModelTests(TestCase):
    def test_entity_timestamps_and_table(self):
        scale = CareScale.objects.create()
        self.assertEqual(scale._meta.db_table, 'care_scales')
        self.assertIsNotNone(scale.created_at)
        self.assertIsNotNone(scale.updated_at)
        self.assertIn(str(scale.pk), str(scale))
