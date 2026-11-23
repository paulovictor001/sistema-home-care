"""Leitura do requisito do plano para outros processos, sem atribuir execução."""
from django.core.exceptions import ValidationError


def planned_requirement(link):
    if link.removed_at:
        raise ValidationError({'plan_need': 'A necessidade foi removida do plano.'})
    professional = link.required_professional
    return {
        'plan_need_id': link.pk, 'care_plan_id': link.care_plan_id,
        'patient_id': link.care_plan.patient_id, 'care_need_id': link.care_need_id,
        'required_professional_id': link.required_professional_id,
        'required_profession_id': professional.profession_id if professional else None,
        'frequency_quantity': link.frequency_quantity, 'frequency_period': link.frequency_period,
        'resources': list(link.resources.values('resource_id', 'quantity', 'observation')),
    }
