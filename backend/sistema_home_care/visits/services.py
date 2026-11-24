"""Regras transacionais de criação de ocorrências de agendamento."""
from collections import Counter
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from care_plans.models import CarePlan, CarePlanStatus
from care_scales.contracts import scheduling_requirement
from care_scales.models import CareScale, ScaleNeed
from patients.models import Patient, PatientAddress
from professionals.models import Professional

from .models import ProfessionalWeeklyAvailability, Visit, VisitHistory, VisitStatus


CONFLICTING_STATUSES = [
    VisitStatus.SCHEDULED,
    VisitStatus.CONFIRMED,
    VisitStatus.IN_PROGRESS,
    VisitStatus.COMPLETED,
]
ADDRESS_FIELDS = {
    "address_zip_code": "zip_code",
    "address_state": "state",
    "address_city": "city",
    "address_neighborhood": "neighborhood",
    "address_street": "street",
    "address_number": "number",
    "address_complement": "complement",
    "address_reference_point": "reference_point",
    "address_region": "region",
}


def _require_create_permission(actor):
    if not actor or not actor.is_authenticated or not actor.is_active:
        raise PermissionDenied("Usuário autenticado e ativo é obrigatório.")
    if actor.is_superuser:
        return
    category = getattr(actor, "category", None)
    if category is None or not category.permissions.filter(
        codename="agendamentos.create"
    ).exists():
        raise PermissionDenied("Sua categoria não tem permissão para criar agendamentos.")


def _resolve_scale_need(scale, scale_need):
    try:
        item = ScaleNeed.objects.select_for_update().select_related(
            "scale", "plan_need", "plan_need__care_plan"
        ).get(pk=getattr(scale_need, "pk", scale_need), scale=scale, removed_at__isnull=True)
    except (ScaleNeed.DoesNotExist, TypeError, ValueError):
        raise ValidationError({"scale_need": "Selecione uma necessidade vigente desta escala."})
    return item


def _snapshot_address(patient):
    try:
        address = PatientAddress.objects.get(patient=patient)
    except PatientAddress.DoesNotExist:
        raise ValidationError({"address": "Cadastre o endereço do paciente antes de agendar."})
    return {visit_field: getattr(address, address_field) for visit_field, address_field in ADDRESS_FIELDS.items()}


def _validate_availability(professional, visit_date, start_time, end_time):
    available = ProfessionalWeeklyAvailability.objects.filter(
        professional=professional,
        weekday=visit_date.weekday(),
        start_time__lte=start_time,
        end_time__gte=end_time,
    ).exists()
    if not available:
        raise ValidationError({
            "availability": "O horário deve estar integralmente dentro de uma janela semanal do profissional."
        })


def _validate_conflicts(patient, professional, visit_date, start_time, end_time, exclude_visit_id=None):
    overlaps = Visit.objects.filter(
        visit_date=visit_date,
        start_time__lt=end_time,
        end_time__gt=start_time,
        status__in=CONFLICTING_STATUSES,
    )
    if exclude_visit_id is not None:
        overlaps = overlaps.exclude(pk=exclude_visit_id)
    if overlaps.filter(patient=patient).exists():
        raise ValidationError({"patient": "O paciente já possui uma visita nesse horário."})
    if overlaps.filter(professional=professional).exists():
        raise ValidationError({"professional": "O profissional já possui uma visita nesse horário."})


@transaction.atomic
def create_visit(*, actor, scale, scale_need, professional, visit_date,
                 start_time, end_time, observation="", visit_type="Atendimento domiciliar"):
    """Cria uma ocorrência após validar Escala, Plano, disponibilidade e conflitos."""
    _require_create_permission(actor)
    scale_id = getattr(scale, "pk", scale)
    try:
        locked_scale = CareScale.objects.select_for_update().select_related(
            "patient", "care_plan"
        ).get(pk=scale_id, deleted_at__isnull=True)
    except (CareScale.DoesNotExist, TypeError, ValueError):
        raise ValidationError({"scale": "Escala não encontrada ou removida."})

    # O contrato confirma escala ativa, necessidades e profissionais vigentes.
    requirement = scheduling_requirement(locked_scale)
    item = _resolve_scale_need(locked_scale, scale_need)
    link = item.plan_need
    plan = CarePlan.objects.select_for_update().get(pk=locked_scale.care_plan_id)
    patient = Patient.objects.select_for_update().get(pk=locked_scale.patient_id)
    try:
        professional_id = getattr(professional, "pk", professional)
        professional = Professional.objects.select_for_update().get(pk=professional_id)
    except (Professional.DoesNotExist, TypeError, ValueError):
        raise ValidationError({"professional": "Selecione um profissional vigente na necessidade da escala."})

    valid_ids = {entry["id"]: entry["professional_ids"] for entry in requirement["items"]}
    if item.pk not in valid_ids or professional.pk not in valid_ids[item.pk]:
        raise ValidationError({"professional": "O profissional deve possuir vínculo vigente nesta necessidade da escala."})
    if plan.status == CarePlanStatus.CLOSED:
        raise ValidationError({"care_plan": "Não é possível agendar em um plano encerrado."})
    if plan.status != CarePlanStatus.ACTIVE:
        raise ValidationError({"care_plan": "O plano de cuidados deve estar ativo."})
    if link.removed_at:
        raise ValidationError({"plan_need": "A necessidade foi removida do plano."})

    if visit_date is None:
        raise ValidationError({"visit_date": "Informe a data da visita."})
    if visit_date < plan.start_date or (plan.end_date and visit_date > plan.end_date):
        raise ValidationError({"visit_date": "A data deve estar dentro do período do Plano, inclusive."})
    if not locked_scale.start_date or not locked_scale.end_date or not (
        locked_scale.start_date <= visit_date <= locked_scale.end_date
    ):
        raise ValidationError({"visit_date": "A data deve estar dentro do período da Escala, inclusive."})
    if start_time is None or end_time is None or start_time >= end_time:
        raise ValidationError({"time": "O início deve ser anterior ao fim."})

    # Data e horário são civis em America/Sao_Paulo; não há conversão UTC.
    _validate_availability(professional, visit_date, start_time, end_time)
    _validate_conflicts(patient, professional, visit_date, start_time, end_time)
    address_snapshot = _snapshot_address(patient)
    visit_type = (visit_type or "Atendimento domiciliar").strip()
    if visit_type != "Atendimento domiciliar":
        raise ValidationError({"visit_type": "O tipo deve ser Atendimento domiciliar."})

    visit = Visit.objects.create(
        patient=patient, care_plan=plan, plan_need=link, care_scale=locked_scale,
        scale_need=item, professional=professional, visit_date=visit_date,
        start_time=start_time, end_time=end_time, visit_type=visit_type,
        status=VisitStatus.SCHEDULED, observation=(observation or "").strip(),
        created_by=actor, **address_snapshot,
    )
    VisitHistory.objects.create(
        visit=visit, actor=actor,
        actor_name=actor.get_full_name() or f"Usuário #{actor.pk}",
        event_type="CREATE",
        new_data={
            "status": VisitStatus.SCHEDULED,
            "visit_date": visit_date.isoformat(),
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "professional_id": professional.pk,
        },
    )
    return visit


def _require_permission(actor, codename):
    if not actor or not actor.is_authenticated or not actor.is_active:
        raise PermissionDenied("Usuário autenticado e ativo é obrigatório.")
    if actor.is_superuser:
        return
    category = getattr(actor, "category", None)
    if category is None or not category.permissions.filter(codename=codename).exists():
        raise PermissionDenied(f"Sua categoria não tem permissão para {codename}.")


def _period_key(day, period):
    if period == "WEEK":
        return (day.isocalendar().year, day.isocalendar().week)
    if period == "MONTH":
        return (day.year, day.month)
    return day


def create_visit_series(*, actor, scale, scale_need, professional, visit_dates,
                        start_time, end_time, observation="", visit_type="Atendimento domiciliar"):
    """Valida a frequência da série e grava cada data válida independentemente."""
    _require_permission(actor, "agendamentos.create")
    dates = list(visit_dates)
    if not dates:
        raise ValidationError({"visit_dates": "Informe ao menos uma data para a série."})
    item_id = getattr(scale_need, "pk", scale_need)
    try:
        item = ScaleNeed.objects.select_related("plan_need").get(pk=item_id)
    except (ScaleNeed.DoesNotExist, TypeError, ValueError):
        raise ValidationError({"scale_need": "Necessidade inválida."})
    period, quantity = item.frequency_period, item.frequency_quantity
    if period not in ("WEEK", "MONTH") or not quantity:
        raise ValidationError({"frequency": "A necessidade deve ter frequência semanal ou mensal configurada."})
    counts = Counter(_period_key(day, period) for day in dates)
    if any(count != quantity for count in counts.values()):
        raise ValidationError({"visit_dates": f"Informe exatamente {quantity} data(s) em cada período {period.lower()} representado."})
    created, rejected = [], []
    for visit_date in dates:
        try:
            visit = create_visit(
                actor=actor, scale=scale, scale_need=scale_need, professional=professional,
                visit_date=visit_date, start_time=start_time, end_time=end_time,
                observation=observation, visit_type=visit_type,
            )
            created.append(visit)
        except (ValidationError, PermissionDenied) as exc:
            detail = getattr(exc, "detail", str(exc))
            rejected.append({"visit_date": visit_date, "errors": detail})
    return {"created": created, "rejected": rejected}


@transaction.atomic
def edit_visit(*, actor, visit, changes):
    _require_permission(actor, "agendamentos.update")
    visit_id = getattr(visit, "pk", visit)
    try:
        current = Visit.objects.select_for_update().select_related(
            "care_scale", "scale_need", "care_plan", "patient", "professional"
        ).get(pk=visit_id)
    except (Visit.DoesNotExist, TypeError, ValueError):
        raise ValidationError({"visit": "Visita não encontrada."})
    if current.status != VisitStatus.SCHEDULED:
        raise ValidationError({"status": "Somente visitas agendadas podem ser editadas."})
    allowed = {"visit_date", "start_time", "end_time", "visit_type", "observation", "address"}
    unknown = set(changes) - allowed
    if unknown:
        raise ValidationError({key: "Campo não editável." for key in unknown})
    previous = {key: getattr(current, key) for key in changes if key != "address"}
    if "address" in changes:
        previous["address"] = {field: getattr(current, field) for field in ADDRESS_FIELDS}
    for key, value in changes.items():
        setattr(current, key, value.strip() if key in {"visit_type", "observation"} and isinstance(value, str) else value)
    if current.start_time is None or current.end_time is None or current.start_time >= current.end_time:
        raise ValidationError({"time": "O início deve ser anterior ao fim."})
    if current.visit_type != "Atendimento domiciliar":
        raise ValidationError({"visit_type": "O tipo deve ser Atendimento domiciliar."})
    if not (current.care_plan.start_date <= current.visit_date and
            (not current.care_plan.end_date or current.visit_date <= current.care_plan.end_date) and
            current.care_scale.start_date <= current.visit_date <= current.care_scale.end_date):
        raise ValidationError({"visit_date": "A data deve estar dentro dos períodos do Plano e da Escala, inclusive."})
    _validate_availability(current.professional, current.visit_date, current.start_time, current.end_time)
    _validate_conflicts(current.patient, current.professional, current.visit_date,
                        current.start_time, current.end_time, exclude_visit_id=current.pk)
    if "address" in changes:
        snapshot = changes["address"]
        if set(snapshot) - set(ADDRESS_FIELDS):
            raise ValidationError({"address": "Snapshot contém campos inválidos."})
        for field in ADDRESS_FIELDS:
            if field in snapshot:
                setattr(current, field, snapshot[field])
    current.save()
    VisitHistory.objects.create(
        visit=current, actor=actor, actor_name=actor.get_full_name() or f"Usuário #{actor.pk}",
        event_type="UPDATE", previous_data={key: value.isoformat() if hasattr(value, "isoformat") else value for key, value in previous.items()},
        new_data={
            **{key: getattr(current, key).isoformat() if hasattr(getattr(current, key), "isoformat") else getattr(current, key) for key in changes if key != "address"},
            **({"address": {field: getattr(current, field) for field in ADDRESS_FIELDS}} if "address" in changes else {}),
        },
    )
    return current


@transaction.atomic
def transition_visit(*, actor, visit, target_status, reason=""):
    permissions = {
        VisitStatus.CONFIRMED: "visitas.confirm",
        VisitStatus.CANCELLED: "visitas.cancel",
        VisitStatus.NOT_HELD: "visitas.not_realized",
        VisitStatus.IN_PROGRESS: "visitas.start",
    }
    permission = permissions.get(target_status)
    if permission is None:
        raise ValidationError({"status": "Estado operacional inválido."})
    _require_permission(actor, permission)
    visit_id = getattr(visit, "pk", visit)
    try:
        current = Visit.objects.select_for_update().get(pk=visit_id)
    except (Visit.DoesNotExist, TypeError, ValueError):
        raise ValidationError({"visit": "Visita não encontrada."})
    allowed = {
        VisitStatus.SCHEDULED: {VisitStatus.CONFIRMED, VisitStatus.CANCELLED, VisitStatus.NOT_HELD},
        VisitStatus.CONFIRMED: {VisitStatus.IN_PROGRESS, VisitStatus.CANCELLED, VisitStatus.NOT_HELD},
        # REALIZADA é registrada pelo processo Atendimento, nunca por Agendamento.
    }
    if target_status not in allowed.get(current.status, set()):
        raise ValidationError({"status": "Transição de estado não permitida."})
    if target_status == VisitStatus.IN_PROGRESS:
        _require_responsible_professional(actor, current)
    reason = (reason or "").strip()
    if target_status == VisitStatus.CANCELLED and not reason:
        raise ValidationError({"reason": "Informe o motivo do cancelamento."})
    if target_status == VisitStatus.NOT_HELD and not reason:
        raise ValidationError({"reason": "Informe a justificativa da não realização."})
    previous = current.status
    current.status = target_status
    if target_status == VisitStatus.CANCELLED:
        current.cancellation_reason = reason
    if target_status == VisitStatus.NOT_HELD:
        current.not_realized_reason = reason
    if target_status == VisitStatus.CONFIRMED:
        current.confirmed_by = actor
        current.confirmed_at = timezone.now()
    if target_status == VisitStatus.IN_PROGRESS:
        current.started_by = actor
        current.started_at = timezone.now()
    current.save()
    VisitHistory.objects.create(
        visit=current, actor=actor, actor_name=actor.get_full_name() or f"Usuário #{actor.pk}",
        event_type=target_status, previous_data={"status": previous},
        new_data={"status": target_status, **({"reason": reason} if reason else {})},
    )
    return current


def _require_responsible_professional(actor, visit):
    if not actor or not actor.is_authenticated or not actor.is_active:
        raise PermissionDenied("Usuário autenticado e ativo é obrigatório.")
    try:
        professional = actor.professional
    except Professional.DoesNotExist:
        professional = None
    if (professional is None or not professional.is_active or professional.user_id != actor.pk
            or professional.pk != visit.professional_id):
        raise PermissionDenied("Somente o profissional responsável pode operar esta visita.")


def delete_visit(*, actor, visit):
    """Exclusão está vedada; delete permission permanece somente por compatibilidade."""
    _require_permission(actor, "agendamentos.delete")
    raise ValidationError({"detail": "Agendamentos não podem ser excluídos; cancele a visita com motivo."})
