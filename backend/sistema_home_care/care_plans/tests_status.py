from datetime import date
from unittest.mock import patch
from django.test import TestCase
from django.core.exceptions import ValidationError, PermissionDenied
from accounts.models import Profession
from professionals.models import Professional
from assessments.models import CareNeed, PatientAssessment
from assessments.tests_api import make_api_users, make_patient, MEDICO_CPF, ENFERMEIRO_CPF, GERENTE_CPF
from patients.models import NeedType
from .models import CarePlan
from .services import create_plan, change_status


class PlanStatusTests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.doctor = self.users[MEDICO_CPF]
        self.nurse = self.users[ENFERMEIRO_CPF]
        self.patient = make_patient()
        assessment = PatientAssessment.objects.create(patient=self.patient)
        self.need = CareNeed.objects.create(assessment=assessment, need_type=NeedType.objects.first(),
                                           description='Curativo', priority='HIGH')
        self.plan = create_plan(actor=self.doctor, patient=self.patient, start_date=date.today(), needs=[self.need])
        professional = Professional.objects.create(full_name='João', profession=Profession.objects.get(name='Enfermeiro'))
        link = self.plan.need_links.get()
        link.required_professional = professional
        link.frequency_quantity = 1
        link.frequency_period = 'DAY'
        link.save()

    def test_cycle_same_record_and_history_authorized_roles(self):
        original_pk = self.plan.pk
        created_at = self.plan.created_at
        plan = change_status(actor=self.doctor, plan=self.plan, target='ACTIVE')
        plan = change_status(actor=self.nurse, plan=plan, target='CLOSED')
        plan = change_status(actor=self.nurse, plan=plan, target='ACTIVE')
        self.assertEqual(plan.pk, original_pk)
        self.assertEqual(plan.created_at, created_at)
        self.assertEqual(plan.history.count(), 4)
        event = plan.history.first()
        self.assertEqual(event.previous_data['status'], 'CLOSED')
        self.assertEqual(event.new_data['status'], 'ACTIVE')
        self.assertEqual(event.changed_by, self.nurse)

    def test_manager_and_nurse_cannot_activate_draft(self):
        for actor in (self.nurse, self.users[GERENTE_CPF]):
            with self.assertRaises(PermissionDenied):
                change_status(actor=actor, plan=self.plan, target='ACTIVE')
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.status, 'DRAFT')
        self.assertEqual(self.plan.history.count(), 1)

    def test_invalid_transitions_and_unconfigured_activation(self):
        for target in ('CLOSED', 'DRAFT', 'INVALID'):
            with self.assertRaises(ValidationError):
                change_status(actor=self.doctor, plan=self.plan, target=target)
        self.plan.need_links.update(frequency_quantity=None)
        with self.assertRaises(ValidationError):
            change_status(actor=self.doctor, plan=self.plan, target='ACTIVE')

    def test_conflict_and_history_failure_leave_status_unchanged(self):
        other = CarePlan.objects.create(patient=self.patient, start_date=date.today(), status='ACTIVE')
        with self.assertRaises(ValidationError):
            change_status(actor=self.doctor, plan=self.plan, target='ACTIVE')
        other.status = 'CLOSED'
        other.save()
        with patch('care_plans.services.record', side_effect=RuntimeError('failure')):
            with self.assertRaises(RuntimeError):
                change_status(actor=self.doctor, plan=self.plan, target='ACTIVE')
        self.plan.refresh_from_db()
        self.assertEqual(self.plan.status, 'DRAFT')
