from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from .models import CareScale
from .permissions import require_scale_permission


@transaction.atomic
def create_scale(*, actor, **data):
    require_scale_permission(actor, 'create')
    return CareScale.objects.create(created_by=actor, updated_by=actor, **data)


def locked_scale(scale):
    return CareScale.objects.select_for_update().get(pk=scale.pk, deleted_at__isnull=True)


@transaction.atomic
def update_scale(*, actor, scale, data):
    require_scale_permission(actor, 'update', scale)
    scale = locked_scale(scale)
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
