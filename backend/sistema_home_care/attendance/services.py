from django.db import transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from visits.models import Visit, VisitHistory, VisitStatus
from visits.services import _require_responsible_professional

from .models import Attendance, AttendanceHistory


def _require_permission(actor, action):
    if not actor or not actor.is_authenticated or not actor.is_active:
        raise PermissionDenied("Usuário autenticado e ativo é obrigatório.")
    if actor.is_superuser:
        return
    category = getattr(actor, "category", None)
    if category is None or not category.permissions.filter(
        codename=f"atendimentos.{action}"
    ).exists():
        raise PermissionDenied(f"Sua categoria não tem permissão para atendimentos.{action}.")


def _actor_name(actor):
    return actor.get_full_name() or f"Usuário #{actor.pk}"


def _locked_visit(visit):
    visit_id = getattr(visit, "pk", visit)
    try:
        return Visit.objects.select_for_update().select_related(
            "professional", "professional__user"
        ).get(pk=visit_id)
    except (Visit.DoesNotExist, TypeError, ValueError):
        raise ValidationError({"visit": "Visita não encontrada."})


@transaction.atomic
def save_attendance(*, actor, visit, expected_operation=None, care_description=None, notes=None):
    """Cria ou atualiza o registro mínimo da visita em andamento."""
    current_visit = _locked_visit(visit)
    _require_responsible_professional(actor, current_visit)
    if current_visit.status != VisitStatus.IN_PROGRESS:
        raise ValidationError({"status": "O atendimento só pode ser registrado durante uma visita em andamento."})

    try:
        record = Attendance.objects.select_for_update().get(visit=current_visit)
        creating = False
    except Attendance.DoesNotExist:
        record = Attendance(visit=current_visit)
        creating = True
    if expected_operation == "create" and not creating:
        raise ValidationError({"attendance": "Esta visita já possui um Atendimento registrado."})
    if expected_operation == "update" and creating:
        raise ValidationError({"attendance": "Registre o Atendimento antes de atualizá-lo."})
    _require_permission(actor, "create" if creating else "update")

    previous = {} if creating else {
        "care_description": record.care_description,
        "notes": record.notes,
    }
    if care_description is not None:
        record.care_description = care_description
    if notes is not None:
        record.notes = notes
    try:
        record.full_clean()
    except DjangoValidationError as exc:
        raise ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
    if creating:
        record.created_by = actor
    record.save()

    new_data = {"care_description": record.care_description, "notes": record.notes}
    AttendanceHistory.objects.create(
        attendance=record, actor=actor, actor_name=_actor_name(actor),
        event_type="CREATED" if creating else "UPDATED",
        previous_data=previous, new_data=new_data,
    )
    return record


@transaction.atomic
def finish_visit_with_attendance(*, actor, visit):
    """Conclui a visita somente depois de validar e auditar o atendimento."""
    current_visit = _locked_visit(visit)
    if not actor or not actor.is_authenticated or not actor.is_active:
        raise PermissionDenied("Usuário autenticado e ativo é obrigatório.")
    if not actor.is_superuser:
        category = getattr(actor, "category", None)
        if category is None or not category.permissions.filter(codename="visitas.finish").exists():
            raise PermissionDenied("Sua categoria não tem permissão para visitas.finish.")
    _require_responsible_professional(actor, current_visit)
    if current_visit.status != VisitStatus.IN_PROGRESS:
        raise ValidationError({"status": "Somente visitas em atendimento podem ser concluídas."})
    try:
        attendance = Attendance.objects.select_for_update().get(visit=current_visit)
    except Attendance.DoesNotExist:
        raise ValidationError({"attendance": "Registre os cuidados realizados antes de concluir a visita."})
    try:
        attendance.full_clean()
    except DjangoValidationError as exc:
        raise ValidationError({"attendance": exc.message_dict if hasattr(exc, "message_dict") else exc.messages})

    current_visit.status = VisitStatus.COMPLETED
    current_visit.finished_at = timezone.now()
    current_visit.finished_by = actor
    current_visit.save(update_fields=["status", "finished_at", "finished_by", "updated_at"])
    VisitHistory.objects.create(
        visit=current_visit, actor=actor, actor_name=_actor_name(actor),
        event_type=VisitStatus.COMPLETED,
        previous_data={"status": VisitStatus.IN_PROGRESS},
        new_data={"status": VisitStatus.COMPLETED, "attendance_id": attendance.pk,
                  "finished_at": current_visit.finished_at.isoformat()},
    )
    return current_visit
