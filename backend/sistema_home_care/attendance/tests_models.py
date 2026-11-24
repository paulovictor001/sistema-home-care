from datetime import time
from importlib import import_module

from django.apps import apps
from django.db import IntegrityError, connection, transaction
from django.test import TestCase

from accounts.models import GranularPermission
from care_scales.models import ScaleNeed
from care_scales.test_support import ScaleFixture
from visits.models import Visit, VisitStatus

from .models import Attendance, AttendanceHistory


class AttendanceFoundationTests(ScaleFixture):
    def setUp(self):
        super().setUp()
        scale_need = ScaleNeed.objects.create(
            scale=self.scale, plan_need=self.link, frequency_quantity=2,
            frequency_period="WEEK", required_profession=self.profession,
        )
        self.visit = Visit.objects.create(
            patient=self.patient, care_plan=self.plan, plan_need=self.link,
            care_scale=self.scale, scale_need=scale_need,
            professional=self.professional, visit_date=self.scale.start_date,
            start_time=time(9), end_time=time(10), status=VisitStatus.IN_PROGRESS,
            address_zip_code="01001000", address_state="SP", address_city="São Paulo",
            address_neighborhood="Sé", address_street="Rua A", address_number="10",
        )

    def test_attendance_stores_required_description_notes_author_and_history(self):
        attendance = Attendance.objects.create(
            visit=self.visit, care_description="Curativo realizado", notes="Paciente colaborativo",
            created_by=self.manager,
        )
        history = AttendanceHistory.objects.create(
            attendance=attendance, actor=self.manager, actor_name=self.manager.get_full_name(),
            event_type="CREATED", new_data={"care_description": attendance.care_description},
        )
        self.assertEqual(attendance.visit.patient, self.patient)
        self.assertEqual(attendance.visit.professional, self.professional)
        self.assertEqual(attendance.created_by, self.manager)
        self.assertEqual(history.new_data["care_description"], "Curativo realizado")

    def test_description_is_trimmed_and_blank_values_are_rejected(self):
        attendance = Attendance(visit=self.visit, care_description="  Curativo  ")
        attendance.full_clean()
        attendance.save()
        self.assertEqual(attendance.care_description, "Curativo")

        with self.assertRaises(IntegrityError), transaction.atomic():
            Attendance.objects.create(visit=self._second_visit(), care_description="   ")

    def test_one_attendance_per_visit_is_enforced(self):
        Attendance.objects.create(visit=self.visit, care_description="Curativo")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Attendance.objects.create(visit=self.visit, care_description="Outro cuidado")

    def test_visit_and_history_cannot_be_deleted_through_cascade(self):
        attendance = Attendance.objects.create(visit=self.visit, care_description="Curativo")
        AttendanceHistory.objects.create(attendance=attendance, event_type="CREATED")
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.visit.delete()
        with self.assertRaises(IntegrityError), transaction.atomic():
            attendance.delete()

    def test_manager_receives_attendance_permissions(self):
        permissions = GranularPermission.objects.filter(feature="atendimentos")
        self.assertEqual(set(permissions.values_list("action", flat=True)),
                         {"view", "create", "update", "delete"})
        self.assertEqual(set(self.manager.category.permissions.filter(feature="atendimentos")),
                         set(permissions))

    def test_permission_seed_is_reversible_and_reapplicable(self):
        migration = import_module("attendance.migrations.0002_seed_attendance_permissions")
        schema_editor = type("SchemaEditor", (), {"connection": connection})()
        migration.unseed_permissions(apps, schema_editor)
        self.assertFalse(GranularPermission.objects.filter(feature="atendimentos").exists())

        migration.seed_permissions(apps, schema_editor)
        self.assertEqual(GranularPermission.objects.filter(feature="atendimentos").count(), 4)
        self.assertEqual(self.manager.category.permissions.filter(feature="atendimentos").count(), 4)

    def _second_visit(self):
        return Visit.objects.create(
            patient=self.patient, care_plan=self.plan, plan_need=self.link,
            care_scale=self.scale, scale_need=self.visit.scale_need,
            professional=self.professional, visit_date=self.scale.start_date,
            start_time=time(10), end_time=time(11),
            address_zip_code="01001000", address_state="SP", address_city="São Paulo",
            address_neighborhood="Sé", address_street="Rua A", address_number="10",
        )
