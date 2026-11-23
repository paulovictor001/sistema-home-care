from functools import wraps
from .models import CareScale, ScaleAuditEvent


def snapshot(scale):
    return {'id': scale.pk, 'patient': scale.patient_id, 'care_plan': scale.care_plan_id,
        'start_date': scale.start_date.isoformat() if scale.start_date else None,
        'end_date': scale.end_date.isoformat() if scale.end_date else None,
        'status': scale.status, 'observation': scale.observation,
        'deleted_at': scale.deleted_at.isoformat() if scale.deleted_at else None,
        'items': [{'id': item.pk, 'plan_need': item.plan_need_id,
            'description': item.plan_need.care_need.description,
            'required_profession': item.required_profession_id,
            'planned_quantity': item.planned_quantity, 'planned_period': item.planned_period,
            'frequency_quantity': item.frequency_quantity, 'frequency_period': item.frequency_period,
            'frequency_reason': item.frequency_reason, 'observation': item.observation,
            'removed_at': item.removed_at.isoformat() if item.removed_at else None,
            'assignments': [{'id': assignment.pk, 'professional': assignment.professional_id,
                'professional_name': assignment.professional.full_name,
                'removed_at': assignment.removed_at.isoformat() if assignment.removed_at else None}
                for assignment in item.assignments.select_related('professional').order_by('pk')]}
            for item in scale.items.select_related('plan_need__care_need').order_by('pk')]}


def audited(action):
    # Applied inside transaction.atomic: changes and event commit or roll back together.
    def decorate(operation):
        @wraps(operation)
        def run(*args, **kwargs):
            actor = kwargs['actor']
            before = {}
            if 'scale' in kwargs:
                from .services import locked_scale
                from .permissions import require_scale_permission
                permission = 'delete' if action == 'DELETE' else 'change_status' if action == 'STATUS' else 'update'
                require_scale_permission(actor, permission, kwargs['scale'])
                before = snapshot(locked_scale(kwargs['scale']))
            result = operation(*args, **kwargs)
            scale = CareScale.objects.get(pk=kwargs['scale'].pk) if 'scale' in kwargs else result
            after = snapshot(scale)
            if before != after:
                ScaleAuditEvent.objects.create(scale=scale, actor=actor,
                    actor_name=actor.get_full_name() or f'Usuário #{actor.pk}',
                    action=action, previous_data=before, new_data=after)
            return result
        return run
    return decorate
