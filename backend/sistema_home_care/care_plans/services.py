"""Operações transacionais do plano; modelos mantêm registros históricos."""
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from patients.models import Patient
from .models import CarePlan, CarePlanNeed, CarePlanHistory


def require_role(actor, *roles):
    if not actor or not actor.is_authenticated or not actor.is_active or not actor.groups.filter(name__in=roles).exists():
        raise PermissionDenied('Seu perfil não pode realizar esta operação.')


def snapshot(plan):
    return {
        'id': plan.pk, 'patient': plan.patient_id, 'status': plan.status,
        'start_date': plan.start_date.isoformat(),
        'end_date': plan.end_date.isoformat() if plan.end_date else None,
        'objective': plan.objective,
        'needs': list(plan.need_links.order_by('pk').values('id', 'care_need_id',
            'required_professional_id', 'frequency_quantity', 'frequency_period')),
    }


def record(plan, actor, description, previous):
    CarePlanHistory.objects.create(care_plan=plan, changed_by=actor,
        description=description, previous_data=previous, new_data=snapshot(plan))


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
