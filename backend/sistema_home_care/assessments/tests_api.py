"""Testes de API da Avaliação Inicial.

Cobre TASK-AVL-BE-001 a 008 (TA-47 a TA-54) em nível de endpoint:
- criação válida (BE-001) e bloqueio por obrigatórios (BE-002);
- consulta com relacionados (BE-003) e histórico preservado (BE-004);
- edição clínica + troca de responsável pelo gerente (BE-005/006);
- criação de necessidade (BE-007) e associação de recurso (BE-008);
- matriz de permissões (RF-AVL-019).
"""

from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Category, GranularPermission
from patients.models import NeedType, Patient

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

GERENTE_CPF = "52998224725"
MEDICO_CPF = "11144477735"
ENFERMEIRO_CPF = "12345678909"
SEM_GRUPO_CPF = "98765432100"
PACIENTE_CPF = "11122233396"


def make_api_users():
    mapping = {"GERENTE": "Gerente", "MEDICO": "Médico", "ENFERMEIRO": "Enfermeiro"}
    users = {}
    for cpf, group in (
        (GERENTE_CPF, "GERENTE"),
        (MEDICO_CPF, "MEDICO"),
        (ENFERMEIRO_CPF, "ENFERMEIRO"),
        (SEM_GRUPO_CPF, None),
    ):
        category_name = mapping.get(group, "Apoio")
        user = User.objects.create_user(
            cpf=cpf,
            password="Senha123!",
            email=f"avl-{cpf}@teste.local",
            category=Category.objects.get(name=category_name),
        )
        if group is not None:
            user.groups.add(Group.objects.get(name=group))
        users[cpf] = user
    return users


def auth_client(user):
    client = APIClient()
    client.force_authenticate(user)
    return client


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


def make_payload(patient_pk, professional_pk, **overrides):
    payload = {
        "patient": patient_pk,
        "professional": professional_pk,
        "assessment_date": "2026-09-30",
        "assessment_time": "09:30:00",
        "request_reason": "Solicitação da família",
        "chief_complaint": "Dor lombar",
    }
    payload.update(overrides)
    return payload


class AssessmentCreateAPITests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.patient = make_patient()

    def _payload(self, **overrides):
        overrides.setdefault("patient_pk", self.patient.pk)
        overrides.setdefault(
            "professional_pk", self.users[MEDICO_CPF].pk
        )
        return make_payload(**overrides)

    def test_medico_creates_assessment(self):
        client = auth_client(self.users[MEDICO_CPF])
        response = client.post("/api/avaliacoes/", self._payload(), format="json")
        self.assertEqual(response.status_code, 201)
        assessment = PatientAssessment.objects.get()
        self.assertEqual(assessment.assessment_type, AssessmentType.INITIAL)
        self.assertEqual(assessment.patient_id, self.patient.pk)

    def test_enfermeiro_creates_assessment(self):
        client = auth_client(self.users[ENFERMEIRO_CPF])
        payload = self._payload(professional_pk=self.users[ENFERMEIRO_CPF].pk)
        response = client.post("/api/avaliacoes/", payload, format="json")
        self.assertEqual(response.status_code, 201)

    def test_gerente_cannot_create(self):
        client = auth_client(self.users[GERENTE_CPF])
        payload = self._payload(professional_pk=self.users[MEDICO_CPF].pk)
        response = client.post("/api/avaliacoes/", payload, format="json")
        self.assertEqual(response.status_code, 403)
        self.assertFalse(PatientAssessment.objects.exists())

    def test_sem_grupo_cannot_create(self):
        client = auth_client(self.users[SEM_GRUPO_CPF])
        response = client.post("/api/avaliacoes/", self._payload(), format="json")
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_cannot_create(self):
        response = APIClient().post(
            "/api/avaliacoes/", self._payload(), format="json"
        )
        self.assertEqual(response.status_code, 401)

    def test_create_requires_all_mandatory_fields(self):
        client = auth_client(self.users[MEDICO_CPF])
        base = self._payload()
        for field in (
            "patient",
            "professional",
            "assessment_date",
            "assessment_time",
            "request_reason",
            "chief_complaint",
        ):
            with self.subTest(field=field):
                payload = dict(base)
                payload.pop(field, None)
                response = client.post(
                    "/api/avaliacoes/", payload, format="json"
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn(field, response.data)
        self.assertFalse(PatientAssessment.objects.exists())

    def test_create_rejects_blank_reason_and_complaint(self):
        client = auth_client(self.users[MEDICO_CPF])
        payload = self._payload(request_reason="  ", chief_complaint="")
        response = client.post("/api/avaliacoes/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("request_reason", response.data)
        self.assertIn("chief_complaint", response.data)

    def test_create_rejects_non_clinical_professional(self):
        client = auth_client(self.users[MEDICO_CPF])
        payload = self._payload(professional_pk=self.users[GERENTE_CPF].pk)
        response = client.post("/api/avaliacoes/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("professional", response.data)

    def test_create_rejects_other_assessment_type(self):
        client = auth_client(self.users[MEDICO_CPF])
        payload = self._payload(assessment_type="OTHER")
        response = client.post("/api/avaliacoes/", payload, format="json")
        self.assertEqual(response.status_code, 400)

    def test_create_accepts_request_origin_domain(self):
        client = auth_client(self.users[MEDICO_CPF])
        for origin in ("Família", "Médico", "Hospital", "Clínica", "Outro"):
            with self.subTest(origin=origin):
                PatientAssessment.objects.all().delete()
                payload = self._payload(request_origin=origin)
                response = client.post(
                    "/api/avaliacoes/", payload, format="json"
                )
                self.assertEqual(response.status_code, 201)

    def test_create_rejects_unknown_request_origin(self):
        client = auth_client(self.users[MEDICO_CPF])
        payload = self._payload(request_origin="Vizinho")
        response = client.post("/api/avaliacoes/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("request_origin", response.data)

    def test_clinical_without_create_permission_cannot_create(self):
        client = auth_client(self.users[MEDICO_CPF])
        permission = GranularPermission.objects.get(
            codename="avaliacoes.create"
        )
        self.users[MEDICO_CPF].category.permissions.remove(permission)
        response = client.post("/api/avaliacoes/", self._payload(), format="json")
        self.assertEqual(response.status_code, 403)


class AssessmentRetrieveHistoryAPITests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.patient = make_patient()
        self.medico = self.users[MEDICO_CPF]
        self.first = PatientAssessment.objects.create(
            patient=self.patient,
            professional=self.medico,
            assessment_date=date(2026, 9, 29),
            assessment_time="08:00:00",
            request_reason="Primeira solicitação",
            chief_complaint="Queixa 1",
        )
        self.second = PatientAssessment.objects.create(
            patient=self.patient,
            professional=self.medico,
            assessment_date=date(2026, 9, 30),
            assessment_time="09:00:00",
            request_reason="Segunda solicitação",
            chief_complaint="Queixa 2",
        )

    def test_retrieve_includes_related(self):
        need_type = NeedType.objects.get(name="Enfermagem")
        CareNeed.objects.create(
            assessment=self.first,
            need_type=need_type,
            description="Acompanhamento diário",
            priority=NeedPriority.HIGH,
        )
        resource, _ = Resource.objects.get_or_create(name="Oxímetro")
        AssessmentResource.objects.create(
            assessment=self.first, resource=resource, quantity=1
        )
        client = auth_client(self.users[GERENTE_CPF])
        response = client.get(f"/api/avaliacoes/{self.first.pk}/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["care_needs"]), 1)
        self.assertEqual(len(response.data["assessment_resources"]), 1)

    def test_history_lists_multiple_without_overwrite(self):
        client = auth_client(self.users[MEDICO_CPF])
        response = client.get(f"/api/avaliacoes/?patient={self.patient.pk}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)
        self.first.refresh_from_db()
        self.assertEqual(
            PatientAssessment.objects.filter(patient=self.patient).count(), 2
        )

    def test_history_invalid_patient_rejected(self):
        client = auth_client(self.users[MEDICO_CPF])
        response = client.get("/api/avaliacoes/?patient=abc")
        self.assertEqual(response.status_code, 400)

    def test_all_profiles_can_view(self):
        for cpf in (GERENTE_CPF, MEDICO_CPF, ENFERMEIRO_CPF):
            with self.subTest(cpf=cpf):
                client = auth_client(self.users[cpf])
                response = client.get(f"/api/avaliacoes/{self.first.pk}/")
                self.assertEqual(response.status_code, 200)

    def test_sem_grupo_cannot_view(self):
        client = auth_client(self.users[SEM_GRUPO_CPF])
        response = client.get(f"/api/avaliacoes/{self.first.pk}/")
        self.assertEqual(response.status_code, 403)


class AssessmentUpdateAPITests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.patient = make_patient()
        self.assessment = PatientAssessment.objects.create(
            patient=self.patient,
            professional=self.users[MEDICO_CPF],
            assessment_date=date(2026, 9, 30),
            assessment_time="09:30:00",
            request_reason="Solicitação inicial",
            chief_complaint="Dor lombar",
        )

    def test_medico_can_edit(self):
        client = auth_client(self.users[MEDICO_CPF])
        response = client.patch(
            f"/api/avaliacoes/{self.assessment.pk}/",
            {"chief_complaint": "Dor atualizada"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assessment.refresh_from_db()
        self.assertEqual(self.assessment.chief_complaint, "Dor atualizada")

    def test_enfermeiro_can_edit(self):
        client = auth_client(self.users[ENFERMEIRO_CPF])
        response = client.patch(
            f"/api/avaliacoes/{self.assessment.pk}/",
            {"conclusion": "Conclusão da enfermagem"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)

    def test_gerente_can_change_professional(self):
        client = auth_client(self.users[GERENTE_CPF])
        response = client.patch(
            f"/api/avaliacoes/{self.assessment.pk}/",
            {"professional": self.users[ENFERMEIRO_CPF].pk},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assessment.refresh_from_db()
        self.assertEqual(
            self.assessment.professional_id, self.users[ENFERMEIRO_CPF].pk
        )

    def test_gerente_cannot_edit_clinical_fields(self):
        client = auth_client(self.users[GERENTE_CPF])
        response = client.patch(
            f"/api/avaliacoes/{self.assessment.pk}/",
            {"chief_complaint": "Tentativa do gerente"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        self.assessment.refresh_from_db()
        self.assertEqual(self.assessment.chief_complaint, "Dor lombar")

    def test_gerente_without_change_permission_cannot_change_professional(self):
        permission = GranularPermission.objects.get(
            codename="avaliacoes.change_professional"
        )
        self.users[GERENTE_CPF].category.permissions.remove(permission)
        client = auth_client(self.users[GERENTE_CPF])
        response = client.patch(
            f"/api/avaliacoes/{self.assessment.pk}/",
            {"professional": self.users[ENFERMEIRO_CPF].pk},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_sem_grupo_cannot_edit(self):
        client = auth_client(self.users[SEM_GRUPO_CPF])
        response = client.patch(
            f"/api/avaliacoes/{self.assessment.pk}/",
            {"chief_complaint": "X"},
            format="json",
        )
        self.assertEqual(response.status_code, 403)


class CareNeedAPITests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.patient = make_patient()
        self.assessment = PatientAssessment.objects.create(
            patient=self.patient,
            professional=self.users[MEDICO_CPF],
            assessment_date=date(2026, 9, 30),
            assessment_time="09:30:00",
            request_reason="Solicitação inicial",
            chief_complaint="Dor lombar",
        )
        self.need_type = NeedType.objects.get(name="Enfermagem")

    def _payload(self, **overrides):
        payload = {
            "need_type": self.need_type.pk,
            "description": "Acompanhamento de enfermagem diário",
            "priority": NeedPriority.HIGH,
        }
        payload.update(overrides)
        return payload

    def test_medico_creates_need_with_identified_status(self):
        client = auth_client(self.users[MEDICO_CPF])
        response = client.post(
            f"/api/avaliacoes/{self.assessment.pk}/necessidades/",
            self._payload(),
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        need = CareNeed.objects.get()
        self.assertEqual(need.status, NeedStatus.IDENTIFIED)
        self.assertEqual(need.assessment_id, self.assessment.pk)

    def test_status_is_read_only(self):
        client = auth_client(self.users[MEDICO_CPF])
        payload = self._payload(status="OTHER")
        response = client.post(
            f"/api/avaliacoes/{self.assessment.pk}/necessidades/",
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(CareNeed.objects.get().status, NeedStatus.IDENTIFIED)

    def test_rejects_missing_description_and_priority(self):
        client = auth_client(self.users[MEDICO_CPF])
        response = client.post(
            f"/api/avaliacoes/{self.assessment.pk}/necessidades/",
            {"need_type": self.need_type.pk},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("description", response.data)
        self.assertIn("priority", response.data)

    def test_rejects_inactive_need_type(self):
        self.need_type.status = "INACTIVE"
        self.need_type.save()
        client = auth_client(self.users[MEDICO_CPF])
        response = client.post(
            f"/api/avaliacoes/{self.assessment.pk}/necessidades/",
            self._payload(),
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("need_type", response.data)

    def test_gerente_cannot_create_need(self):
        client = auth_client(self.users[GERENTE_CPF])
        response = client.post(
            f"/api/avaliacoes/{self.assessment.pk}/necessidades/",
            self._payload(),
            format="json",
        )
        self.assertEqual(response.status_code, 403)


class AssessmentResourceAPITests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.patient = make_patient()
        self.assessment = PatientAssessment.objects.create(
            patient=self.patient,
            professional=self.users[MEDICO_CPF],
            assessment_date=date(2026, 9, 30),
            assessment_time="09:30:00",
            request_reason="Solicitação inicial",
            chief_complaint="Dor lombar",
        )
        self.resource, _ = Resource.objects.get_or_create(name="Oxímetro")

    def test_medico_associates_existing_resource(self):
        client = auth_client(self.users[MEDICO_CPF])
        response = client.post(
            f"/api/avaliacoes/{self.assessment.pk}/recursos/",
            {
                "resource": self.resource.pk,
                "quantity": 2,
                "observation": "Uso contínuo",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        link = AssessmentResource.objects.get()
        self.assertEqual(link.quantity, 2)

    def test_rejects_zero_quantity(self):
        client = auth_client(self.users[MEDICO_CPF])
        response = client.post(
            f"/api/avaliacoes/{self.assessment.pk}/recursos/",
            {"resource": self.resource.pk, "quantity": 0},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("quantity", response.data)

    def test_rejects_unknown_resource(self):
        client = auth_client(self.users[MEDICO_CPF])
        response = client.post(
            f"/api/avaliacoes/{self.assessment.pk}/recursos/",
            {"resource": 999999, "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_gerente_cannot_associate_resource(self):
        client = auth_client(self.users[GERENTE_CPF])
        response = client.post(
            f"/api/avaliacoes/{self.assessment.pk}/recursos/",
            {"resource": self.resource.pk, "quantity": 1},
            format="json",
        )
        self.assertEqual(response.status_code, 403)


class CatalogAPITests(TestCase):
    """Catálogos read-only p/ os selects do frontend (TA-61/63)."""

    def setUp(self):
        self.users = make_api_users()
        Resource.objects.get_or_create(name="Oxímetro")

    def test_care_team_can_list_need_types_and_resources(self):
        for cpf in (GERENTE_CPF, MEDICO_CPF, ENFERMEIRO_CPF):
            with self.subTest(cpf=cpf):
                client = auth_client(self.users[cpf])
                need_types = client.get("/api/tipos-necessidade/")
                self.assertEqual(need_types.status_code, 200)
                self.assertTrue(
                    any(
                        item["name"] == "Enfermagem"
                        for item in need_types.data
                    )
                )
                resources = client.get("/api/recursos/")
                self.assertEqual(resources.status_code, 200)
                self.assertTrue(
                    any(
                        item["name"] == "Oxímetro"
                        for item in resources.data
                    )
                )

    def test_need_types_default_only_active(self):
        inactive = NeedType.objects.get(name="Enfermagem")
        inactive.status = "INACTIVE"
        inactive.save()
        client = auth_client(self.users[MEDICO_CPF])
        default = client.get("/api/tipos-necessidade/")
        self.assertEqual(default.status_code, 200)
        self.assertFalse(
            any(item["name"] == "Enfermagem" for item in default.data)
        )
        all_types = client.get("/api/tipos-necessidade/?status=todos")
        self.assertEqual(all_types.status_code, 200)
        self.assertTrue(
            any(item["name"] == "Enfermagem" for item in all_types.data)
        )

    def test_sem_grupo_cannot_list_catalogs(self):
        client = auth_client(self.users[SEM_GRUPO_CPF])
        self.assertEqual(
            client.get("/api/tipos-necessidade/").status_code, 403
        )
        self.assertEqual(client.get("/api/recursos/").status_code, 403)


class ClinicoListAPITests(TestCase):
    """Select de profissional responsável (gap de UX do frontend)."""

    def setUp(self):
        self.users = make_api_users()

    def test_care_team_can_list_clinicos(self):
        for cpf in (GERENTE_CPF, MEDICO_CPF, ENFERMEIRO_CPF):
            with self.subTest(cpf=cpf):
                client = auth_client(self.users[cpf])
                response = client.get("/api/clinicos/")
                self.assertEqual(response.status_code, 200)
                cpfs = [item["cpf"] for item in response.data]
                self.assertIn(MEDICO_CPF, cpfs)
                self.assertIn(ENFERMEIRO_CPF, cpfs)
                self.assertNotIn(GERENTE_CPF, cpfs)
                self.assertNotIn(SEM_GRUPO_CPF, cpfs)

    def test_sem_grupo_cannot_list_clinicos(self):
        client = auth_client(self.users[SEM_GRUPO_CPF])
        self.assertEqual(client.get("/api/clinicos/").status_code, 403)

    def test_unauthenticated_cannot_list_clinicos(self):
        self.assertEqual(APIClient().get("/api/clinicos/").status_code, 401)
