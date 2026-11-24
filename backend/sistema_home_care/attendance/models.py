from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Attendance(models.Model):
    """Registro mínimo dos cuidados efetivamente realizados em uma visita."""

    visit = models.OneToOneField(
        "visits.Visit", on_delete=models.PROTECT, related_name="attendance"
    )
    care_description = models.TextField()
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="created_attendances",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "attendances"
        ordering = ["-created_at", "-pk"]
        constraints = [
            models.CheckConstraint(
                condition=~models.Q(care_description=""),
                name="attendance_description_required",
            ),
        ]

    def clean(self):
        super().clean()
        self.care_description = (self.care_description or "").strip()
        if not self.care_description:
            raise ValidationError({"care_description": "Descreva os cuidados realizados."})

    def save(self, *args, **kwargs):
        self.care_description = (self.care_description or "").strip()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"Atendimento da visita #{self.visit_id}"


class AttendanceHistory(models.Model):
    attendance = models.ForeignKey(
        Attendance, on_delete=models.PROTECT, related_name="history"
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL,
        related_name="attendance_history_events",
    )
    actor_name = models.CharField(max_length=255, blank=True)
    event_type = models.CharField(max_length=30)
    changed_at = models.DateTimeField(auto_now_add=True)
    previous_data = models.JSONField(default=dict, blank=True)
    new_data = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "attendance_history"
        ordering = ["-changed_at", "-pk"]

    def __str__(self):
        return f"Histórico #{self.pk} do atendimento {self.attendance_id}"
