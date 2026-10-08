from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission
from .models import CareScale

ACTIONS = frozenset(('create', 'update', 'view', 'delete', 'change_status'))


def has_scale_permission(user, action):
    if action not in ACTIONS or not user or not user.is_authenticated or not user.is_active:
        return False
    return (user.is_superuser or user.groups.filter(name='GERENTE').exists()
            or user.category.permissions.filter(codename=f'escalas.{action}').exists())


def visible_scales(user):
    queryset = CareScale.objects.filter(deleted_at__isnull=True)
    if has_scale_permission(user, 'view'):
        return queryset
    if not user or not user.is_authenticated or not user.is_active:
        return queryset.none()
    return queryset.filter(items__removed_at__isnull=True,
        items__assignments__removed_at__isnull=True,
        items__assignments__professional__is_active=True,
        items__assignments__professional__user=user).distinct()


def require_scale_permission(user, action, scale=None):
    if has_scale_permission(user, action):
        return
    if action == 'view' and scale is not None and visible_scales(user).filter(pk=scale.pk).exists():
        return
    raise PermissionDenied('Sem permissão para esta operação na escala.')


class ScalePermission(BasePermission):
    action_map = {'list': 'view', 'retrieve': 'view', 'create': 'create',
                  'update': 'update', 'partial_update': 'update', 'destroy': 'delete',
                  'change_status': 'change_status'}
    action_map.update({'add_need': 'update', 'remove_need': 'update'})

    def has_permission(self, request, view):
        action = self.action_map.get(view.action)
        if action == 'view':
            return has_scale_permission(request.user, action) or visible_scales(request.user).exists()
        return has_scale_permission(request.user, action)

    def has_object_permission(self, request, view, obj):
        action = self.action_map.get(view.action)
        return has_scale_permission(request.user, action) or (
            action == 'view' and visible_scales(request.user).filter(pk=obj.pk).exists())
