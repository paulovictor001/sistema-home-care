from datetime import date
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from assessments.tests_api import make_patient
from .models import CarePlan


class PatientPlanExclusivityTests(TestCase):
    def setUp(self):
        self.patient = make_patient()

    def test_only_one_active_but_many_draft_and_closed_plans(self):
        first = CarePlan.objects.create(patient=self.patient, start_date=date.today(), status='ACTIVE')
        second = CarePlan.objects.create(patient=self.patient, start_date=date.today())
        CarePlan.objects.create(patient=self.patient, start_date=date.today(), status='CLOSED')
        second.status = 'ACTIVE'
        with self.assertRaises(ValidationError):
            second.save()
        with self.assertRaises(IntegrityError), transaction.atomic():
            CarePlan.objects.filter(pk=second.pk).update(status='ACTIVE')
        first.status = 'CLOSED'
        first.save()
        second.save()
        self.assertEqual(CarePlan.objects.filter(status='ACTIVE').get().pk, second.pk)

    def test_independent_patient_and_bulk_insert_cannot_bypass_constraint(self):
        CarePlan.objects.create(patient=self.patient, start_date=date.today(), status='ACTIVE')
        other = make_patient(cpf='12345678909')
        CarePlan.objects.create(patient=other, start_date=date.today(), status='ACTIVE')
        with self.assertRaises(IntegrityError), transaction.atomic():
            CarePlan.objects.bulk_create([CarePlan(patient=self.patient, start_date=date.today(), status='ACTIVE')])
