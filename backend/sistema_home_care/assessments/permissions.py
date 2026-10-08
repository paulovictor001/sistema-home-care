"""Matriz de autorização do módulo de necessidades (RF-NEC-018/021)."""
from rest_framework.permissions import BasePermission
from accounts.permissions import IsClinicalStaff, IsGerente, RequirePermission


class IsActiveUser(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_active)


class DenyUnknownAction(BasePermission):
    def has_permission(self, request, view):
        return False


NEED_ACTIONS = {
    'create': ('create', False),
    'list': ('view', False),
    'retrieve': ('view', False),
    'historico': ('view', False),
    'metadata': ('view', False),
    'update': ('update', False),
    'partial_update': ('update', False),
    'destroy': ('delete', False),
    'inativar': ('inactivate', True),
    'reativar': ('reactivate', True),
}


def need_permissions(action):
    rule = NEED_ACTIONS.get(action)
    if rule is None:
        return [DenyUnknownAction()]
    codename, allow_manager = rule
    profile = (IsGerente | IsClinicalStaff) if allow_manager else IsClinicalStaff
    return [IsActiveUser(), profile(), RequirePermission(f'necessidades.{codename}')()]
