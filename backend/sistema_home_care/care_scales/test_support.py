from datetime import date
from django.test import TestCase
from accounts.models import Profession
from professionals.models import Professional
from patients.models import NeedType
from assessments.models import PatientAssessment, CareNeed
from assessments.tests_api import make_api_users, make_patient, GERENTE_CPF
from care_plans.models import CarePlan, CarePlanNeed
from .models import CareScale


class ScaleFixture(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.manager = self.users[GERENTE_CPF]
        self.patient = make_patient()
        self.plan = CarePlan.objects.create(patient=self.patient, start_date=date(2026, 10, 1), end_date=date(2026, 12, 31))
        assessment = PatientAssessment.objects.create(patient=self.patient)
        self.need = CareNeed.objects.create(assessment=assessment, need_type=NeedType.objects.get(name='Enfermagem'), description='Curativo', priority='HIGH')
        self.profession = Profession.objects.get(name='Enfermeiro')
        self.professional = Professional.objects.create(full_name='João', profession=self.profession)
        self.other_professional = Professional.objects.create(full_name='Maria', profession=self.profession)
        self.link = CarePlanNeed.objects.create(care_plan=self.plan, care_need=self.need,
            required_professional=self.professional, frequency_quantity=2, frequency_period='WEEK')
        self.scale = CareScale.objects.create(patient=self.patient, care_plan=self.plan)
