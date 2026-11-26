from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import Category, Profession
from patients.models import Patient, PatientAuditLog
from .models import Professional, Team


class TeamAPITests(TestCase):
    def setUp(self):
        User = get_user_model()
        profession = Profession.objects.get(name="Gerente")
        self.manager = User.objects.create_user(cpf="52998224725", password="x", email="manager@test.local", category=profession.category)
        from django.contrib.auth.models import Group
        self.manager.groups.add(Group.objects.get(name="GERENTE"))
        self.client = APIClient()
        self.client.force_authenticate(self.manager)
        self.profession = Profession.objects.get(name="Enfermeiro")
        self.professional = Professional.objects.create(full_name="Ana", profession=self.profession)

    def test_create_edit_and_member_management(self):
        response = self.client.post("/api/equipes/", {"name": "Equipe A", "professionals": [self.professional.pk]}, format="json")
        self.assertEqual(response.status_code, 201)
        team = Team.objects.get()
        self.assertEqual(response.data["members"][0]["profession"], "Enfermeiro")
        self.assertEqual(self.client.post("/api/equipes/", {"name": "Equipe A"}, format="json").status_code, 400)
        self.assertEqual(self.client.patch(f"/api/equipes/{team.pk}/", {"name": "Equipe B", "professionals": []}, format="json").status_code, 200)

    def test_inactivation_unlinks_and_audits_without_restore(self):
        team = Team.objects.create(name="Equipe A")
        patient = Patient.objects.create(full_name="Paciente", birth_date="1970-01-01", cpf="11144477735", rg="1", age=56, phone="1", gender="Feminino", responsible_team=team)
        self.assertEqual(self.client.post(f"/api/equipes/{team.pk}/inativar/").status_code, 200)
        patient.refresh_from_db()
        self.assertIsNone(patient.responsible_team_id)
        self.assertEqual(PatientAuditLog.objects.filter(patient=patient).count(), 1)
        self.client.post(f"/api/equipes/{team.pk}/reativar/")
        patient.refresh_from_db()
        self.assertIsNone(patient.responsible_team_id)
