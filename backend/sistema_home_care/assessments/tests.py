"""Testes de modelagem da Avaliação Inicial.

Cobre TASK-AVL-MOD-001 (PatientAssessment, TA-40), 002 (CareNeed,
TA-42), 003 (AssessmentResource + Resource, TA-44), 004 (tipo
restrito, TA-43), 006 (prioridade, TA-45) e 007 (status inicial,
TA-46).
"""

from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.db.models import ProtectedError
from django.test import TestCase
from rest_framework.test import APIClient

from patients.models import NeedType, NeedTypeStatus, Patient

from .models import (
    AssessmentResource,
    AssessmentType,
    CareNeed,
    NeedPriority,
    NeedStatus,
    PatientAssessment,
    Resource,
)

User = get_user_model()

MEDICO_CPF = "11144477735"
PACIENTE_CPF = "52998224725"


def make_staff_user(cpf, group_name=None):
    """Usuario com categoria coerente ao grupo (seed da accounts 0004)."""
    from accounts.models import Category

    mapping = {"GERENTE": "Gerente", "MEDICO": "Médico", "ENFERMEIRO": "Enfermeiro"}
    category_name = mapping.get(group_name, "Apoio")
    user = User.objects.create_user(
        cpf=cpf,
        password="Senha123!",
        email=f"user-{cpf}@teste.local",
        category=Category.objects.get(name=category_name),
    )
    if group_name is not None:
        user.groups.add(Group.objects.get(name=group_name))
    return user


def make_patient(cpf=PACIENTE_CPF):
    return Patient.objects.create(
        full_name="Maria da Silva",
        birth_date=date(1960, 5, 20),
        cpf=cpf,
        rg="1234567",
        age=66,
        phone="91999998888",
        gender="Feminino",
    )


def make_assessment(patient=None, professional=None, **overrides):
    data = {
        "patient": patient or make_patient(),
        "professional": professional,
        "assessment_date": date(2026, 9, 30),
    }
    data.update(overrides)
    return PatientAssessment.objects.create(**data)


def make_need_type(name="Enfermagem"):
    return NeedType.objects.get(name=name)


def make_care_need(assessment=None, need_type=None, **overrides):
    data = {
        "assessment": assessment or make_assessment(),
        "need_type": need_type or make_need_type(),
        "description": "Acompanhamento de enfermagem diário",
        "priority": NeedPriority.HIGH,
    }
    data.update(overrides)
    return CareNeed.objects.create(**data)


class PatientAssessmentModelTests(TestCase):
    def test_defaults_initial_type(self):
        assessment = make_assessment()
        self.assertEqual(assessment.assessment_type, AssessmentType.INITIAL)
        self.assertIsNotNone(assessment.created_at)

    def test_multiple_assessments_preserved(self):
        patient = make_patient()
        first = make_assessment(patient=patient)
        second = make_assessment(patient=patient)
        self.assertEqual(patient.assessments.count(), 2)
        first.refresh_from_db()
        self.assertEqual(first.pk, patient.assessments.order_by("pk").first().pk)
        self.assertNotEqual(first.pk, second.pk)

    def test_patient_is_protected(self):
        assessment = make_assessment()
        with self.assertRaises(ProtectedError):
            assessment.patient.delete()

    def test_request_origin_free_until_ta41(self):
        assessment = make_assessment(request_origin="Família")
        assessment.full_clean()
        self.assertEqual(assessment.request_origin, "Família")

    def test_assessment_has_no_status(self):
        self.assertFalse(hasattr(make_assessment(), "status"))


class CareNeedModelTests(TestCase):
    def test_defaults_identified(self):
        need = make_care_need()
        self.assertEqual(need.status, NeedStatus.IDENTIFIED)
        self.assertIsNotNone(need.created_at)

    def test_description_required(self):
        need = CareNeed(
            assessment=make_assessment(),
            need_type=make_need_type(),
            description="   ",
            priority=NeedPriority.LOW,
        )
        with self.assertRaises(ValidationError):
            need.full_clean()

    def test_priority_required(self):
        need = CareNeed(
            assessment=make_assessment(),
            need_type=make_need_type(),
            description="Fisioterapia motora",
            priority="",
        )
        with self.assertRaises(ValidationError):
            need.full_clean()

    def test_invalid_priority_rejected(self):
        need = CareNeed(
            assessment=make_assessment(),
            need_type=make_need_type(),
            description="Fisioterapia motora",
            priority="INVALIDA",
        )
        with self.assertRaises(ValidationError):
            need.full_clean()

    def test_all_priorities_accepted(self):
        assessment = make_assessment()
        for priority in NeedPriority.values:
            with self.subTest(priority=priority):
                need = make_care_need(
                    assessment=assessment,
                    description=f"Need {priority}",
                    priority=priority,
                )
                need.full_clean()

    def test_need_type_is_protected(self):
        need = make_care_need()
        with self.assertRaises(ProtectedError):
            need.need_type.delete()

    def test_cascade_on_assessment_delete(self):
        need = make_care_need()
        assessment_pk = need.assessment_id
        need.assessment.delete()
        self.assertFalse(CareNeed.objects.filter(assessment_id=assessment_pk).exists())

    def test_uses_seeded_need_type(self):
        need = make_care_need(need_type=make_need_type("Fisioterapia"))
        self.assertEqual(need.need_type.name, "Fisioterapia")


class AssessmentResourceModelTests(TestCase):
    def make_link(self, **overrides):
        resource, _ = Resource.objects.get_or_create(name="Oxímetro")
        data = {
            "assessment": make_assessment(),
            "resource": resource,
            "quantity": 2,
            "observation": "Uso contínuo",
        }
        data.update(overrides)
        return AssessmentResource.objects.create(**data)

    def test_create_link(self):
        link = self.make_link()
        self.assertEqual(link.quantity, 2)
        self.assertEqual(link.observation, "Uso contínuo")

    def test_quantity_zero_rejected(self):
        link = self.make_link(quantity=0)
        with self.assertRaises(ValidationError):
            link.full_clean()

    def test_resource_name_unique_and_stripped(self):
        resource = Resource.objects.create(name="  Cadeira de rodas  ")
        self.assertEqual(resource.name, "Cadeira de rodas")
        with self.assertRaises(IntegrityError):
            Resource.objects.create(name="Cadeira de rodas")

    def test_resource_is_protected(self):
        link = self.make_link()
        with self.assertRaises(ProtectedError):
            link.resource.delete()

    def test_cascade_on_assessment_delete(self):
        link = self.make_link()
        assessment_pk = link.assessment_id
        link.assessment.delete()
        self.assertFalse(
            AssessmentResource.objects.filter(assessment_id=assessment_pk).exists()
        )


class CareNeedCreateAPITests(TestCase):
    """TA-79: criacao de necessidade vinculada a avaliacao."""

    def setUp(self):
        self.user = make_staff_user(MEDICO_CPF, "MEDICO")
        self.client = APIClient()
        self.client.force_authenticate(self.user)
        self.patient = make_patient()
        self.assessment = make_assessment(
            patient=self.patient,
            professional=self.user,
        )
        self.need_type = make_need_type()
        self.url = f"/api/avaliacoes/{self.assessment.pk}/necessidades/"

    def _payload(self, **overrides):
        payload = {
            "need_type": self.need_type.pk,
            "description": "Acompanhamento de enfermagem diário",
            "priority": NeedPriority.HIGH,
        }
        payload.update(overrides)
        return payload

    def test_creates_need_linked_to_existing_assessment(self):
        response = self.client.post(self.url, self._payload(), format="json")

        self.assertEqual(response.status_code, 201)
        need = CareNeed.objects.get()
        self.assertEqual(need.assessment_id, self.assessment.pk)
        self.assertEqual(need.need_type_id, self.need_type.pk)
        self.assertEqual(need.description, "Acompanhamento de enfermagem diário")
        self.assertEqual(need.priority, NeedPriority.HIGH)
        self.assertEqual(need.status, NeedStatus.IDENTIFIED)
        self.assertEqual(response.data["assessment"], self.assessment.pk)
        self.assertEqual(response.data["status"], NeedStatus.IDENTIFIED)

    def test_multiple_needs_can_use_same_assessment(self):
        first = self.client.post(
            self.url,
            self._payload(description="Curativo diário"),
            format="json",
        )
        second = self.client.post(
            self.url,
            self._payload(
                description="Fisioterapia motora",
                priority=NeedPriority.MEDIUM,
                need_type=NeedType.objects.get(name="Fisioterapia").pk,
            ),
            format="json",
        )

        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 201)
        self.assertEqual(self.assessment.care_needs.count(), 2)

    def test_unknown_assessment_returns_404(self):
        response = self.client.post(
            "/api/avaliacoes/99999/necessidades/",
            self._payload(),
            format="json",
        )
        self.assertEqual(response.status_code, 404)
        self.assertFalse(CareNeed.objects.exists())

    def test_inactive_need_type_is_rejected(self):
        self.need_type.status = NeedTypeStatus.INACTIVE
        self.need_type.save()

        response = self.client.post(self.url, self._payload(), format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("need_type", response.data)
        self.assertFalse(CareNeed.objects.exists())

    def test_description_is_required_and_trimmed(self):
        response = self.client.post(
            self.url,
            self._payload(description="   "),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("description", response.data)

        response = self.client.post(
            self.url,
            self._payload(description="  Curativo diário  "),
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(CareNeed.objects.get().description, "Curativo diário")

    def test_priority_is_required_and_limited_to_choices(self):
        response = self.client.post(
            self.url,
            self._payload(priority=""),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("priority", response.data)

        response = self.client.post(
            self.url,
            self._payload(priority="INVALID"),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("priority", response.data)

    def test_status_is_always_identified(self):
        response = self.client.post(
            self.url,
            self._payload(status="INACTIVE"),
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["status"], NeedStatus.IDENTIFIED)
        self.assertEqual(CareNeed.objects.get().status, NeedStatus.IDENTIFIED)

    def test_historical_link_survives_need_type_inactivation(self):
        response = self.client.post(self.url, self._payload(), format="json")
        self.assertEqual(response.status_code, 201)
        need = CareNeed.objects.get()

        status_response = self.client.post(
            f"/api/tipos-necessidade/{self.need_type.pk}/inativar/"
        )
        self.assertEqual(status_response.status_code, 200)

        need.refresh_from_db()
        need.need_type.refresh_from_db()
        self.assertEqual(need.need_type_id, self.need_type.pk)
        self.assertEqual(need.need_type.status, NeedTypeStatus.INACTIVE)
        self.assertTrue(CareNeed.objects.filter(pk=need.pk).exists())
