from datetime import date
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.test import TestCase
from assessments.tests_api import make_api_users, make_patient, MEDICO_CPF
from .models import CarePlan, CarePlanHistory, CarePlanStatus


class CarePlanModelTests(TestCase):
    def setUp(self):
        self.patient = make_patient()
        self.user = make_api_users()[MEDICO_CPF]

    def make_plan(self, **overrides):
        data = dict(patient=self.patient, start_date=date(2026, 10, 8),
                    created_by=self.user, updated_by=self.user)
        data.update(overrides)
        return CarePlan.objects.create(**data)

    def test_default_draft_optional_fields_and_authors(self):
        plan = self.make_plan()
        self.assertEqual(plan.status, CarePlanStatus.DRAFT)
        self.assertEqual(plan.objective, '')
        self.assertIsNone(plan.end_date)
        self.assertEqual(plan.created_by, self.user)
        self.assertEqual(plan.updated_by, self.user)
        self.assertIsNotNone(plan.created_at)
        self.assertIsNotNone(plan.updated_at)
        plan.full_clean()

    def test_patient_and_start_date_required(self):
        plan = CarePlan(start_date=date(2026, 10, 8))
        with self.assertRaises(ValidationError) as error:
            plan.full_clean()
        self.assertIn('patient', error.exception.message_dict)
        plan = CarePlan(patient=self.patient)
        with self.assertRaises(ValidationError) as error:
            plan.full_clean()
        self.assertIn('start_date', error.exception.message_dict)
        with self.assertRaises(IntegrityError), transaction.atomic():
            CarePlan.objects.create(patient=self.patient)

    def test_status_choices_and_database_constraint(self):
        for status in CarePlanStatus.values:
            plan = self.make_plan(status=status)
            plan.full_clean()
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.make_plan(status='SUSPENDED')

    def test_end_date_can_be_provided_in_advance_without_closing(self):
        plan = self.make_plan(end_date=date(2026, 12, 31), objective='Objetivo de teste')
        plan.full_clean()
        self.assertEqual(plan.status, CarePlanStatus.DRAFT)
        self.assertEqual(plan.objective, 'Objetivo de teste')

    def test_update_preserves_record_and_created_timestamp(self):
        plan = self.make_plan()
        created_at, updated_at, pk = plan.created_at, plan.updated_at, plan.pk
        plan.objective = 'Novo objetivo'
        plan.save()
        self.assertEqual(plan.pk, pk)
        self.assertEqual(plan.created_at, created_at)
        self.assertGreater(plan.updated_at, updated_at)

    def test_patient_with_plan_is_protected(self):
        self.make_plan()
        with self.assertRaises(ProtectedError):
            self.patient.delete()

    def test_history_snapshots_and_user_deletion_preserve_data(self):
        plan = self.make_plan()
        event = CarePlanHistory.objects.create(care_plan=plan, changed_by=self.user,
            description='Alteração de objetivo', previous_data={'objective': ''},
            new_data={'objective': 'Objetivo'})
        event.full_clean()
        self.user.delete()
        plan.refresh_from_db()
        event.refresh_from_db()
        self.assertIsNone(plan.created_by)
        self.assertIsNone(plan.updated_by)
        self.assertIsNone(event.changed_by)
        self.assertEqual(event.previous_data, {'objective': ''})
        self.assertEqual(event.new_data, {'objective': 'Objetivo'})
        self.assertEqual(plan.history.get().pk, event.pk)
        with self.assertRaises(ProtectedError):
            plan.delete()
