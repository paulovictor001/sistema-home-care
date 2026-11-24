"""Registro de criação e alterações da avaliação inicial."""

from .models import AssessmentAuditAction, PatientAssessmentAuditLog


def _actor_name(actor):
    if actor is None or not actor.is_authenticated:
        return "Usuário desconhecido"
    return actor.get_full_name() or actor.email or f"Usuário #{actor.pk}"


def _json_value(value):
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return value.isoformat() if hasattr(value, "isoformat") else str(value)


def assessment_snapshot(assessment):
    fields = (
        "patient_id", "professional_id", "assessment_type", "assessment_date",
        "assessment_time", "request_origin", "administrative_observations",
        "request_reason", "chief_complaint", "initial_need_description",
        "need_start_date", "anamnesis", "hda", "current_condition",
        "observations", "relevant_information", "conclusion", "recommendation",
    )
    return {field: _json_value(getattr(assessment, field)) for field in fields}


def log_assessment_event(*, assessment, actor, action, changes):
    user = actor if actor is not None and actor.is_authenticated else None
    return PatientAssessmentAuditLog.objects.create(
        assessment=assessment,
        actor=user,
        actor_name=_actor_name(actor),
        action=action,
        changes=changes,
    )


def log_assessment_creation(*, assessment, actor):
    return log_assessment_event(
        assessment=assessment, actor=actor, action=AssessmentAuditAction.CREATE,
        changes={"new": assessment_snapshot(assessment)},
    )
