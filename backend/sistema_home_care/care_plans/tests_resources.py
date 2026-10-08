from datetime import date
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.utils import timezone
from assessments.models import CareNeed, PatientAssessment, Resource
from assessments.tests_api import make_patient
from patients.models import NeedType
from .models import CarePlan, CarePlanNeed, CarePlanNeedResource


class PlanResourceTests(TestCase):
    def setUp(self):
        patient = make_patient()
        self.plan = CarePlan.objects.create(patient=patient, start_date=date.today())
        assessment = PatientAssessment.objects.create(patient=patient)
        need = CareNeed.objects.create(assessment=assessment, need_type=NeedType.objects.first(),
                                      description='Curativo', priority='HIGH')
        self.link = CarePlanNeed.objects.create(care_plan=self.plan, care_need=need)
        self.resource = Resource.objects.create(name='Gaze')

    def test_zero_or_many_resources_preserved_after_link_removal(self):
        self.assertEqual(self.link.resources.count(), 0)
        first = CarePlanNeedResource.objects.create(plan_need=self.link, resource=self.resource,
                                                    quantity=2, observation='  Uso diário  ')
        second_resource = Resource.objects.create(name='Oxímetro')
        CarePlanNeedResource.objects.create(plan_need=self.link, resource=second_resource, quantity=1)
        self.link.removed_at = timezone.now()
        self.link.removal_reason = 'Revisão'
        self.link.save()
        first.refresh_from_db()
        self.assertEqual(first.observation, 'Uso diário')
        self.assertEqual(self.link.resources.count(), 2)
        for obj in (self.resource, self.link):
            with self.assertRaises(ProtectedError):
                obj.delete()

    def test_quantity_and_existing_resource_validation(self):
        for quantity in (0, -1):
            with self.assertRaises(ValidationError):
                CarePlanNeedResource.objects.create(plan_need=self.link, resource=self.resource, quantity=quantity)
            with self.assertRaises(IntegrityError), transaction.atomic():
                CarePlanNeedResource.objects.bulk_create([CarePlanNeedResource(
                    plan_need=self.link, resource=self.resource, quantity=quantity)])
        with self.assertRaises(ValidationError):
            CarePlanNeedResource.objects.create(plan_need=self.link, resource_id=999999, quantity=1)
