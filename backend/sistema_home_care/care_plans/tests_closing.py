from datetime import date
from django.test import TestCase
from django.core.exceptions import PermissionDenied, ValidationError
from assessments.models import CareNeed, PatientAssessment
from assessments.tests_api import make_api_users, make_patient, MEDICO_CPF, ENFERMEIRO_CPF, GERENTE_CPF
from patients.models import NeedType
from .models import CarePlan, CarePlanNeed
from .services import close_plan


class PlanClosingTests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.patient = make_patient()
        assessment = PatientAssessment.objects.create(patient=self.patient)
        self.need = CareNeed.objects.create(assessment=assessment, need_type=NeedType.objects.first(),
            description='Preservar', priority='HIGH')

    def test_doctor_and_nurse_close_preserving_dates_needs_and_links(self):
        for cpf in (MEDICO_CPF, ENFERMEIRO_CPF):
            plan = CarePlan.objects.create(patient=self.patient, start_date=date.today(),
                end_date=date(2027, 1, 1), status='ACTIVE')
            link = CarePlanNeed.objects.create(care_plan=plan, care_need=self.need)
            before = (self.need.description, self.need.priority, self.need.status, self.need.is_active, self.need.updated_at)
            closed = close_plan(actor=self.users[cpf], plan=plan)
            self.need.refresh_from_db()
            link.refresh_from_db()
            self.assertEqual(closed.status, 'CLOSED')
            self.assertEqual(closed.end_date, date(2027, 1, 1))
            self.assertEqual((self.need.description, self.need.priority, self.need.status, self.need.is_active, self.need.updated_at), before)
            self.assertIsNone(link.removed_at)
            self.assertEqual(closed.history.count(), 1)

    def test_manager_cannot_close_and_closed_cannot_close_again(self):
        plan = CarePlan.objects.create(patient=self.patient, start_date=date.today(), status='ACTIVE')
        with self.assertRaises(PermissionDenied):
            close_plan(actor=self.users[GERENTE_CPF], plan=plan)
        closed = close_plan(actor=self.users[MEDICO_CPF], plan=plan)
        self.assertIsNone(closed.end_date)
        with self.assertRaises(ValidationError):
            close_plan(actor=self.users[MEDICO_CPF], plan=closed)
