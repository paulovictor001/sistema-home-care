from datetime import date
from unittest.mock import patch
from django.test import TestCase
from django.core.exceptions import ValidationError, PermissionDenied
from assessments.models import CareNeed, PatientAssessment
from assessments.tests_api import make_api_users, make_patient, MEDICO_CPF, ENFERMEIRO_CPF
from patients.models import NeedType
from .services import create_plan, remove_need


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
        self.assertEqual(self.plan.need_links.count(), 1)
        with self.assertRaises(ValidationError):
            remove_need(actor=self.actor, link=self.link, reason='Outro motivo')
        self.assertEqual(self.plan.history.count(), 2)

    def test_blank_reason_wrong_role_and_history_failure_do_not_remove(self):
        for reason in ('', '  ', None):
            with self.assertRaises(ValidationError):
                remove_need(actor=self.actor, link=self.link, reason=reason)
        with self.assertRaises(PermissionDenied):
            remove_need(actor=self.users[ENFERMEIRO_CPF], link=self.link, reason='Revisão')
        with patch('care_plans.services.record', side_effect=RuntimeError('failure')):
            with self.assertRaises(RuntimeError):
                remove_need(actor=self.actor, link=self.link, reason='Revisão')
        self.link.refresh_from_db()
        self.assertIsNone(self.link.removed_at)
        self.assertEqual(self.plan.history.count(), 1)
