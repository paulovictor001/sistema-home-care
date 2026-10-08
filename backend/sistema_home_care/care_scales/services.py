from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import CareScale, ScaleNeed, ScaleAssignment, ScaleSubstitution
from professionals.models import Professional
from django.shortcuts import get_object_or_404
from .permissions import require_scale_permission
from care_plans.models import CarePlan, CarePlanNeed
from care_plans.models import FrequencyPeriod
from patients.models import Patient


def validate_relationship(patient, care_plan):
    if patient is None or care_plan is None:
        raise ValidationError('Paciente e plano são obrigatórios.')
    Patient.objects.select_for_update().get(pk=patient.pk)
    care_plan = CarePlan.objects.select_for_update().get(pk=care_plan.pk)
    if care_plan.patient_id != patient.pk:
        raise ValidationError({'care_plan': 'O plano deve pertencer ao paciente da escala.'})
    return care_plan


def validate_period(start_date, end_date, plan):
    if start_date is None or end_date is None:
        raise ValidationError({'period': 'Início e fim da escala são obrigatórios.'})
    if end_date < start_date:
        raise ValidationError({'end_date': 'O fim não pode anteceder o início.'})
    if start_date < plan.start_date or (plan.end_date and end_date > plan.end_date):
        raise ValidationError({'period': 'O período da escala deve estar dentro do plano.'})


@transaction.atomic
def create_scale(*, actor, **data):
    require_scale_permission(actor, 'create')
    data['care_plan'] = validate_relationship(data.get('patient'), data.get('care_plan'))
    validate_period(data.get('start_date'), data.get('end_date'), data['care_plan'])
    return CareScale.objects.create(created_by=actor, updated_by=actor, **data)


def locked_scale(scale):
    validate_relationship(scale.patient, scale.care_plan)
    return CareScale.objects.select_for_update().get(pk=scale.pk, deleted_at__isnull=True)


@transaction.atomic
def update_scale(*, actor, scale, data):
    require_scale_permission(actor, 'update', scale)
    scale = locked_scale(scale)
    patient = data.get('patient', scale.patient)
    plan = validate_relationship(patient, data.get('care_plan', scale.care_plan))
    if (patient.pk != scale.patient_id or plan.pk != scale.care_plan_id) and scale.items.exists():
        raise ValidationError('Uma escala com necessidades não pode trocar de paciente ou plano.')
    validate_period(data.get('start_date', scale.start_date), data.get('end_date', scale.end_date), plan)
    for field, value in data.items():
        if field not in ('patient', 'care_plan', 'start_date', 'end_date', 'observation'):
            raise ValidationError({field: 'Campo não editável.'})
        setattr(scale, field, value)
    scale.updated_by = actor
    scale.save()
    return scale


@transaction.atomic
def delete_scale(*, actor, scale):
    require_scale_permission(actor, 'delete', scale)
    scale = locked_scale(scale)
    scale.deleted_at = timezone.now()
    scale.updated_by = actor
    scale.save(update_fields=['deleted_at', 'updated_by', 'updated_at'])


@transaction.atomic
def add_need(*, actor, scale, plan_need):
    require_scale_permission(actor, 'update', scale)
    scale = locked_scale(scale)
    link = CarePlanNeed.objects.select_for_update().select_related('required_professional').get(pk=plan_need.pk)
    if link.care_plan_id != scale.care_plan_id or link.removed_at:
        raise ValidationError({'plan_need': 'Selecione uma necessidade vigente do plano desta escala.'})
    if scale.items.filter(plan_need=link, removed_at__isnull=True).exists():
        raise ValidationError({'plan_need': 'A necessidade já está na escala.'})
    item = ScaleNeed.objects.create(scale=scale, plan_need=link,
        required_profession_id=link.required_professional.profession_id if link.required_professional_id else None,
        planned_quantity=link.frequency_quantity, planned_period=link.frequency_period,
        frequency_quantity=link.frequency_quantity, frequency_period=link.frequency_period)
    scale.updated_by = actor
    scale.save(update_fields=['updated_by', 'updated_at'])
    return item


@transaction.atomic
def remove_need(*, actor, scale, item_id):
    require_scale_permission(actor, 'update', scale)
    scale = locked_scale(scale)
    from django.shortcuts import get_object_or_404
    item = get_object_or_404(scale.items.select_for_update(), pk=item_id, removed_at__isnull=True)
    item.removed_at = timezone.now()
    item.save(update_fields=['removed_at', 'updated_at'])
    item.assignments.filter(removed_at__isnull=True).update(removed_at=item.removed_at)
    scale.updated_by = actor
    scale.save(update_fields=['updated_by', 'updated_at'])
    return item


def current_item(scale, item_id):
    return get_object_or_404(scale.items.select_for_update(), pk=item_id, removed_at__isnull=True)


def assign(item, professional):
    professional = Professional.objects.select_for_update().get(pk=professional.pk)
    if not professional.is_active:
        raise ValidationError({'professional': 'Selecione um profissional ativo.'})
    if not item.required_profession_id or professional.profession_id != item.required_profession_id:
        raise ValidationError({'professional': 'A profissão deve ser compatível com a necessidade do plano.'})
    if item.assignments.filter(professional=professional, removed_at__isnull=True).exists():
        raise ValidationError({'professional': 'O profissional já está vinculado à necessidade.'})
    return ScaleAssignment.objects.create(item=item, professional=professional)


@transaction.atomic
def add_professional(*, actor, scale, item_id, professional):
    require_scale_permission(actor, 'update', scale)
    scale = locked_scale(scale)
    result = assign(current_item(scale, item_id), professional)
    scale.updated_by = actor
    scale.save(update_fields=['updated_by', 'updated_at'])
    return result


@transaction.atomic
def remove_professional(*, actor, scale, item_id, assignment_id):
    require_scale_permission(actor, 'update', scale)
    scale = locked_scale(scale)
    item = current_item(scale, item_id)
    assignment = get_object_or_404(item.assignments.select_for_update(), pk=assignment_id, removed_at__isnull=True)
    assignment.removed_at = timezone.now()
    assignment.save(update_fields=['removed_at'])
    scale.updated_by = actor
    scale.save(update_fields=['updated_by', 'updated_at'])
    return assignment


@transaction.atomic
def substitute_professional(*, actor, scale, item_id, assignment_id, professional):
    require_scale_permission(actor, 'update', scale)
    scale = locked_scale(scale)
    item = current_item(scale, item_id)
    previous = get_object_or_404(item.assignments.select_for_update().select_related('professional'),
                               pk=assignment_id, removed_at__isnull=True)
    if previous.professional_id == professional.pk:
        raise ValidationError({'professional': 'Escolha outro profissional para substituir.'})
    new = assign(item, professional)
    previous.removed_at = timezone.now()
    previous.save(update_fields=['removed_at'])
    ScaleSubstitution.objects.create(scale=scale, item=item,
        previous_professional=previous.professional, new_professional=new.professional,
        previous_name=previous.professional.full_name, new_name=new.professional.full_name,
        actor=actor, actor_name=actor.get_full_name() or f'Usuário #{actor.pk}')
    scale.updated_by = actor
    scale.save(update_fields=['updated_by', 'updated_at'])
    return new


@transaction.atomic
def add_professionals(*, actor, scale, item_id, professionals):
    require_scale_permission(actor, 'update', scale)
    scale = locked_scale(scale)
    item = current_item(scale, item_id)
    if not professionals:
        raise ValidationError({'professionals': 'Selecione ao menos um profissional.'})
    results = [assign(item, professional) for professional in professionals]
    scale.updated_by = actor
    scale.save(update_fields=['updated_by', 'updated_at'])
    return results


@transaction.atomic
def configure_need(*, actor, scale, item_id, data):
    require_scale_permission(actor, 'update', scale)
    scale = locked_scale(scale)
    item = current_item(scale, item_id)
    allowed = {'frequency_quantity', 'frequency_period', 'observation', 'frequency_reason'}
    if set(data) - allowed:
        raise ValidationError('Campo não editável na necessidade.')
    quantity = data.get('frequency_quantity', item.frequency_quantity)
    period = data.get('frequency_period', item.frequency_period)
    if not isinstance(quantity, int) or isinstance(quantity, bool) or quantity <= 0:
        raise ValidationError({'frequency_quantity': 'Informe uma quantidade inteira positiva.'})
    if period not in FrequencyPeriod.values:
        raise ValidationError({'frequency_period': 'Selecione dia, semana ou mês.'})
    for field, value in data.items():
        setattr(item, field, value)
    item.save()
    scale.updated_by = actor
    scale.save(update_fields=['updated_by', 'updated_at'])
    return item
