from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import GranularPermission
from patients.models import NeedType
from .models import CareNeed, PatientAssessment
from .tests_api import (make_api_users, make_patient, auth_client, MEDICO_CPF,
                        ENFERMEIRO_CPF, GERENTE_CPF, SEM_GRUPO_CPF)


class CareNeedManagementAPITests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.assessment = PatientAssessment.objects.create(patient=make_patient())
        self.need_type = NeedType.objects.get(name="Enfermagem")
        self.need = CareNeed.objects.create(assessment=self.assessment,
            need_type=self.need_type, description="Original", priority="HIGH")
        self.url = f"/api/necessidades/{self.need.pk}/"
        self.client = auth_client(self.users[MEDICO_CPF])

    def test_clinical_profiles_consult_edit_delete(self):
        for cpf in (MEDICO_CPF, ENFERMEIRO_CPF):
            with self.subTest(cpf=cpf):
                client = auth_client(self.users[cpf])
                need = CareNeed.objects.create(assessment=self.assessment,
                    need_type=self.need_type, description="Original", priority="LOW")
                url = f"/api/necessidades/{need.pk}/"
                response = client.get(url)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data["assessment"], self.assessment.pk)
                self.assertEqual(response.data["need_type_name"], self.need_type.name)
                self.assertEqual(client.patch(url, {"description": " Atualizada "}, format="json").status_code, 200)
                need.refresh_from_db()
                self.assertEqual(need.description, "Atualizada")
                self.assertEqual(client.delete(url).status_code, 204)
                self.assertFalse(CareNeed.objects.filter(pk=need.pk).exists())
        self.assertTrue(PatientAssessment.objects.filter(pk=self.assessment.pk).exists())
        self.assertTrue(NeedType.objects.filter(pk=self.need_type.pk).exists())
        self.assertTrue(CareNeed.objects.filter(pk=self.need.pk).exists())

    def test_list_filter_pagination(self):
        other = PatientAssessment.objects.create(patient=self.assessment.patient)
        CareNeed.objects.create(assessment=other, need_type=self.need_type, description="Outra", priority="LOW")
        response = self.client.get(f"/api/necessidades/?assessment={self.assessment.pk}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.need.pk)
        CareNeed.objects.bulk_create([CareNeed(assessment=self.assessment,
            need_type=self.need_type, description="Nova", priority="LOW") for _ in range(21)])
        response = self.client.get("/api/necessidades/")
        self.assertEqual(response.data["count"], 23)
        self.assertEqual(len(response.data["results"]), 20)
        self.assertIsNotNone(response.data["next"])

    def test_invalid_filter_and_missing_object(self):
        for value in ("abc", "0", "-1", ""):
            self.assertEqual(self.client.get(f"/api/necessidades/?assessment={value}").status_code, 400)
        for method in ("get", "patch", "delete"):
            self.assertEqual(getattr(self.client, method)("/api/necessidades/999999/").status_code, 404)

    def test_invalid_updates_leave_record_unchanged(self):
        for payload in ({"description": "  "}, {"description": None},
                        {"priority": "OTHER"}, {"need_type": 999999}, {"need_type": None}):
            with self.subTest(payload=payload):
                self.assertEqual(self.client.patch(self.url, payload, format="json").status_code, 400)
        self.need.refresh_from_db()
        self.assertEqual(self.need.description, "Original")
        self.assertEqual(self.need.priority, "HIGH")

    def test_put_preserves_inactive_historical_type_and_rejects_new_inactive_type(self):
        self.need_type.status = "INACTIVE"
        self.need_type.save()
        response = self.client.put(self.url, {"need_type": self.need_type.pk,
            "description": "Histórico", "priority": "URGENT"}, format="json")
        self.assertEqual(response.status_code, 200)
        other = NeedType.objects.get(name="Outro")
        other.status = "INACTIVE"
        other.save()
        self.assertEqual(self.client.patch(self.url, {"need_type": other.pk}, format="json").status_code, 400)
        other.status = "ACTIVE"
        other.save()
        self.assertEqual(self.client.patch(self.url, {"need_type": other.pk}, format="json").status_code, 200)

    def test_assessment_and_status_read_only(self):
        other = PatientAssessment.objects.create(patient=self.assessment.patient)
        self.assertEqual(self.client.patch(self.url, {"assessment": other.pk, "status": "OTHER"}, format="json").status_code, 200)
        self.need.refresh_from_db()
        self.assertEqual(self.need.assessment_id, self.assessment.pk)
        self.assertEqual(self.need.status, "IDENTIFIED")

    def test_access_restricted(self):
        for client, expected in ((APIClient(), 401),
            (auth_client(self.users[GERENTE_CPF]), 403),
            (auth_client(self.users[SEM_GRUPO_CPF]), 403)):
            self.assertEqual(client.get("/api/necessidades/").status_code, expected)
            for method in ("get", "put", "patch", "delete"):
                self.assertEqual(getattr(client, method)(self.url).status_code, expected)
        self.assertTrue(CareNeed.objects.filter(pk=self.need.pk).exists())

    def test_granular_permissions_required(self):
        for action, method in (("view", "get"), ("update", "patch"), ("delete", "delete")):
            permission = GranularPermission.objects.get(codename=f"necessidades.{action}")
            self.users[MEDICO_CPF].category.permissions.remove(permission)
            self.assertEqual(getattr(self.client, method)(self.url).status_code, 403)
            self.users[MEDICO_CPF].category.permissions.add(permission)

    def test_creation_not_available_here(self):
        self.assertEqual(self.client.post("/api/necessidades/", {}, format="json").status_code, 405)
