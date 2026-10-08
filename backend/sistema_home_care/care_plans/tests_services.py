from datetime import date
from unittest.mock import patch
from django.core.exceptions import PermissionDenied, ValidationError
from django.test import TestCase
from patients.models import NeedType
from assessments.models import CareNeed, PatientAssessment
from assessments.tests_api import make_api_users, make_patient, MEDICO_CPF, GERENTE_CPF, ENFERMEIRO_CPF, SEM_GRUPO_CPF
from .models import CarePlan
from .services import create_plan


class PlanServiceTests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.actor = self.users[MEDICO_CPF]
        self.patient = make_patient()
        self.assessment = PatientAssessment.objects.create(patient=self.patient)
        self.need = CareNeed.objects.create(assessment=self.assessment,
            need_type=NeedType.objects.first(), description='Curativo', priority='HIGH')

    def create(self, **kwargs):
        data = dict(actor=self.actor, patient=self.patient, start_date=date.today(), needs=[self.need])
        data.update(kwargs)
        return create_plan(**data)

    def test_create_draft_with_need_optional_fields_and_history(self):
        plan = self.create()
        self.assertEqual(plan.status, 'DRAFT')
        self.assertEqual(plan.need_links.get().care_need, self.need)
        self.assertEqual(plan.created_by, self.actor)
        self.assertIsNone(plan.end_date)
        self.assertEqual(plan.objective, '')
        event = plan.history.get()
        self.assertEqual(event.changed_by, self.actor)
        self.assertEqual(event.new_data['needs'][0]['care_need_id'], self.need.pk)

    def test_required_fields_and_profiles(self):
        with self.assertRaises(ValidationError) as exc:
            create_plan(actor=self.actor)
        self.assertEqual(set(exc.exception.message_dict), {'patient', 'start_date', 'needs'})
        for cpf in (GERENTE_CPF, ENFERMEIRO_CPF, SEM_GRUPO_CPF):
            with self.assertRaises(PermissionDenied):
                self.create(actor=self.users[cpf])
        self.assertFalse(CarePlan.objects.exists())

    def test_rejects_duplicate_inactive_and_wrong_patient_needs(self):
        with self.assertRaises(ValidationError):
            self.create(needs=[self.need, self.need])
        self.need.is_active = False
        self.need.save()
        with self.assertRaises(ValidationError):
            self.create()
        self.need.is_active = True
        self.need.save()
        with self.assertRaises(ValidationError):
            self.create(patient=make_patient(cpf='12345678909'))
        self.assertFalse(CarePlan.objects.exists())

    def test_creation_rolls_back_when_history_fails(self):
        with patch('care_plans.services.record', side_effect=RuntimeError('failure')):
            with self.assertRaises(RuntimeError):
                self.create()
        self.assertFalse(CarePlan.objects.exists())
