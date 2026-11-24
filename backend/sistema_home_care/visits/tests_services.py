from datetime import date, time

from django.test import TestCase
from rest_framework.exceptions import PermissionDenied, ValidationError

from care_plans.models import CarePlanStatus
from care_scales.models import ScaleAssignment, ScaleNeed, ScaleStatus
from patients.models import PatientAddress
from .models import ProfessionalWeeklyAvailability, Visit, VisitHistory, VisitStatus
from .services import create_visit, create_visit_series, delete_visit, edit_visit, transition_visit
from care_scales.test_support import ScaleFixture
from assessments.tests_api import ENFERMEIRO_CPF, SEM_GRUPO_CPF, make_patient
from accounts.models import GranularPermission


class CreateVisitTests(ScaleFixture):
    def setUp(self):
        super().setUp()
        self.scale_need = ScaleNeed.objects.create(
            scale=self.scale, plan_need=self.link,
            frequency_quantity=2, frequency_period="WEEK",
            required_profession=self.profession,
        )
        ScaleAssignment.objects.create(item=self.scale_need, professional=self.professional)
        self.scale.status = ScaleStatus.ACTIVE
        self.scale.save(update_fields=["status"])
        PatientAddress.objects.create(
            patient=self.patient, zip_code="01001000", state="SP", city="São Paulo",
            neighborhood="Sé", street="Rua A", number="10", complement="Casa",
            reference_point="Praça", region="Centro",
        )
        self.visit_date = date(2026, 10, 5)  # segunda-feira
        for weekday in range(7):
            ProfessionalWeeklyAvailability.objects.create(
                professional=self.professional, weekday=weekday,
                start_time=time(8), end_time=time(12),
            )

    def create(self, **overrides):
        data = {
            "actor": self.manager, "scale": self.scale,
            "scale_need": self.scale_need, "professional": self.professional,
            "visit_date": self.visit_date, "start_time": time(9), "end_time": time(10),
            "observation": "  Curativo  ",
        }
        data.update(overrides)
        return create_visit(**data)

    def test_create_visit_snapshots_address_and_writes_author_and_history(self):
        visit = self.create()
        self.assertEqual(visit.status, VisitStatus.SCHEDULED)
        self.assertEqual(visit.visit_type, "Atendimento domiciliar")
        self.assertEqual(visit.observation, "Curativo")
        self.assertEqual(visit.address_street, "Rua A")
        self.assertEqual(visit.address_complement, "Casa")
        self.assertEqual(visit.created_by, self.manager)
        event = VisitHistory.objects.get(visit=visit)
        self.assertEqual(event.event_type, "CREATE")
        self.assertEqual(event.actor, self.manager)

    def test_period_limits_are_inclusive_and_outside_dates_are_rejected(self):
        # Limite inferior do período da escala e do plano (1 de outubro).
        visit = self.create(visit_date=date(2026, 10, 1))
        self.assertEqual(visit.visit_date, date(2026, 10, 1))
        with self.assertRaises(ValidationError):
            self.create(visit_date=date(2026, 9, 30))
        with self.assertRaises(ValidationError):
            self.create(visit_date=date(2026, 12, 1))
        self.create(visit_date=date(2026, 11, 30))  # limite superior da escala
        self.plan.end_date = date(2026, 11, 15)
        self.plan.save(update_fields=["end_date"])
        with self.assertRaises(ValidationError):
            self.create(visit_date=date(2026, 11, 16))

    def test_scale_and_closed_plan_must_be_usable(self):
        self.scale.status = ScaleStatus.SUSPENDED
        self.scale.save(update_fields=["status"])
        with self.assertRaises(ValidationError):
            self.create()
        self.scale.status = ScaleStatus.ACTIVE
        self.scale.save(update_fields=["status"])
        self.plan.status = CarePlanStatus.CLOSED
        self.plan.save(update_fields=["status"])
        with self.assertRaises(ValidationError):
            self.create()

    def test_visit_must_fit_fully_inside_one_weekly_window(self):
        self.create(start_time=time(8), end_time=time(12))
        with self.assertRaises(ValidationError):
            self.create(start_time=time(7, 59), end_time=time(9))
        with self.assertRaises(ValidationError):
            self.create(start_time=time(11), end_time=time(12, 1))
        with self.assertRaises(ValidationError):
            self.create(start_time=time(10), end_time=time(10))

    def test_half_open_conflicts_allow_boundary_and_reject_overlap(self):
        self.create(start_time=time(9), end_time=time(10))
        # Intervalo adjacente: [10, 11), permitido.
        self.create(start_time=time(10), end_time=time(11))
        with self.assertRaises(ValidationError):
            self.create(start_time=time(9, 59), end_time=time(10, 30))

    def test_professional_conflict_is_checked_for_a_different_patient(self):
        other_patient = make_patient(cpf="22233344455")
        Visit.objects.create(
            patient=other_patient, care_plan=self.plan, plan_need=self.link,
            care_scale=self.scale, scale_need=self.scale_need,
            professional=self.professional, visit_date=self.visit_date,
            start_time=time(9), end_time=time(10),
            address_zip_code="01001000", address_state="SP", address_city="São Paulo",
            address_neighborhood="Sé", address_street="Rua B", address_number="20",
        )
        with self.assertRaises(ValidationError) as error:
            self.create()
        self.assertIn("professional", error.exception.detail)

    def test_patient_conflict_is_checked_with_a_different_professional(self):
        ScaleAssignment.objects.create(item=self.scale_need, professional=self.other_professional)
        for weekday in range(7):
            ProfessionalWeeklyAvailability.objects.create(
                professional=self.other_professional, weekday=weekday,
                start_time=time(8), end_time=time(12),
            )
        self.create()
        with self.assertRaises(ValidationError) as error:
            self.create(professional=self.other_professional)
        self.assertIn("patient", error.exception.detail)

    def test_cancelled_and_not_held_visits_do_not_block(self):
        cancelled = self.create(start_time=time(9), end_time=time(10))
        cancelled.status = VisitStatus.CANCELLED
        cancelled.cancellation_reason = "Paciente solicitou"
        cancelled.save(update_fields=["status", "cancellation_reason"])
        self.create(start_time=time(9), end_time=time(10))
        first = Visit.objects.get(status=VisitStatus.SCHEDULED)
        first.status = VisitStatus.NOT_HELD
        first.not_realized_reason = "Paciente indisponível"
        first.save(update_fields=["status", "not_realized_reason"])
        self.create(start_time=time(9), end_time=time(10))

    def test_missing_address_and_missing_create_permission_are_rejected(self):
        PatientAddress.objects.filter(patient=self.patient).delete()
        with self.assertRaises(ValidationError):
            self.create()
        user = self.users[SEM_GRUPO_CPF]
        with self.assertRaises(PermissionDenied):
            self.create(actor=user)


class VisitLifecycleTests(CreateVisitTests):
    def test_series_validates_weekly_frequency_and_keeps_valid_occurrences(self):
        self.create(visit_date=date(2026, 10, 5))
        result = create_visit_series(
            actor=self.manager, scale=self.scale, scale_need=self.scale_need,
            professional=self.professional, visit_dates=[date(2026, 10, 5), date(2026, 10, 7)],
            start_time=time(9), end_time=time(10),
        )
        self.assertEqual(len(result["created"]), 1)
        self.assertEqual(len(result["rejected"]), 1)
        self.assertEqual(result["rejected"][0]["visit_date"], date(2026, 10, 5))
        self.assertTrue(Visit.objects.filter(visit_date=date(2026, 10, 7)).exists())

    def test_series_requires_exact_frequency_in_each_represented_week(self):
        with self.assertRaises(ValidationError):
            create_visit_series(
                actor=self.manager, scale=self.scale, scale_need=self.scale_need,
                professional=self.professional, visit_dates=[date(2026, 10, 5)],
                start_time=time(9), end_time=time(10),
            )
        result = create_visit_series(
            actor=self.manager, scale=self.scale, scale_need=self.scale_need,
            professional=self.professional,
            visit_dates=[date(2026, 10, 5), date(2026, 10, 7), date(2026, 10, 12), date(2026, 10, 14)],
            start_time=time(9), end_time=time(10),
        )
        self.assertEqual(len(result["created"]), 4)

    def test_series_enforces_frequency_per_civil_month(self):
        self.scale_need.frequency_period = "MONTH"
        self.scale_need.save(update_fields=["frequency_period"])
        result = create_visit_series(
            actor=self.manager, scale=self.scale, scale_need=self.scale_need,
            professional=self.professional,
            visit_dates=[date(2026, 10, 5), date(2026, 10, 7),
                         date(2026, 11, 2), date(2026, 11, 4)],
            start_time=time(9), end_time=time(10),
        )
        self.assertEqual(len(result["created"]), 4)
        self.assertEqual(result["rejected"], [])

    def test_edit_updates_snapshot_and_writes_change_history(self):
        visit = self.create()
        edited = edit_visit(actor=self.manager, visit=visit, changes={
            "visit_date": date(2026, 10, 6), "observation": "  Troca de curativo  ",
            "address": {"address_street": "Rua Nova", "address_number": "99"},
        })
        self.assertEqual((edited.visit_date, edited.observation), (date(2026, 10, 6), "Troca de curativo"))
        self.assertEqual((edited.address_street, edited.address_number), ("Rua Nova", "99"))
        event = VisitHistory.objects.get(visit=visit, event_type="UPDATE")
        self.assertEqual(event.actor, self.manager)

    def test_edit_revalidates_conflicts_and_does_not_change_professional(self):
        visit = self.create()
        self.create(visit_date=date(2026, 10, 6), start_time=time(9), end_time=time(10))
        with self.assertRaises(ValidationError):
            edit_visit(actor=self.manager, visit=visit, changes={"visit_date": date(2026, 10, 6)})
        with self.assertRaises(ValidationError):
            edit_visit(actor=self.manager, visit=visit, changes={"professional": self.other_professional})

    def test_transitions_confirmation_cancel_reason_and_terminal_states(self):
        visit = self.create()
        with self.assertRaises(ValidationError):
            transition_visit(actor=self.manager, visit=visit, target_status=VisitStatus.CANCELLED)
        visit = transition_visit(actor=self.manager, visit=visit, target_status=VisitStatus.CONFIRMED)
        self.assertEqual(visit.confirmed_by, self.manager)
        self.assertIsNotNone(visit.confirmed_at)
        nurse = self.users[ENFERMEIRO_CPF]
        self.professional.user = nurse
        self.professional.save(update_fields=["user"])
        nurse.category.permissions.add(GranularPermission.objects.get(codename="visitas.start"))
        visit = transition_visit(actor=nurse, visit=visit, target_status=VisitStatus.IN_PROGRESS)
        start_event = VisitHistory.objects.get(visit=visit, event_type=VisitStatus.IN_PROGRESS)
        self.assertEqual(start_event.actor, nurse)
        self.assertIsNotNone(start_event.changed_at)
        self.assertIsNotNone(visit.started_at)
        self.assertEqual(visit.started_by, nurse)
        with self.assertRaises(ValidationError):
            transition_visit(actor=self.manager, visit=visit, target_status=VisitStatus.CANCELLED, reason="Motivo")
        pending = self.create(visit_date=date(2026, 10, 6))
        cancelled = transition_visit(actor=self.manager, visit=pending, target_status=VisitStatus.CANCELLED, reason="Solicitado pela família")
        self.assertEqual(cancelled.cancellation_reason, "Solicitado pela família")
        with self.assertRaises(ValidationError):
            transition_visit(actor=self.manager, visit=cancelled, target_status=VisitStatus.CONFIRMED)

    def test_not_realized_requires_and_persists_justification_with_operation_permission(self):
        visit = self.create()
        permission = GranularPermission.objects.get(codename="visitas.not_realized")
        self.manager.category.permissions.remove(permission)
        with self.assertRaises(PermissionDenied):
            transition_visit(actor=self.manager, visit=visit, target_status=VisitStatus.NOT_HELD,
                             reason="Paciente ausente")
        self.manager.category.permissions.add(permission)
        with self.assertRaises(ValidationError):
            transition_visit(actor=self.manager, visit=visit, target_status=VisitStatus.NOT_HELD)
        visit = transition_visit(actor=self.manager, visit=visit, target_status=VisitStatus.NOT_HELD,
                                 reason="  Paciente ausente  ")
        self.assertEqual(visit.not_realized_reason, "Paciente ausente")
        event = VisitHistory.objects.get(visit=visit, event_type=VisitStatus.NOT_HELD)
        self.assertEqual(event.new_data["reason"], "Paciente ausente")
        with self.assertRaises(ValidationError):
            transition_visit(actor=self.manager, visit=visit, target_status=VisitStatus.CONFIRMED)

    def test_each_scheduled_transition_uses_its_visit_permission(self):
        for index, (target, codename) in enumerate((
            (VisitStatus.CONFIRMED, "visitas.confirm"),
            (VisitStatus.CANCELLED, "visitas.cancel"),
        )):
            with self.subTest(target=target):
                visit = self.create(visit_date=date(2026, 10, 6 + index))
                permission = GranularPermission.objects.get(codename=codename)
                self.manager.category.permissions.remove(permission)
                with self.assertRaises(PermissionDenied):
                    transition_visit(actor=self.manager, visit=visit, target_status=target,
                                     reason="Motivo necessário")
                self.manager.category.permissions.add(permission)

    def test_delete_is_blocked_and_records_are_preserved(self):
        visit = self.create()
        with self.assertRaises(ValidationError):
            delete_visit(actor=self.manager, visit=visit)
        self.assertTrue(Visit.objects.filter(pk=visit.pk).exists())

    def test_history_events_survive_actor_deletion_and_visit_cannot_be_deleted(self):
        visit = self.create()
        event = VisitHistory.objects.get(visit=visit)
        self.manager.delete()
        event.refresh_from_db()
        self.assertIsNone(event.actor)
        self.assertTrue(event.actor_name)
        self.assertIsNotNone(event.changed_at)
