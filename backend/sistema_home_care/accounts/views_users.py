"""Endpoints do Gerenciamento de Usuarios (somente gerente).

- UserViewSet: CRUD + inativar/reativar + exclusao fisica em cascata.
- CategoryViewSet: CRUD + configuracao de permissoes.
- ProfessionViewSet: CRUD + transferencia de profissionais.
- GranularPermissionViewSet: catalogo read-only.
"""

from django.db.models import Count, ProtectedError, Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from professionals.models import Professional

from .models import Category, GranularPermission, Profession, UserAuditAction
from .permissions import IsGerente, RequirePermission
from .serializers_users import (
    CategorySerializer,
    GranularPermissionSerializer,
    ProfessionSerializer,
    ProfessionTransferSerializer,
    UserSerializer,
)
from .services import (
    log_user_event,
    set_user_status,
    transfer_profession_professionals,
)
from .validators import normalize_cpf


class DefaultPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = None


class CatalogPagination(PageNumberPagination):
    """Listas curtas (categorias/profissoes/permissoes): pagina maior."""

    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 200


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    pagination_class = DefaultPagination
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return (
            self.serializer_class.Meta.model.objects.select_related("category")
            .prefetch_related("professional__profession")
            .order_by("first_name", "last_name", "cpf")
        )

    def get_permissions(self):
        mapping = {
            "list": "usuarios.view",
            "retrieve": "usuarios.view",
            "create": "usuarios.create",
            "update": "usuarios.update",
            "partial_update": "usuarios.update",
            "destroy": "usuarios.delete",
            "inativar": "usuarios.inactivate",
            "reativar": "usuarios.reactivate",
        }
        codename = mapping.get(self.action, "usuarios.view")
        return [IsGerente(), RequirePermission(codename)()]

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        params = self.request.query_params

        nome = params.get("nome")
        if nome:
            queryset = queryset.filter(
                Q(professional__full_name__icontains=nome)
                | Q(first_name__icontains=nome)
                | Q(last_name__icontains=nome)
            )

        cpf = params.get("cpf")
        if cpf:
            queryset = queryset.filter(cpf=normalize_cpf(cpf))

        status_param = (params.get("status") or "ativo").lower()
        if status_param == "ativo":
            queryset = queryset.filter(is_active=True)
        elif status_param == "inativo":
            queryset = queryset.filter(is_active=False)
        elif status_param == "todos":
            pass
        else:
            raise DRFValidationError(
                {"status": "Use 'ativo', 'inativo' ou 'todos'."}
            )

        categoria = params.get("categoria")
        if categoria:
            if str(categoria).isdigit():
                queryset = queryset.filter(category_id=int(categoria))
            else:
                queryset = queryset.filter(category__name__icontains=categoria)

        return queryset.distinct()

    def perform_destroy(self, instance):
        request = self.request
        actor = request.user
        pk, cpf = instance.pk, instance.cpf
        log_user_event(
            user=instance,
            actor=actor,
            action=UserAuditAction.DELETE,
            changes={"id": pk, "cpf": cpf},
        )
        instance.delete()  # CASCADE exclui o profissional vinculado.

    def _set_status(self, request, pk, is_active: bool):
        user = get_object_or_404(self.get_queryset(), pk=pk)
        set_user_status(user=user, is_active=is_active, actor=request.user)
        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="inativar")
    def inativar(self, request, pk=None):
        """Inativa usuario + profissional (idempotente)."""
        return self._set_status(request, pk, False)

    @action(detail=True, methods=["post"], url_path="reativar")
    def reativar(self, request, pk=None):
        """Reativa usuario + profissional (idempotente)."""
        return self._set_status(request, pk, True)


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    pagination_class = CatalogPagination
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Category.objects.prefetch_related("permissions").annotate(
            users_count=Count("users", distinct=True)
        )

    def get_permissions(self):
        mapping = {
            "list": "categorias.view",
            "retrieve": "categorias.view",
            "create": "categorias.create",
            "update": "categorias.update",
            "partial_update": "categorias.update",
            "destroy": "categorias.update",
            "permissoes": "categorias.manage_permissions",
        }
        codename = mapping.get(self.action, "categorias.view")
        return [IsGerente(), RequirePermission(codename)()]

    def perform_destroy(self, instance):
        if instance.users.exists():
            raise DRFValidationError(
                "Categoria possui usuarios e nao pode ser excluida."
            )
        try:
            instance.delete()
        except ProtectedError:
            raise DRFValidationError(
                "Categoria possui usuarios e nao pode ser excluida."
            )

    @action(detail=True, methods=["put"], url_path="permissoes")
    def permissoes(self, request, pk=None):
        """Configura as permissoes granulares da categoria."""
        category = self.get_object()
        ids = request.data.get("permission_ids")
        if not isinstance(ids, list):
            raise DRFValidationError(
                {"permission_ids": "Envie uma lista de IDs."}
            )
        valid = set(
            GranularPermission.objects.filter(pk__in=ids).values_list(
                "pk", flat=True
            )
        )
        unknown = [i for i in ids if i not in valid]
        if unknown:
            raise DRFValidationError(
                {"permission_ids": f"Permissoes inexistentes: {unknown}."}
            )
        category.permissions.set(ids)
        serializer = self.get_serializer(category)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProfessionViewSet(viewsets.ModelViewSet):
    serializer_class = ProfessionSerializer
    pagination_class = CatalogPagination
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return Profession.objects.annotate(
            professionals_count=Count("professionals", distinct=True)
        )

    def get_permissions(self):
        mapping = {
            "list": "profissoes.view",
            "retrieve": "profissoes.view",
            "create": "profissoes.create",
            "update": "profissoes.update",
            "partial_update": "profissoes.update",
            "destroy": "profissoes.delete",
            "transferir": "profissoes.transfer",
        }
        codename = mapping.get(self.action, "profissoes.view")
        return [IsGerente(), RequirePermission(codename)()]

    def _linked_count(self, profession) -> int:
        return Professional.objects.filter(profession=profession).count()

    def perform_update(self, serializer):
        profession = self.get_object()
        turning_off = (
            "is_active" in serializer.validated_data
            and serializer.validated_data["is_active"] is False
            and profession.is_active is True
        )
        if turning_off and self._linked_count(profession):
            raise DRFValidationError(
                "Profissao possui profissionais vinculados. "
                "Transfira-os antes de inativar."
            )
        serializer.save()

    def perform_destroy(self, instance):
        if self._linked_count(instance):
            raise DRFValidationError(
                "Profissao possui profissionais vinculados. "
                "Transfira-os antes de excluir."
            )
        try:
            instance.delete()
        except ProtectedError:
            raise DRFValidationError(
                "Profissao possui profissionais vinculados. "
                "Transfira-os antes de excluir."
            )

    @action(detail=True, methods=["post"], url_path="transferir")
    def transferir(self, request, pk=None):
        """Transfere todos os profissionais para outra profissao."""
        profession = self.get_object()
        serializer = ProfessionTransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        to_profession = serializer.validated_data["to_profession"]
        try:
            moved = transfer_profession_professionals(
                profession=profession,
                to_profession=to_profession,
                actor=request.user,
            )
        except ValueError as exc:
            raise DRFValidationError(str(exc))
        return Response(
            {"transferidos": moved, "para_profissao": to_profession.pk},
            status=status.HTTP_200_OK,
        )


class GranularPermissionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GranularPermission.objects.all().order_by("feature", "action")
    serializer_class = GranularPermissionSerializer
    pagination_class = CatalogPagination
    permission_classes = [IsGerente, RequirePermission("permissoes.view")]


class FreeProfessionalListView(APIView):
    """Profissionais sem usuario (para vincular no cadastro)."""

    permission_classes = [IsGerente, RequirePermission("profissoes.view")]

    def get(self, request):
        items = (
            Professional.objects.filter(user__isnull=True)
            .select_related("profession")
            .order_by("full_name")
            .values("id", "full_name", "profession__id", "profession__name")
        )
        return Response(list(items))
