"""Views da Avaliação Inicial (DRF).

Endpoints (TASK-AVL-BE-001 a 008):
- POST /api/avaliacoes/                    criação (TA-47, só medico/enfermeiro)
- GET  /api/avaliacoes/?patient=<id>       histórico (TA-50, sem sobrescrever)
- GET  /api/avaliacoes/<id>/               consulta + relacionados (TA-49)
- PUT/PATCH /api/avaliacoes/<id>/          edição (TA-53 clínica;
  TA-54 gerente só troca `professional`)
- POST /api/avaliacoes/<id>/necessidades/  criar necessidade (TA-51)
- POST /api/avaliacoes/<id>/recursos/      associar recurso (TA-52)

Autorizações (RF-AVL-019) via `accounts.permissions`: criação/edição e
nested só clínica; visualização gerente+clínica; troca de responsável
também liberada ao gerente (bloqueio fino no serializer, 403).
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import (
    IsClinicalStaff,
    IsEnfermeiro,
    IsGerente,
    IsMedico,
    RequirePermission,
)

from .models import (
    AssessmentAuditAction,
    CareNeed,
    CareNeedHistory,
    NeedType,
    NeedTypeStatus,
    PatientAssessment,
    Resource,
)
from .audit import assessment_snapshot, log_assessment_creation, log_assessment_event
from .permissions import need_permissions
from .serializers import (
    AssessmentResourceSerializer,
    CareNeedSerializer,
    CareNeedHistorySerializer,
    NeedTypeCatalogSerializer,
    NeedTypeManageSerializer,
    PatientAssessmentSerializer,
    ResourceCatalogSerializer,
)

# Gerente + equipe clínica (leitura e troca de responsável).
IsCareTeam = IsGerente | IsMedico | IsEnfermeiro


class NeedTypeCatalogViewSet(viewsets.ModelViewSet):
    serializer_class = NeedTypeManageSerializer
    pagination_class = None
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return NeedTypeManageSerializer
        return NeedTypeCatalogSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update"):
            from .permissions import type_management_permissions
            return type_management_permissions()
        return [IsCareTeam(), RequirePermission("avaliacoes.view")()]

    def get_queryset(self):
        queryset = NeedType.objects.order_by("name")
        if self.action != "list":
            return queryset
        status_param = (self.request.query_params.get("status") or "ativo").lower()
        if status_param == "ativo":
            return queryset.filter(status=NeedTypeStatus.ACTIVE)
        if status_param == "inativo":
            return queryset.filter(status=NeedTypeStatus.INACTIVE)
        if status_param == "todos":
            return queryset
        raise DRFValidationError({"status": "Use 'ativo', 'inativo' ou 'todos'."})


class NeedTypeStatusView(APIView):
    target_status = None

    def get_permissions(self):
        from .permissions import type_management_permissions
        return type_management_permissions()

    def post(self, request, pk):
        need_type = get_object_or_404(NeedType, pk=pk)
        need_type.status = self.target_status
        need_type.save(update_fields=["status", "updated_at"])
        return Response(NeedTypeCatalogSerializer(need_type).data, status=status.HTTP_200_OK)


class NeedTypeInactivateView(NeedTypeStatusView):
    target_status = NeedTypeStatus.INACTIVE


class NeedTypeReactivateView(NeedTypeStatusView):
    target_status = NeedTypeStatus.ACTIVE


class AssessmentPagination(PageNumberPagination):
    """Paginação fixa: 20 avaliações por página (padrão pacientes)."""

    page_size = 20
    page_size_query_param = None


class AssessmentViewSet(viewsets.ModelViewSet):
    serializer_class = PatientAssessmentSerializer
    pagination_class = AssessmentPagination
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self):
        return (
            PatientAssessment.objects.select_related(
                "patient", "professional"
            )
            .prefetch_related("care_needs", "assessment_resources")
            .order_by("-assessment_date", "-created_at")
        )

    def get_permissions(self):
        if self.action == "create":
            permission_classes = [
                IsClinicalStaff,
                RequirePermission("avaliacoes.create"),
            ]
        elif self.action in ("update", "partial_update"):
            permission_classes = [
                IsCareTeam,
                RequirePermission("avaliacoes.update"),
            ]
        elif self.action == "criar_necessidade":
            return need_permissions("create") + [RequirePermission("avaliacoes.add_need")()]
        elif self.action == "associar_recurso":
            permission_classes = [
                IsClinicalStaff,
                RequirePermission("avaliacoes.add_resource"),
            ]
        else:
            permission_classes = [
                IsCareTeam,
                RequirePermission("avaliacoes.view"),
            ]
        return [permission() for permission in permission_classes]

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        params = self.request.query_params
        patient_id = params.get("patient")
        if patient_id:
            try:
                patient_pk = int(patient_id)
            except (TypeError, ValueError):
                raise DRFValidationError(
                    {"patient": "ID de paciente inválido."}
                )
            queryset = queryset.filter(patient_id=patient_pk)
        return queryset

    def perform_create(self, serializer):
        try:
            with transaction.atomic():
                assessment = serializer.save()
                log_assessment_creation(assessment=assessment, actor=self.request.user)
        except DjangoValidationError as exc:
            raise DRFValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else str(exc)
            )

    def perform_update(self, serializer):
        try:
            with transaction.atomic():
                previous = assessment_snapshot(serializer.instance)
                assessment = serializer.save()
                current = assessment_snapshot(assessment)
                changes = {
                    key: {"old": previous[key], "new": current[key]}
                    for key in current if previous[key] != current[key]
                }
                if changes:
                    action = (
                        AssessmentAuditAction.PROFESSIONAL_CHANGE
                        if "professional_id" in changes
                        else AssessmentAuditAction.UPDATE
                    )
                    log_assessment_event(
                        assessment=assessment, actor=self.request.user,
                        action=action, changes=changes,
                    )
        except DjangoValidationError as exc:
            raise DRFValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else str(exc)
            )

    @action(detail=True, methods=["post"], url_path="necessidades")
    def criar_necessidade(self, request, pk=None):
        """Cria necessidade vinculada à avaliação (TA-51/RN-AVL-011)."""
        assessment = self.get_object()
        serializer = CareNeedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            need = serializer.save(assessment=assessment)
        except DjangoValidationError as exc:
            raise DRFValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else str(exc)
            )
        return Response(
            CareNeedSerializer(need).data, status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=["post"], url_path="recursos")
    def associar_recurso(self, request, pk=None):
        """Associa recurso existente à avaliação (TA-52/RN-AVL-016/017)."""
        assessment = self.get_object()
        serializer = AssessmentResourceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            link = serializer.save(assessment=assessment)
        except DjangoValidationError as exc:
            raise DRFValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else str(exc)
            )
        return Response(
            AssessmentResourceSerializer(link).data,
            status=status.HTTP_201_CREATED,
        )


class CareNeedViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Consulta e edição; registros são preservados por inativação.

    Criação permanece em POST /api/avaliacoes/<id>/necessidades/.
    A avaliação de origem e o status são imutáveis nesta API.
    """

    serializer_class = CareNeedSerializer
    pagination_class = AssessmentPagination
    http_method_names = ["get", "post", "put", "patch", "delete", "head", "options"]
    queryset = CareNeed.objects.select_related("need_type", "assessment").order_by(
        "-created_at", "-pk"
    )

    def get_permissions(self):
        # Métodos sem rota mapeada continuam retornando 405 após autenticação.
        return need_permissions(self.action or "metadata")

    def destroy(self, request, *args, **kwargs):
        need = self.get_object()
        if need.history.exists():
            return Response(
                {"detail": "Esta necessidade possui histórico de situação e não pode ser excluída."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            need.delete()
        except ProtectedError:
            return Response(
                {"detail": "Esta necessidade está vinculada a um plano de cuidados e não pode ser excluída."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        if self.action == "list":
            situation = self.request.query_params.get("situacao", "ativo").lower()
            if situation not in ("ativo", "inativo", "todos"):
                raise DRFValidationError({"situacao": "Use 'ativo', 'inativo' ou 'todos'."})
            if situation != "todos":
                queryset = queryset.filter(is_active=situation == "ativo")
            assessment_id = self.request.query_params.get("assessment")
            if assessment_id is not None:
                try:
                    assessment_id = int(assessment_id)
                    if assessment_id <= 0:
                        raise ValueError
                except (TypeError, ValueError):
                    raise DRFValidationError({"assessment": "ID de avaliação inválido."})
                queryset = queryset.filter(assessment_id=assessment_id)
        return queryset

    def _set_active(self, request, pk, is_active):
        with transaction.atomic():
            need = get_object_or_404(self.get_queryset().select_for_update(), pk=pk)
            self.check_object_permissions(request, need)
            if need.is_active != is_active:
                snapshot = dict(CareNeedSerializer(need).data)
                need.is_active = is_active
                need.inactivated_at = None if is_active else timezone.now()
                need.save(update_fields=["is_active", "inactivated_at", "updated_at"])
                CareNeedHistory.objects.create(
                    need=need, actor=request.user,
                    actor_name=request.user.get_full_name() or f"Usuário #{request.user.pk}",
                    snapshot=snapshot,
                    action="REACTIVATE" if is_active else "INACTIVATE",
                )
        # Gerente pode inativar sem receber dados clínicos da consulta.
        return Response({"id": need.pk, "is_active": need.is_active, "inactivated_at": need.inactivated_at})

    @action(detail=True, methods=["post"], url_path="inativar")
    def inativar(self, request, pk=None):
        return self._set_active(request, pk, False)

    @action(detail=True, methods=["post"], url_path="reativar")
    def reativar(self, request, pk=None):
        return self._set_active(request, pk, True)

    @action(detail=True, methods=["get"], url_path="historico")
    def historico(self, request, pk=None):
        need = self.get_object()
        return Response(CareNeedHistorySerializer(need.history.all(), many=True).data)


class ResourceCatalogViewSet(viewsets.ModelViewSet):
    """Catálogo de consulta da equipe clínica e manutenção pelo gerente."""

    serializer_class = ResourceCatalogSerializer
    pagination_class = None
    http_method_names = ["get", "post", "patch", "put", "delete", "head", "options"]

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsGerente(), RequirePermission("avaliacoes.manage_resources")()]
        return [IsCareTeam(), RequirePermission("avaliacoes.view")()]

    def get_queryset(self):
        return Resource.objects.order_by("name")

    def destroy(self, request, *args, **kwargs):
        resource = self.get_object()
        try:
            resource.delete()
        except ProtectedError:
            return Response(
                {"detail": "Este recurso já está associado a uma avaliação e não pode ser excluído."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
