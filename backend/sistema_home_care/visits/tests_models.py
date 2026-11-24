from datetime import time
from importlib import import_module

from django.apps import apps
from django.db import IntegrityError, connection, transaction
from django.test import TestCase

from accounts.models import GranularPermission
from care_scales.test_support import ScaleFixture
from .models import ProfessionalWeeklyAvailability, Visit, VisitStatus


class VisitFoundationTests(ScaleFixture):
    def test_weekly_availability_supports_multiple_windows_per_weekday(self):
        first = ProfessionalWeeklyAvailability.objects.create(
            professional=self.professional,
            weekday=ProfessionalWeeklyAvailability.Weekday.MONDAY,
            start_time=time(8), end_time=time(12),
        )
        second = ProfessionalWeeklyAvailability.objects.create(
            professional=self.professional,
            weekday=ProfessionalWeeklyAvailability.Weekday.MONDAY,
            start_time=time(13), end_time=time(17),
        )
        self.assertEqual(
            list(self.professional.weekly_availability_windows.all()), [first, second]
        )

    def test_weekly_availability_rejects_empty_or_reversed_window_in_database(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            ProfessionalWeeklyAvailability.objects.create(
                professional=self.professional,
                weekday=0,
                start_time=time(12), end_time=time(12),
            )

    def test_visit_links_and_address_snapshot_are_persisted(self):
        scale_need = self.scale.items.create(plan_need=self.link)
        visit = Visit.objects.create(
            patient=self.patient,
            care_plan=self.plan,
            plan_need=self.link,
            care_scale=self.scale,
            scale_need=scale_need,
            professional=self.professional,
            visit_date=self.scale.start_date,
            start_time=time(9), end_time=time(10),
            address_zip_code="01001000", address_state="SP", address_city="São Paulo",
            address_neighborhood="Sé", address_street="Rua A", address_number="10",
            address_complement="Casa", address_reference_point="Praça", address_region="Centro",
        )
        self.assertEqual(visit.status, VisitStatus.SCHEDULED)
        self.assertEqual(visit.address_street, "Rua A")
        self.assertEqual(visit.address_complement, "Casa")
        self.assertEqual(visit.scale_need.scale_id, self.scale.pk)
        self.assertEqual(visit.plan_need_id, visit.scale_need.plan_need_id)

    def test_cancelled_visit_requires_a_reason_at_database_level(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Visit.objects.create(
                patient=self.patient, care_plan=self.plan, plan_need=self.link,
                care_scale=self.scale,
                scale_need=self.scale.items.create(plan_need=self.link),
                professional=self.professional,
                visit_date=self.scale.start_date, start_time=time(9), end_time=time(10),
                status=VisitStatus.CANCELLED,
                address_zip_code="01001000", address_state="SP", address_city="São Paulo",
                address_neighborhood="Sé", address_street="Rua A", address_number="10",
            )

    def test_not_held_visit_requires_a_reason_at_database_level(self):
        with self.assertRaises(IntegrityError), transaction.atomic():
            Visit.objects.create(
                patient=self.patient, care_plan=self.plan, plan_need=self.link,
                care_scale=self.scale,
                scale_need=self.scale.items.create(plan_need=self.link),
                professional=self.professional,
                visit_date=self.scale.start_date, start_time=time(9), end_time=time(10),
                status=VisitStatus.NOT_HELD,
                address_zip_code="01001000", address_state="SP", address_city="São Paulo",
                address_neighborhood="Sé", address_street="Rua A", address_number="10",
            )

    def test_manager_receives_all_scheduling_permissions(self):
        manager = self.manager.category
        permissions = GranularPermission.objects.filter(feature="agendamentos")
        self.assertEqual(set(permissions.values_list("action", flat=True)),
                         {"create", "view", "update", "delete", "status"})
        self.assertEqual(set(manager.permissions.filter(feature="agendamentos")), set(permissions))

    def test_scheduling_permission_seed_can_be_reversed_and_reapplied(self):
        migration = import_module("visits.migrations.0002_seed_scheduling_permissions")
        schema_editor = type("SchemaEditor", (), {"connection": connection})()
        migration.unseed_permissions(apps, schema_editor)
        self.assertFalse(GranularPermission.objects.filter(feature="agendamentos").exists())

        migration.seed_permissions(apps, schema_editor)
        self.assertEqual(GranularPermission.objects.filter(feature="agendamentos").count(), 5)
        self.assertEqual(self.manager.category.permissions.filter(feature="agendamentos").count(), 5)

    def test_visit_permission_seed_can_be_reversed_and_reapplied(self):
        migration = import_module("visits.migrations.0004_seed_visit_operation_permissions")
        schema_editor = type("SchemaEditor", (), {"connection": connection})()
        migration.unseed_permissions(apps, schema_editor)
        self.assertFalse(GranularPermission.objects.filter(feature="visitas").exists())

        migration.seed_permissions(apps, schema_editor)
        permissions = GranularPermission.objects.filter(feature="visitas")
        self.assertEqual(set(permissions.values_list("action", flat=True)),
                         {"view", "update", "confirm", "cancel", "start", "finish", "not_realized"})
        self.assertEqual(set(self.manager.category.permissions.filter(feature="visitas")), set(permissions))

