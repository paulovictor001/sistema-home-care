from datetime import date

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase
from rest_framework.test import APIClient


class HealthConditionEndpointRemovalTests(TransactionTestCase):
    def test_catalog_endpoint_is_not_registered(self):
        response = APIClient().get("/api/condicoes-saude/")
        self.assertEqual(response.status_code, 404)

    def test_migration_copies_shared_and_unnamed_condition_names(self):
        executor = MigrationExecutor(connection)
        executor.migrate([("patients", "0008_patient_health_context")])
        old_apps = executor.loader.project_state(
            [("patients", "0008_patient_health_context")]
        ).apps
        Patient = old_apps.get_model("patients", "Patient")
        HealthCondition = old_apps.get_model("patients", "HealthCondition")

        shared = HealthCondition.objects.create(name="Hipertensão")
        unnamed = HealthCondition.objects.create(name="")
        patients = [
            Patient.objects.create(
                full_name=f"Paciente {index}",
                birth_date=date(1960, 1, 1),
                cpf=cpf,
                rg="1",
                age=66,
                phone="91",
                gender="Feminino",
                health_condition=condition,
            )
            for index, (cpf, condition) in enumerate(
                [
                    ("52998224725", shared),
                    ("11144477735", shared),
                    ("12345678909", unnamed),
                ],
                1,
            )
        ]
        patient_ids = [patient.pk for patient in patients]

        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        current_apps = executor.loader.project_state(executor.loader.graph.leaf_nodes()).apps
        CurrentPatient = current_apps.get_model("patients", "Patient")
        self.assertEqual(
            list(
                CurrentPatient.objects.filter(pk__in=patient_ids)
                .order_by("pk")
                .values_list("health_condition", flat=True)
            ),
            ["Hipertensão", "Hipertensão", ""],
        )
