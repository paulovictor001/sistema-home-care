from rest_framework.permissions import BasePermission


class GroupNames:
    GERENTE = "GERENTE"
    MEDICO = "MEDICO"
    ENFERMEIRO = "ENFERMEIRO"

    CHOICES = (GERENTE, MEDICO, ENFERMEIRO)


def _in_group(user, *names: str) -> bool:
    return bool(
        user
        and user.is_authenticated
        and user.groups.filter(name__in=names).exists()
    )


class IsGerente(BasePermission):
    """Permite acesso somente a usuarios do grupo GERENTE."""

    message = "Acesso restrito ao gerente."

    def has_permission(self, request, view):
        return _in_group(request.user, GroupNames.GERENTE)


class IsMedico(BasePermission):
    def has_permission(self, request, view):
        return _in_group(request.user, GroupNames.MEDICO)


class IsEnfermeiro(BasePermission):
    def has_permission(self, request, view):
        return _in_group(request.user, GroupNames.ENFERMEIRO)


class IsClinicalStaff(BasePermission):
    """Medico ou enfermeiro (criacao/edicao clinica)."""

    message = "Acesso restrito a medico ou enfermeiro."

    def has_permission(self, request, view):
        return _in_group(
            request.user, GroupNames.MEDICO, GroupNames.ENFERMEIRO
        )
