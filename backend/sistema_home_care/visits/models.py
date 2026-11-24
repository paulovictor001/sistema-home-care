from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q


class VisitStatus(models.TextChoices):
    SCHEDULED = "AGENDADA", "Agendada"
    CONFIRMED = "CONFIRMADA", "Confirmada"
    IN_PROGRESS = "EM_ATENDIMENTO", "Em atendimento"
    COMPLETED = "REALIZADA", "Realizada"
    CANCELLED = "CANCELADA", "Cancelada"
    NOT_HELD = "NAO_REALIZADA", "Não realizada"


class ProfessionalWeeklyAvailability(models.Model):
    """Uma janela recorrente de disponibilidade para um dia da semana."""

    class Weekday(models.IntegerChoices):
        MONDAY = 0, "Segunda-feira"
        TUESDAY = 1, "Terça-feira"
        WEDNESDAY = 2, "Quarta-feira"
        THURSDAY = 3, "Quinta-feira"
        FRIDAY = 4, "Sexta-feira"
        SATURDAY = 5, "Sábado"
        SUNDAY = 6, "Domingo"

    professional = models.ForeignKey(
        "professionals.Professional",
        on_delete=models.CASCADE,
        related_name="weekly_availability_windows",
    )
    weekday = models.PositiveSmallIntegerField(choices=Weekday.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "professional_weekly_availability"
        ordering = ["professional_id", "weekday", "start_time", "pk"]
        constraints = [
            models.CheckConstraint(
                condition=Q(weekday__gte=0, weekday__lte=6),
                name="weekly_availability_valid_weekday",
            ),
            models.CheckConstraint(
                condition=Q(start_time__lt=F("end_time")),
                name="weekly_availability_positive_window",
            ),
        ]

    def __str__(self):
        return f"{self.professional} — {self.get_weekday_display()} {self.start_time}-{self.end_time}"


class Visit(models.Model):
    """Ocorrência agendada, preservando os dados usados no momento da criação."""

    patient = models.ForeignKey("patients.Patient", on_delete=models.PROTECT, related_name="visits")
    care_plan = models.ForeignKey("care_plans.CarePlan", on_delete=models.PROTECT, related_name="visits")
    plan_need = models.ForeignKey("care_plans.CarePlanNeed", on_delete=models.PROTECT, related_name="visits")
    care_scale = models.ForeignKey("care_scales.CareScale", on_delete=models.PROTECT, related_name="visits")
    scale_need = models.ForeignKey("care_scales.ScaleNeed", on_delete=models.PROTECT, related_name="visits")
    professional = models.ForeignKey("professionals.Professional", on_delete=models.PROTECT, related_name="visits")

    visit_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    visit_type = models.CharField(max_length=40, default="Atendimento domiciliar")
    status = models.CharField(max_length=20, choices=VisitStatus.choices, default=VisitStatus.SCHEDULED)
    observation = models.TextField(blank=True)

    # Snapshot completo: mudanças posteriores no endereço do paciente não alteram a visita.
    address_zip_code = models.CharField(max_length=20)
    address_state = models.CharField(max_length=2)
    address_city = models.CharField(max_length=100)
    address_neighborhood = models.CharField(max_length=100)
    address_street = models.CharField(max_length=255)
    address_number = models.CharField(max_length=20)
    address_complement = models.CharField(max_length=255, blank=True)
    address_reference_point = models.CharField(max_length=255, blank=True)
    address_region = models.CharField(max_length=100, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="created_visits",
    )
    confirmed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="confirmed_visits",
    )
    confirmed_at = models.DateTimeField(null=True, blank=True)
    started_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="started_visits",
    )
    started_at = models.DateTimeField(null=True, blank=True)
    finished_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="finished_visits",
    )
    finished_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True)
    not_realized_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "visits"
        ordering = ["visit_date", "start_time", "pk"]
        constraints = [
            models.CheckConstraint(
                condition=Q(start_time__lt=F("end_time")), name="visit_positive_time_window"
            ),
            models.CheckConstraint(
                condition=Q(status__in=VisitStatus.values), name="visit_valid_status"
            ),
            models.CheckConstraint(
                condition=Q(status=VisitStatus.CANCELLED, cancellation_reason__gt="")
                | ~Q(status=VisitStatus.CANCELLED),
                name="cancelled_visit_requires_reason",
            ),
            models.CheckConstraint(
                condition=Q(status=VisitStatus.NOT_HELD, not_realized_reason__gt="")
                | ~Q(status=VisitStatus.NOT_HELD),
                name="not_held_visit_requires_reason",
            ),
        ]

    def clean(self):
        super().clean()
        if self.status == VisitStatus.CANCELLED:
            self.cancellation_reason = (self.cancellation_reason or "").strip()
            if not self.cancellation_reason:
                raise ValidationError({"cancellation_reason": "Informe o motivo do cancelamento."})
        if self.status == VisitStatus.NOT_HELD:
            self.not_realized_reason = (self.not_realized_reason or "").strip()
            if not self.not_realized_reason:
                raise ValidationError({"not_realized_reason": "Informe a justificativa da não realização."})

    def __str__(self):
        return f"Visita #{self.pk} — {self.visit_date} {self.start_time}"


class VisitHistory(models.Model):
    visit = models.ForeignKey(Visit, on_delete=models.PROTECT, related_name="history")
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="visit_history_events",
    )
    actor_name = models.CharField(max_length=255, blank=True)
    event_type = models.CharField(max_length=30)
    changed_at = models.DateTimeField(auto_now_add=True)
    previous_data = models.JSONField(default=dict, blank=True)
    new_data = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "visit_history"
        ordering = ["-changed_at", "-pk"]

    def __str__(self):
        return f"Histórico #{self.pk} da visita {self.visit_id}"
