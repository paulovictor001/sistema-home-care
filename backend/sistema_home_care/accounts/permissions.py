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


class HasCategoryPermission(BasePermission):
    """Valida permissao granular da categoria antes da operacao protegida.

    Uso: `RequirePermission("usuarios.create")`. Superusers passam direto.
    """

    message = "Sua categoria nao tem permissao para esta operacao."
    required_codename = ""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        category = getattr(user, "category", None)
        if category is None:
            return False
        return category.permissions.filter(
            codename=self.required_codename
        ).exists()


def RequirePermission(codename: str):
    """Fabrica uma permissao granular para o codename (ex. "usuarios.view")."""

    class _Required(HasCategoryPermission):
        required_codename = codename

    _Required.__name__ = f"Require_{codename.replace('.', '_')}"
    return _Required
