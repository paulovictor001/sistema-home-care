"""Testes de modelagem do Cadastro do Paciente.

Cobre TASK-CAD-PAC-001/002/003 (criacao), 006 (unicidade do CPF),
028 (obrigatorios), 029 (formato do CPF), 030 (endereco) e 031
(relacionamentos em nivel de model).

Cobre TASK-CAD-PAC-008 a 016 em nivel de endpoint (criacao, consulta,
visualizacao, edicao, inativacao, reativacao, filtros, paginacao) e
TASK-CAD-PAC-017 a 022 (autorizacoes) — na pratica, o escopo de
TASK-CAD-PAC-033 a 036.
"""

from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from rest_framework.test import APIClient

from .models import HealthCondition, Patient, PatientAddress, PatientStatus

User = get_user_model()

CPF_A = "52998224725"
CPF_B = "11144477735"
CPF_C = "12345678909"


def make_patient(cpf=CPF_A, **overrides):
    data = {
        "full_name": "Maria da Silva",
        "birth_date": date(1960, 5, 20),
        "cpf": cpf,
        "rg": "1234567",
        "age": 66,
        "phone": "91999998888",
        "gender": "Feminino",
    }
    data.update(overrides)
    return Patient.objects.create(**data)


def make_address(patient, **overrides):
    data = {
        "zip_code": "66000000",
        "state": "PA",
        "city": "Belem",
        "neighborhood": "Marco",
        "street": "Av. Almirante Barroso",
        "number": "1500",
    }
    data.update(overrides)
    return PatientAddress.objects.create(patient=patient, **data)


class PatientModelTests(TestCase):
    def test_create_patient_defaults_active(self):
        patient = make_patient()
        self.assertEqual(patient.status, PatientStatus.ACTIVE)
        self.assertIsNotNone(patient.created_at)
        self.assertIsNotNone(patient.updated_at)

    def test_cpf_mask_is_normalized_to_digits(self):
        patient = make_patient(cpf="529.982.247-25")
        patient.refresh_from_db()
        self.assertEqual(patient.cpf, CPF_A)

    def test_invalid_cpf_is_rejected(self):
        patient = Patient(
            full_name="X",
            birth_date=date(2000, 1, 1),
            cpf="12345678900",  # digito verificador invalido
            rg="1",
            age=26,
            phone="91",
            gender="Feminino",
        )
        with self.assertRaises(ValidationError):
            patient.full_clean()

    def test_repeated_digit_cpf_is_rejected(self):
        patient = Patient(
            full_name="X",
            birth_date=date(2000, 1, 1),
            cpf="11111111111",
            rg="1",
            age=26,
            phone="91",
            gender="Feminino",
        )
        with self.assertRaises(ValidationError):
            patient.full_clean()

    def test_duplicate_cpf_is_rejected(self):
        make_patient(cpf=CPF_A)
        with self.assertRaises(IntegrityError):
            make_patient(cpf="529.982.247-25", full_name="Outro Nome")

    def test_required_fields_are_validated(self):
        patient = Patient(
            birth_date=date(2000, 1, 1),
            cpf=CPF_B,
            rg="1",
            age=26,
            phone="91",
            gender="Feminino",
        )  # sem full_name
        with self.assertRaises(ValidationError):
            patient.full_clean()

    def test_associate_doctor_and_health_condition(self):
        doctor = User.objects.create_user(cpf=CPF_C, password="Senha123!")
        condition = HealthCondition.objects.create()
        patient = make_patient(
            cpf=CPF_B, responsible_doctor=doctor, health_condition=condition
        )
        self.assertEqual(patient.responsible_doctor_id, doctor.pk)
        self.assertEqual(patient.health_condition_id, condition.pk)

    def test_health_condition_is_protected(self):
        from django.db.models import ProtectedError

        condition = HealthCondition.objects.create()
        make_patient(cpf=CPF_B, health_condition=condition)
        with self.assertRaises(ProtectedError):
            condition.delete()


class PatientAddressModelTests(TestCase):
    def test_one_address_per_patient(self):
        patient = make_patient()
        make_address(patient)
        self.assertEqual(patient.address.city, "Belem")
        with self.assertRaises(IntegrityError):
            make_address(patient, city="Ananindeua")

    def test_cascade_delete(self):
        patient = make_patient()
        make_address(patient)
        patient.delete()
        self.assertEqual(PatientAddress.objects.count(), 0)

    def test_address_required_fields(self):
        patient = make_patient()
        address = PatientAddress(
            patient=patient,
            zip_code="66000000",
            state="PA",
            neighborhood="Marco",
            street="Av. Almirante Barroso",
            number="1500",
        )  # sem city
        with self.assertRaises(ValidationError):
            address.full_clean()

    def test_optional_fields_may_be_blank(self):
        patient = make_patient()
        address = make_address(patient)
        address.full_clean()  # complement/reference_point/region vazios: ok


# ---------------------------------------------------------------------------
# Testes de endpoint (TASK-CAD-PAC-008 a 022; escopo de 033 a 036).
# ---------------------------------------------------------------------------

GERENTE_CPF = "52998224725"
MEDICO_CPF = "11144477735"
ENFERMEIRO_CPF = "12345678909"
SEM_GRUPO_CPF = "98765432100"
PACIENTE_CPF = "11122233396"


def make_api_users():
    """Cria um usuario por perfil e devolve dict perfil -> user."""
    gerente, _ = Group.objects.get_or_create(name="GERENTE")
    medico, _ = Group.objects.get_or_create(name="MEDICO")
    enfermeiro, _ = Group.objects.get_or_create(name="ENFERMEIRO")
    users = {}
    for cpf, group in (
        (GERENTE_CPF, gerente),
        (MEDICO_CPF, medico),
        (ENFERMEIRO_CPF, enfermeiro),
        (SEM_GRUPO_CPF, None),
    ):
        user = User.objects.create_user(cpf=cpf, password="Senha123!")
        if group is not None:
            user.groups.add(group)
        users[cpf] = user
    return users


def make_api_client(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


def make_payload(cpf=PACIENTE_CPF, doctor_pk=None, condition_pk=None, **overrides):
    payload = {
        "full_name": "Maria da Silva",
        "birth_date": "1960-05-20",
        "cpf": cpf,
        "rg": "1234567",
        "age": 66,
        "phone": "91999998888",
        "gender": "Feminino",
        "responsible_team": {"nome": "Equipe 1"},
        "address": {
            "zip_code": "66000000",
            "state": "PA",
            "city": "Belem",
            "neighborhood": "Marco",
            "street": "Av. Almirante Barroso",
            "number": "1500",
            "region": "Regiao Norte",
        },
    }
    if doctor_pk is not None:
        payload["responsible_doctor"] = doctor_pk
    if condition_pk is not None:
        payload["health_condition"] = condition_pk
    payload.update(overrides)
    return payload


class PatientCreateAPITests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.condition = HealthCondition.objects.create()

    def _payload(self, **overrides):
        overrides.setdefault("doctor_pk", self.users[MEDICO_CPF].pk)
        overrides.setdefault("condition_pk", self.condition.pk)
        return make_payload(**overrides)

    def test_gerente_creates_patient_with_nested_address(self):
        client = make_api_client(self.users[GERENTE_CPF])
        response = client.post(
            "/api/pacientes/", self._payload(), format="json"
        )
        self.assertEqual(response.status_code, 201)
        patient = Patient.objects.get()
        self.assertEqual(patient.address.city, "Belem")
        self.assertEqual(patient.responsible_team, {"nome": "Equipe 1"})
        self.assertEqual(
            patient.responsible_doctor_id, self.users[MEDICO_CPF].pk
        )

    def test_non_gerente_cannot_create(self):
        for cpf in (MEDICO_CPF, ENFERMEIRO_CPF, SEM_GRUPO_CPF):
            client = make_api_client(self.users[cpf])
            response = client.post(
                "/api/pacientes/", self._payload(), format="json"
            )
            self.assertEqual(response.status_code, 403, f"perfil {cpf}")

    def test_unauthenticated_cannot_create(self):
        response = make_api_client().post(
            "/api/pacientes/", self._payload(), format="json"
        )
        self.assertIn(response.status_code, (401, 403))

    def test_create_requires_doctor_health_condition_and_address(self):
        client = make_api_client(self.users[GERENTE_CPF])
        payload = make_payload(condition_pk=self.condition.pk)  # sem medico
        response = client.post("/api/pacientes/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("responsible_doctor", response.data)

        payload = make_payload(
            doctor_pk=self.users[MEDICO_CPF].pk
        )  # sem condicao nem endereco
        payload.pop("address", None)
        response = client.post("/api/pacientes/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("health_condition", response.data)
        self.assertIn("address", response.data)

    def test_create_rejects_non_medico_doctor(self):
        client = make_api_client(self.users[GERENTE_CPF])
        payload = self._payload(doctor_pk=self.users[ENFERMEIRO_CPF].pk)
        response = client.post("/api/pacientes/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("responsible_doctor", response.data)

    def test_create_rejects_duplicate_cpf_even_masked(self):
        client = make_api_client(self.users[GERENTE_CPF])
        response = client.post(
            "/api/pacientes/", self._payload(), format="json"
        )
        self.assertEqual(response.status_code, 201)
        payload = self._payload(cpf="111.222.333-96")
        response = client.post("/api/pacientes/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("cpf", response.data)

    def test_create_rejects_invalid_cpf(self):
        client = make_api_client(self.users[GERENTE_CPF])
        payload = self._payload(cpf="12345678900")
        response = client.post("/api/pacientes/", payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("cpf", response.data)


class PatientListAPITests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.client = make_api_client(self.users[GERENTE_CPF])
        condition = HealthCondition.objects.create()
        doctor = self.users[MEDICO_CPF]
        self.active = make_patient(
            cpf=PACIENTE_CPF,
            full_name="Maria da Silva",
            responsible_doctor=doctor,
            health_condition=condition,
        )
        make_address(self.active, region="Regiao Norte")
        self.inactive = make_patient(
            cpf="12345678909",
            full_name="Joao Souza",
            status="INACTIVE",
            responsible_doctor=doctor,
            health_condition=condition,
        )
        make_address(self.inactive, region="Regiao Sul", city="Sao Paulo")

    def test_default_lists_only_active(self):
        response = self.client.get("/api/pacientes/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["cpf"], PACIENTE_CPF)

    def test_status_filters(self):
        response = self.client.get("/api/pacientes/?status=inativo")
        self.assertEqual(response.data["count"], 1)
        response = self.client.get("/api/pacientes/?status=todos")
        self.assertEqual(response.data["count"], 2)

    def test_invalid_status_returns_400(self):
        response = self.client.get("/api/pacientes/?status=xyz")
        self.assertEqual(response.status_code, 400)

    def test_filter_by_nome(self):
        response = self.client.get("/api/pacientes/?status=todos&nome=joao")
        self.assertEqual(response.data["count"], 1)

    def test_filter_by_cpf_accepts_mask(self):
        response = self.client.get("/api/pacientes/?cpf=111.222.333-96")
        self.assertEqual(response.data["count"], 1)

    def test_filter_by_regiao(self):
        response = self.client.get("/api/pacientes/?status=todos&regiao=sul")
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            response.data["results"][0]["address"]["city"], "Sao Paulo"
        )

    def test_pagination_is_20_per_page(self):
        for i in range(20):
            Patient.objects.create(
                full_name=f"Extra {i:02d}",
                birth_date=date(2000, 1, 1),
                cpf=f"900000000{i:02d}",
                rg="1",
                age=20,
                phone="1",
                gender="X",
            )
        response = self.client.get("/api/pacientes/?status=todos")
        self.assertEqual(response.data["count"], 22)
        self.assertEqual(len(response.data["results"]), 20)
        self.assertIsNotNone(response.data["next"])

    def test_user_without_group_cannot_list(self):
        client = make_api_client(self.users[SEM_GRUPO_CPF])
        response = client.get("/api/pacientes/")
        self.assertEqual(response.status_code, 403)


class PatientDetailUpdateAPITests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.condition = HealthCondition.objects.create()
        self.patient = make_patient(
            cpf=PACIENTE_CPF,
            responsible_doctor=self.users[MEDICO_CPF],
            health_condition=self.condition,
        )
        make_address(self.patient)
        self.url = f"/api/pacientes/{self.patient.pk}/"

    def test_enfermeiro_can_view_detail(self):
        client = make_api_client(self.users[ENFERMEIRO_CPF])
        response = client.get(self.url)
        self.assertEqual(response.status_code, 200)
        self.assertIn("address", response.data)

    def test_medico_can_edit_clinical_fields(self):
        client = make_api_client(self.users[MEDICO_CPF])
        response = client.patch(
            self.url, {"phone": "92999998888"}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["phone"], "92999998888")

    def test_medico_cannot_change_doctor_or_team(self):
        client = make_api_client(self.users[MEDICO_CPF])
        response = client.patch(
            self.url,
            {"responsible_doctor": self.users[MEDICO_CPF].pk},
            format="json",
        )
        self.assertEqual(response.status_code, 403)
        response = client.patch(
            self.url, {"responsible_team": {"nome": "Outra"}}, format="json"
        )
        self.assertEqual(response.status_code, 403)

    def test_gerente_can_change_doctor(self):
        other = User.objects.create_user(cpf="39053344705", password="x")
        other.groups.add(Group.objects.get(name="MEDICO"))
        client = make_api_client(self.users[GERENTE_CPF])
        response = client.patch(
            self.url, {"responsible_doctor": other.pk}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["responsible_doctor"], other.pk)

    def test_status_is_read_only_on_update(self):
        client = make_api_client(self.users[GERENTE_CPF])
        response = client.patch(self.url, {"status": "INACTIVE"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ACTIVE")


class PatientStatusActionsAPITests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.patient = make_patient(cpf=PACIENTE_CPF)
        self.inativar_url = f"/api/pacientes/{self.patient.pk}/inativar/"
        self.reativar_url = f"/api/pacientes/{self.patient.pk}/reativar/"

    def test_gerente_inactivates_and_reactivates(self):
        client = make_api_client(self.users[GERENTE_CPF])
        response = client.post(self.inativar_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "INACTIVE")
        # Idempotente: inativar de novo continua 200.
        response = client.post(self.inativar_url)
        self.assertEqual(response.status_code, 200)
        # Some da listagem padrao e aparece no filtro.
        self.assertEqual(client.get("/api/pacientes/").data["count"], 0)
        self.assertEqual(
            client.get("/api/pacientes/?status=inativo").data["count"], 1
        )
        response = client.post(self.reativar_url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ACTIVE")

    def test_non_gerente_cannot_change_status(self):
        for cpf in (MEDICO_CPF, ENFERMEIRO_CPF, SEM_GRUPO_CPF):
            client = make_api_client(self.users[cpf])
            self.assertEqual(client.post(self.inativar_url).status_code, 403)
            self.assertEqual(client.post(self.reativar_url).status_code, 403)

    def test_actions_on_unknown_patient_return_404(self):
        client = make_api_client(self.users[GERENTE_CPF])
        self.assertEqual(
            client.post("/api/pacientes/99999/inativar/").status_code, 404
        )
        self.assertEqual(
            client.post("/api/pacientes/99999/reativar/").status_code, 404
        )
