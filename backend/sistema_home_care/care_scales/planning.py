from django.db import transaction
from django.shortcuts import get_object_or_404
from professionals.models import Professional
from .models import ProfessionalPlanningInfo
from .permissions import require_scale_permission


@transaction.atomic
def update_planning(*, actor, professional_id, data):
    require_scale_permission(actor, 'update')
    professional = get_object_or_404(Professional.objects.select_for_update(), pk=professional_id)
    info, _ = ProfessionalPlanningInfo.objects.get_or_create(professional=professional)
    for field in ('regions', 'availability_notes'):
        if field in data:
            setattr(info, field, data[field])
    info.save()
    return info


def professional_options(scale, item):
    address = getattr(scale.patient, 'address', None)
    region = address.region if address else ''
    result = []
    for professional in Professional.objects.filter(is_active=True,
            profession_id=item.required_profession_id).select_related('scale_planning', 'profession').order_by('full_name'):
        info = getattr(professional, 'scale_planning', None)
        regions = info.regions if info else []
        result.append({'id': professional.pk, 'full_name': professional.full_name,
            'profession_name': professional.profession.name, 'regions': regions,
            'availability_notes': info.availability_notes if info else '',
            'patient_region': region, 'region_match': bool(region and any(r.casefold() == region.casefold() for r in regions)) if regions else None})
    return result
