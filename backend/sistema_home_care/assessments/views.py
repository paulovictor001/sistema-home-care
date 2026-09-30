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
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from accounts.permissions import (
    IsClinicalStaff,
    IsEnfermeiro,
    IsGerente,
    IsMedico,
    RequirePermission,
)

from .models import PatientAssessment
from .serializers import (
    AssessmentResourceSerializer,
    CareNeedSerializer,
    PatientAssessmentSerializer,
)

# Gerente + equipe clínica (leitura e troca de responsável).
IsCareTeam = IsGerente | IsMedico | IsEnfermeiro


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
            permission_classes = [
                IsClinicalStaff,
                RequirePermission("avaliacoes.add_need"),
            ]
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
            serializer.save()
        except DjangoValidationError as exc:
            raise DRFValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else str(exc)
            )

    def perform_update(self, serializer):
        try:
            serializer.save()
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
