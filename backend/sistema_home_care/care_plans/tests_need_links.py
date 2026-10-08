from datetime import date
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from assessments.models import CareNeed, PatientAssessment
from assessments.tests_api import make_api_users, make_patient, MEDICO_CPF
from patients.models import NeedType
from .models import CarePlan, CarePlanNeed
from .services import attach_need


class NeedLinkServiceTests(TestCase):
    def setUp(self):
        self.actor = make_api_users()[MEDICO_CPF]
        patient = make_patient()
        self.plan = CarePlan.objects.create(patient=patient, start_date=date.today(), status='ACTIVE')
        self.other = CarePlan.objects.create(patient=patient, start_date=date.today())
        assessment = PatientAssessment.objects.create(patient=patient)
        self.need = CareNeed.objects.create(assessment=assessment, need_type=NeedType.objects.first(),
                                           description='Curativo', priority='HIGH')

    def test_current_link_unique_and_draft_allowed_then_reuse_after_close(self):
        first = attach_need(actor=self.actor, plan=self.plan, need=self.need)
        with self.assertRaises(ValidationError):
            attach_need(actor=self.actor, plan=self.plan, need=self.need)
        attach_need(actor=self.actor, plan=self.other, need=self.need)
        self.other.status = 'ACTIVE'
        with self.assertRaises(ValidationError):
            self.other.save()
        self.plan.status = 'CLOSED'
        self.plan.save()
        self.other.save()
        first.refresh_from_db()
        self.assertIsNone(first.removed_at)
        self.assertEqual(self.plan.history.count(), 1)

    def test_removed_link_kept_and_replaced_with_new_record(self):
        first = attach_need(actor=self.actor, plan=self.plan, need=self.need)
        first.removed_at = timezone.now()
        first.removal_reason = 'Revisão'
        first.save()
        replacement = attach_need(actor=self.actor, plan=self.plan, need=self.need)
        self.assertNotEqual(first.pk, replacement.pk)
        self.assertEqual(CarePlanNeed.objects.count(), 2)

    def test_refreshed_need_prevents_stale_inactive_attachment(self):
        CareNeed.objects.filter(pk=self.need.pk).update(is_active=False)
        with self.assertRaises(ValidationError):
            attach_need(actor=self.actor, plan=self.plan, need=self.need)
        self.assertFalse(self.plan.need_links.exists())
