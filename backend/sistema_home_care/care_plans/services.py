"""Operações transacionais do plano; modelos mantêm registros históricos."""
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone
from assessments.models import CareNeed
from patients.models import Patient
from .models import CarePlan, CarePlanNeed, CarePlanHistory, CarePlanStatus


def require_role(actor, *roles):
    if not actor or not actor.is_authenticated or not actor.is_active or not actor.groups.filter(name__in=roles).exists():
        raise PermissionDenied('Seu perfil não pode realizar esta operação.')


def snapshot(plan):
    return {
        'id': plan.pk, 'patient': plan.patient_id, 'status': plan.status,
        'start_date': plan.start_date.isoformat(),
        'end_date': plan.end_date.isoformat() if plan.end_date else None,
        'objective': plan.objective,
        'needs': [{
            'id': link.pk, 'care_need_id': link.care_need_id,
            'description': link.care_need.description, 'priority': link.care_need.priority,
            'required_professional_id': link.required_professional_id,
            'frequency_quantity': link.frequency_quantity, 'frequency_period': link.frequency_period,
            'removed_at': link.removed_at.isoformat() if link.removed_at else None,
            'removal_reason': link.removal_reason, 'removed_by': link.removed_by_id,
            'resources': list(link.resources.values('id', 'resource_id', 'quantity', 'observation')),
        } for link in plan.need_links.select_related('care_need').order_by('pk')],
    }


def record(plan, actor, description, previous):
    CarePlanHistory.objects.create(care_plan=plan, changed_by=actor,
        description=description, previous_data=previous, new_data=snapshot(plan))


def lock_plan(plan):
    # Serializa operações do mesmo paciente nos bancos com row locks.
    # SQLite serializa escritas; a unicidade condicional protege a ativação.
    Patient.objects.select_for_update().get(pk=plan.patient_id)
    return CarePlan.objects.select_for_update().get(pk=plan.pk)


def validate_need(plan, need):
    if need.assessment.patient_id != plan.patient_id or not need.is_active or need.status != 'IDENTIFIED':
        raise ValidationError({'care_need': 'Selecione uma necessidade identificada ativa do paciente.'})
    if plan.status == 'ACTIVE' and CarePlanNeed.objects.filter(care_need=need,
            removed_at__isnull=True, care_plan__status='ACTIVE').exclude(care_plan=plan).exists():
        raise ValidationError({'care_need': 'A necessidade já está vinculada a outro plano ativo.'})


@transaction.atomic
def attach_need(*, actor, plan, need):
    require_role(actor, 'MEDICO')
    plan = lock_plan(plan)
    need = CareNeed.objects.select_for_update().get(pk=need.pk)
    validate_need(plan, need)
    before = snapshot(plan)
    link = CarePlanNeed.objects.create(care_plan=plan, care_need=need)
    plan.updated_by = actor
    plan.save(update_fields=['updated_by', 'updated_at'])
    record(plan, actor, 'Inclusão de necessidade', before)
    return link


@transaction.atomic
def change_status(*, actor, plan, target):
    plan = lock_plan(plan)
    transitions = {
        (CarePlanStatus.DRAFT, CarePlanStatus.ACTIVE): ('MEDICO',),
        (CarePlanStatus.ACTIVE, CarePlanStatus.CLOSED): ('MEDICO', 'ENFERMEIRO'),
        (CarePlanStatus.CLOSED, CarePlanStatus.ACTIVE): ('MEDICO', 'ENFERMEIRO'),
    }
    roles = transitions.get((plan.status, target))
    if roles is None:
        raise ValidationError({'status': 'Transição de status inválida.'})
    require_role(actor, *roles)
    if target == CarePlanStatus.ACTIVE:
        links = list(plan.need_links.filter(removed_at__isnull=True).select_related('care_need__assessment'))
        if not links:
            raise ValidationError({'needs': 'O plano precisa de ao menos uma necessidade.'})
        for link in links:
            validate_need(plan, link.care_need)
            if not link.required_professional_id or not link.frequency_quantity or not link.frequency_period:
                raise ValidationError({'needs': 'Configure profissional e frequência de todas as necessidades antes de ativar.'})
    before = snapshot(plan)
    plan.status = target
    plan.updated_by = actor
    plan.full_clean()
    plan.save(update_fields=['status', 'updated_by', 'updated_at'])
    record(plan, actor, f'Status: {before["status"]} → {target}', before)
    return plan


def close_plan(*, actor, plan):
    """Encerramento preserva datas informadas, vínculos e situação clínica."""
    return change_status(actor=actor, plan=plan, target=CarePlanStatus.CLOSED)


@transaction.atomic
def remove_need(*, actor, link, reason):
    require_role(actor, 'MEDICO')
    reason = (reason or '').strip()
    if not reason:
        raise ValidationError({'reason': 'Informe o motivo da remoção.'})
    plan = lock_plan(link.care_plan)
    link = CarePlanNeed.objects.select_for_update().get(pk=link.pk, care_plan=plan)
    if link.removed_at:
        raise ValidationError({'need': 'Este vínculo já foi removido.'})
    before = snapshot(plan)
    link.removed_at = timezone.now()
    link.removal_reason = reason
    link.removed_by = actor
    link.save(update_fields=['removed_at', 'removal_reason', 'removed_by', 'updated_at'])
    plan.updated_by = actor
    plan.save(update_fields=['updated_by', 'updated_at'])
    record(plan, actor, f'Remoção de necessidade: {reason}', before)
    return link


@transaction.atomic
def create_plan(*, actor, patient=None, start_date=None, needs=None, objective='', end_date=None):
    require_role(actor, 'MEDICO')
    needs = list(needs or [])
    errors = {}
    if patient is None:
        errors['patient'] = 'Informe o paciente.'
    if start_date is None:
        errors['start_date'] = 'Informe a data de início.'
    if not needs:
        errors['needs'] = 'Selecione ao menos uma necessidade identificada.'
    if errors:
        raise ValidationError(errors)
    Patient.objects.select_for_update().get(pk=patient.pk)
    if len({need.pk for need in needs}) != len(needs):
        raise ValidationError({'needs': 'Não repita a mesma necessidade.'})
    for need in needs:
        if not need.is_active or need.status != 'IDENTIFIED' or need.assessment.patient_id != patient.pk:
            raise ValidationError({'needs': 'Selecione necessidades identificadas ativas do paciente.'})
    plan = CarePlan(patient=patient, start_date=start_date, objective=objective,
                    end_date=end_date, created_by=actor, updated_by=actor)
    plan.full_clean()
    plan.save()
    for need in needs:
        CarePlanNeed.objects.create(care_plan=plan, care_need=need)
    record(plan, actor, 'Criação do plano', {})
    return plan
