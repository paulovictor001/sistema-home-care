from datetime import date
from unittest.mock import patch
from django.test import TestCase
from django.core.exceptions import ValidationError, PermissionDenied
from assessments.models import CareNeed, PatientAssessment
from assessments.tests_api import make_api_users, make_patient, MEDICO_CPF, ENFERMEIRO_CPF
from assessments.models import NeedType
from .services import create_plan, remove_need
from .models import CarePlanNeed


class PlanRemovalTests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.actor = self.users[MEDICO_CPF]
        patient = make_patient()
        assessment = PatientAssessment.objects.create(patient=patient)
        self.need = CareNeed.objects.create(assessment=assessment, need_type=NeedType.objects.first(),
                                           description='Original', priority='HIGH')
        self.plan = create_plan(actor=self.actor, patient=patient, start_date=date.today(), needs=[self.need])
        self.link = self.plan.need_links.get()

    def test_remove_with_reason_preserves_need_link_and_historical_snapshot(self):
        other = CareNeed.objects.create(assessment=self.need.assessment, need_type=self.need.need_type,
            description='Outra necessidade', priority='MEDIUM')
        CarePlanNeed.objects.create(care_plan=self.plan, care_need=other)
        removed = remove_need(actor=self.actor, link=self.link, reason='  Revisão clínica  ')
        self.need.refresh_from_db()
        self.assertTrue(self.need.is_active)
        self.assertEqual(self.need.status, 'IDENTIFIED')
        self.assertEqual(self.need.description, 'Original')
        self.assertIsNone(self.need.inactivated_at)
        self.assertEqual(removed.removal_reason, 'Revisão clínica')
        self.assertEqual(removed.removed_by, self.actor)
        event = self.plan.history.first()
        self.assertIsNone(event.previous_data['needs'][0]['removed_at'])
        self.assertEqual(event.new_data['needs'][0]['removal_reason'], 'Revisão clínica')
        self.assertEqual(self.plan.need_links.count(), 2)
        with self.assertRaises(ValidationError):
            remove_need(actor=self.actor, link=self.link, reason='Outro motivo')
        self.assertEqual(self.plan.history.count(), 2)

    def test_blank_reason_and_history_failure_do_not_remove(self):
        for reason in ('', '  ', None):
            with self.assertRaises(ValidationError):
                remove_need(actor=self.actor, link=self.link, reason=reason)
        other = CareNeed.objects.create(assessment=self.need.assessment, need_type=self.need.need_type,
            description='Outra necessidade', priority='MEDIUM')
        CarePlanNeed.objects.create(care_plan=self.plan, care_need=other)
        with patch('care_plans.services.record', side_effect=RuntimeError('failure')):
            with self.assertRaises(RuntimeError):
                remove_need(actor=self.actor, link=self.link, reason='Revisão')
        self.link.refresh_from_db()
        self.assertIsNone(self.link.removed_at)
        self.assertEqual(self.plan.history.count(), 1)

    def test_cannot_remove_last_current_need(self):
        with self.assertRaisesMessage(ValidationError, 'O plano deve manter ao menos uma necessidade vigente.'):
            remove_need(actor=self.actor, link=self.link, reason='Revisão')
        self.link.refresh_from_db()
        self.assertIsNone(self.link.removed_at)
        self.assertEqual(self.plan.history.count(), 1)

    def test_nurse_can_remove_when_another_current_need_remains(self):
        second = CareNeed.objects.create(assessment=self.need.assessment, need_type=self.need.need_type,
            description='Acompanhamento', priority='MEDIUM')
        from .services import attach_need
        attach_need(actor=self.actor, plan=self.plan, need=second)
        removed = remove_need(actor=self.users[ENFERMEIRO_CPF], link=self.link, reason='Revisão')
        self.assertIsNotNone(removed.removed_at)
        self.assertEqual(self.plan.need_links.filter(removed_at__isnull=True).count(), 1)
