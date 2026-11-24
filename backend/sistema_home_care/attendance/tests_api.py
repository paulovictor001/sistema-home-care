from datetime import time

from rest_framework.test import APIClient

from accounts.models import GranularPermission
from assessments.tests_api import ENFERMEIRO_CPF
from care_scales.models import ScaleNeed
from care_scales.test_support import ScaleFixture
from visits.models import Visit, VisitStatus

from .models import Attendance


class AttendanceApiTests(ScaleFixture):
    def setUp(self):
        super().setUp()
        self.nurse = self.users[ENFERMEIRO_CPF]
        self.professional.user = self.nurse
        self.professional.save(update_fields=["user"])
        permissions = [
            GranularPermission.objects.get(codename=f"atendimentos.{action}")
            for action in ("view", "create", "update")
        ]
        permissions.append(GranularPermission.objects.get(codename="visitas.start"))
        permissions.append(GranularPermission.objects.get(codename="visitas.finish"))
        self.nurse.category.permissions.add(*permissions)
        scale_need = ScaleNeed.objects.create(
            scale=self.scale, plan_need=self.link, frequency_quantity=2,
            frequency_period="WEEK", required_profession=self.profession,
        )
        self.visit = Visit.objects.create(
            patient=self.patient, care_plan=self.plan, plan_need=self.link,
            care_scale=self.scale, scale_need=scale_need,
            professional=self.professional, visit_date=self.scale.start_date,
            start_time=time(9), end_time=time(10), status=VisitStatus.CONFIRMED,
            address_zip_code="01001000", address_state="SP", address_city="São Paulo",
            address_neighborhood="Sé", address_street="Rua A", address_number="10",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.nurse)
        self.attendance_url = f"/api/atendimentos/visitas/{self.visit.pk}/"
        self.finish_url = f"{self.attendance_url}concluir/"

    def start_visit(self):
        response = self.client.post(
            f"/api/agendamentos/{self.visit.pk}/status/", {"status": "EM_ATENDIMENTO"}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.visit.refresh_from_db()
        return response

    def test_responsible_professional_starts_visit_and_records_attendance(self):
        self.start_visit()
        response = self.client.post(self.attendance_url, {
            "care_description": "  Curativo realizado  ", "notes": "Paciente colaborativo",
        }, format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["care_description"], "Curativo realizado")
        self.assertEqual(response.data["created_by"], self.nurse.pk)
        self.assertEqual(len(response.data["history"]), 1)
        self.assertIsNotNone(response.data["created_at"])
        self.assertIsNotNone(response.data["updated_at"])
        self.visit.refresh_from_db()
        self.assertEqual(self.visit.started_by, self.nurse)
        self.assertIsNotNone(self.visit.started_at)

    def test_description_is_required_and_duplicate_creation_is_rejected(self):
        self.start_visit()
        blank = self.client.post(self.attendance_url, {"care_description": "   "}, format="json")
        self.assertEqual(blank.status_code, 400)
        created = self.client.post(self.attendance_url, {"care_description": "Banho assistido"}, format="json")
        self.assertEqual(created.status_code, 201, created.data)
        duplicate = self.client.post(self.attendance_url, {"care_description": "Outro"}, format="json")
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(Attendance.objects.filter(visit=self.visit).count(), 1)

    def test_update_writes_history_and_completed_attendance_cannot_be_edited(self):
        self.start_visit()
        self.client.post(self.attendance_url, {"care_description": "Curativo"}, format="json")
        updated = self.client.patch(self.attendance_url, {"notes": "Sem intercorrências"}, format="json")
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertEqual(len(updated.data["history"]), 2)
        completed = self.client.post(self.finish_url, format="json")
        self.assertEqual(completed.status_code, 200, completed.data)
        self.assertEqual(completed.data["status"], VisitStatus.COMPLETED)
        self.assertTrue(completed.data["finished_at"])
        self.visit.refresh_from_db()
        self.assertEqual(self.visit.finished_by, self.nurse)
        self.assertIsNotNone(self.visit.finished_at)
        rejected = self.client.patch(self.attendance_url, {"notes": "Alteração posterior"}, format="json")
        self.assertEqual(rejected.status_code, 400)

    def test_finishing_requires_attendance_and_responsible_professional(self):
        self.start_visit()
        self.assertEqual(self.client.post(self.finish_url, format="json").status_code, 400)
        self.client.force_authenticate(self.manager)
        response = self.client.post(self.finish_url, format="json")
        self.assertEqual(response.status_code, 403)

    def test_attendance_requires_responsible_professional_and_granular_permission(self):
        self.start_visit()
        self.client.force_authenticate(self.manager)
        self.assertEqual(self.client.post(self.attendance_url, {"care_description": "Curativo"}, format="json").status_code, 403)
        self.client.force_authenticate(self.nurse)
        self.nurse.category.permissions.remove(GranularPermission.objects.get(codename="atendimentos.create"))
        self.assertEqual(self.client.post(self.attendance_url, {"care_description": "Curativo"}, format="json").status_code, 403)
