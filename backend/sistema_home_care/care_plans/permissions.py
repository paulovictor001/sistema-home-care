from rest_framework.permissions import BasePermission
from accounts.permissions import IsGerente, IsClinicalStaff, IsMedico, RequirePermission
from assessments.permissions import IsActiveUser


class DenyAction(BasePermission):
    def has_permission(self, request, view):
        return False


ACTION_RULES = {
    'list': ('view', IsGerente | IsClinicalStaff),
    'retrieve': ('view', IsGerente | IsClinicalStaff),
    'historico': ('view', IsGerente | IsClinicalStaff),
    'metadata': ('view', IsGerente | IsClinicalStaff),
    'profissionais': ('view', IsGerente | IsClinicalStaff),
    'recursos': ('view', IsGerente | IsClinicalStaff),
    'necessidades_disponiveis': ('view', IsGerente | IsMedico),
    'create': ('create', IsGerente | IsMedico),
    'update': ('update', IsMedico),
    'partial_update': ('update', IsMedico),
    'vincular': ('manage_needs', IsClinicalStaff),
    'configurar': ('manage_needs', IsClinicalStaff),
    'remover': ('manage_needs', IsClinicalStaff),
    'ativar': ('activate', IsMedico),
    'encerrar': ('close', IsClinicalStaff),
    'reativar': ('reactivate', IsClinicalStaff),
}


def plan_permissions(action):
    rule = ACTION_RULES.get(action)
    if rule is None:
        return [DenyAction()]
    codename, profile = rule
    return [IsActiveUser(), profile(), RequirePermission(f'planos_cuidados.{codename}')()]
