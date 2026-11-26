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
    regions = data.pop('regions', None)
    if regions is not None:
        info.regions.set(regions)
    for field in ('availability_notes',):
        if field in data: setattr(info, field, data[field])
    info.save()
    return info


def professional_options(scale, item):
    address = getattr(scale.patient, 'address', None)
    region = address.neighborhood_record.region if address and address.neighborhood_record_id else None
    result = []
    for professional in Professional.objects.filter(is_active=True,
            profession_id=item.required_profession_id).select_related('scale_planning', 'profession').order_by('full_name'):
        info = getattr(professional, 'scale_planning', None)
        regions = list(info.regions.values('id', 'name')) if info else []
        names = [value['name'] for value in regions]
        match = None if region is None or not regions else any(value['id'] == region.pk for value in regions)
        result.append({'id': professional.pk, 'full_name': professional.full_name,
            'profession_name': professional.profession.name, 'regions': regions,
            'availability_notes': info.availability_notes if info else '',
            'patient_region': region.name if region else (address.region if address else ''), 'region_match': match,
            'region_status': 'unknown' if match is None else ('match' if match else 'mismatch')})
    return result
