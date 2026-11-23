"""Contrato para o futuro Agendamento; não cria visitas ou horários."""
from django.db import transaction
from rest_framework.exceptions import ValidationError
from .models import ScaleStatus
from .services import locked_scale, validate_activation


@transaction.atomic
def scheduling_requirement(scale):
    scale = locked_scale(scale)
    if scale.status != ScaleStatus.ACTIVE:
        raise ValidationError({'scale': 'Somente escala ativa pode gerar novos agendamentos.'})
    validate_activation(scale)
    return {'scale_id': scale.pk, 'patient_id': scale.patient_id,
            'care_plan_id': scale.care_plan_id,
            'start_date': scale.start_date.isoformat(), 'end_date': scale.end_date.isoformat(),
            'items': [{'id': item.pk, 'plan_need_id': item.plan_need_id,
                'frequency_quantity': item.frequency_quantity, 'frequency_period': item.frequency_period,
                'professional_ids': list(item.assignments.filter(removed_at__isnull=True).values_list('professional_id', flat=True))}
                for item in scale.items.filter(removed_at__isnull=True)]}
