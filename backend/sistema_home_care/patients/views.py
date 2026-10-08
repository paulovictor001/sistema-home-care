"""Views do Cadastro do Paciente (DRF).

Endpoints (TASK-CAD-PAC-008 a 016):
- POST   /api/pacientes/              cadastro (TA-12, so gerente)
- GET    /api/pacientes/              listagem paginada + filtros (TA-10,
  TA-14/015/016: nome, CPF, status, regiao; 20 por pagina; default ativos)
- GET    /api/pacientes/<id>/         visualizacao (TA-13, gerente+clinica)
- PUT/PATCH /api/pacientes/<id>/      edicao (TA-14; medico/equipe so gerente)
- POST   /api/pacientes/<id>/inativar/   (TA-15, so gerente, idempotente)
- POST   /api/pacientes/<id>/reativar/   (TA-18, so gerente, idempotente)

Autorizacoes (TASK-CAD-PAC-017 a 022) via `accounts.permissions`
(`IsGerente`, `IsMedico`, `IsEnfermeiro`); o bloqueio de medico/equipe
para nao-gerentes e aplicado no serializer (403).
"""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import mixins, status, viewsets
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from accounts.permissions import (
    IsEnfermeiro,
    IsGerente,
    IsMedico,
    RequirePermission,
)
from accounts.validators import normalize_cpf

from .models import HealthCondition, NeedType, NeedTypeStatus, Patient, PatientAuditAction, PatientStatus
from .serializers import HealthConditionSerializer, NeedTypeCatalogSerializer, PatientSerializer
from .audit import log_patient_event

# Gerente + equipe clinica (leitura e edicao clinica).
IsCareTeam = IsGerente | IsMedico | IsEnfermeiro


class PatientPagination(PageNumberPagination):
    """Paginacao fixa: 20 pacientes por pagina (TASK-CAD-PAC-016)."""

    page_size = 20
    page_size_query_param = None


class PatientViewSet(viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    pagination_class = PatientPagination
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def get_queryset(self):
        return (
            Patient.objects.select_related(
                "responsible_doctor", "health_condition", "address"
            ).order_by("full_name")
        )

    def get_permissions(self):
        if self.action == "create":
            permission_classes = [
                IsGerente,
                RequirePermission("pacientes.create"),
            ]
        elif self.action == "inativar":
            permission_classes = [
                IsGerente,
                RequirePermission("pacientes.inactivate"),
            ]
        elif self.action == "reativar":
            permission_classes = [
                IsGerente,
                RequirePermission("pacientes.reactivate"),
            ]
        elif self.action in ("update", "partial_update"):
            permission_classes = [
                IsCareTeam,
                RequirePermission("pacientes.update_clinical"),
            ]
        else:
            permission_classes = [
                IsCareTeam,
                RequirePermission("pacientes.view"),
            ]
        return [permission() for permission in permission_classes]

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        if self.action != "list":
            return queryset
        params = self.request.query_params

        nome = params.get("nome")
        if nome:
            queryset = queryset.filter(full_name__icontains=nome)

        cpf = params.get("cpf")
        if cpf:
            queryset = queryset.filter(cpf=normalize_cpf(cpf))

        # Status: padrao ativos; `inativo` so inativos; `todos` ambos
        # (TASK-CAD-PAC-014).
        status_param = (params.get("status") or "ativo").lower()
        if status_param == "ativo":
            queryset = queryset.filter(status=PatientStatus.ACTIVE)
        elif status_param == "inativo":
            queryset = queryset.filter(status=PatientStatus.INACTIVE)
        elif status_param == "todos":
            pass
        else:
            raise DRFValidationError(
                {"status": "Use 'ativo', 'inativo' ou 'todos'."}
            )

        regiao = params.get("regiao")
        if regiao:
            queryset = queryset.filter(address__region__icontains=regiao)

        return queryset

    def perform_create(self, serializer):
        try:
            patient = serializer.save()
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message_dict)
        log_patient_event(
            patient=patient,
            actor=self.request.user,
            action=PatientAuditAction.CREATE,
            changes={"id": patient.pk},
        )

    def perform_update(self, serializer):
        before = self.get_object()
        before_doctor = before.responsible_doctor_id
        before_team = before.responsible_team
        try:
            patient = serializer.save()
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message_dict)
        if (
            patient.responsible_doctor_id != before_doctor
            or patient.responsible_team != before_team
        ):
            action = PatientAuditAction.DOCTOR_TEAM_CHANGE
            changes = {
                "responsible_doctor": [before_doctor, patient.responsible_doctor_id],
                "responsible_team": [before_team, patient.responsible_team],
            }
        else:
            action = PatientAuditAction.UPDATE
            changes = {"id": patient.pk}
        log_patient_event(
            patient=patient,
            actor=self.request.user,
            action=action,
            changes=changes,
        )

    def _set_status(self, request, pk, new_status: str):
        # Busca fora do filtro default de ativos: inativar um inativo e
        # reativar um inativo precisam encontrar o objeto (idempotentes).
        patient = get_object_or_404(self.get_queryset(), pk=pk)
        self.check_object_permissions(request, patient)
        old_status = patient.status
        patient.status = new_status
        patient.save(update_fields=["status", "updated_at"])
        action = (
            PatientAuditAction.INACTIVATE
            if new_status == PatientStatus.INACTIVE
            else PatientAuditAction.REACTIVATE
        )
        log_patient_event(
            patient=patient,
            actor=request.user,
            action=action,
            changes={"status": [old_status, new_status]},
        )
        serializer = self.get_serializer(patient)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="inativar")
    def inativar(self, request, pk=None):
        """Inativa o paciente (TASK-CAD-PAC-012, so gerente)."""
        return self._set_status(request, pk, PatientStatus.INACTIVE)

    @action(detail=True, methods=["post"], url_path="reativar")
    def reativar(self, request, pk=None):
        """Reativa o paciente (TASK-CAD-PAC-013, so gerente)."""
        return self._set_status(request, pk, PatientStatus.ACTIVE)


class HealthConditionViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    queryset = HealthCondition.objects.order_by("name", "pk")
    serializer_class = HealthConditionSerializer
    pagination_class = None
    http_method_names = ["get", "post", "head", "options"]

    def get_permissions(self):
        if self.action == "create":
            return [IsGerente(), RequirePermission("pacientes.create")()]
        return [IsCareTeam(), RequirePermission("pacientes.view")()]


class NeedTypeCatalogViewSet(viewsets.ReadOnlyModelViewSet):
    """Catálogo de tipos de necessidade p/ a avaliação (TA-61/FE-004).

    GET /api/tipos-necessidade/ — gerente+médico+enfermeiro com
    `avaliacoes.view` (gating defensivo enquanto TA-55/56/58/59 pendentes).
    Default só ativos (`?status=todos|inativo`); sem paginação (lista curta).
    """

    serializer_class = NeedTypeCatalogSerializer
    pagination_class = None
    http_method_names = ["get", "head", "options"]
    permission_classes = [IsCareTeam, RequirePermission("avaliacoes.view")]

    def get_queryset(self):
        queryset = NeedType.objects.order_by("name")
        status_param = (self.request.query_params.get("status") or "ativo").lower()
        if status_param == "ativo":
            queryset = queryset.filter(status=NeedTypeStatus.ACTIVE)
        elif status_param == "inativo":
            queryset = queryset.filter(status=NeedTypeStatus.INACTIVE)
        elif status_param == "todos":
            pass
        else:
            from rest_framework.exceptions import ValidationError as DRFValidationError

            raise DRFValidationError(
                {"status": "Use 'ativo', 'inativo' ou 'todos'."}
            )
        return queryset

class NeedTypeStatusView(APIView):
    """Altera o status de um tipo de necessidade de forma idempotente (TA-78)."""

    target_status = None
    permission_classes = [IsCareTeam, RequirePermission("tipos_necessidade.manage")]

    def get_permissions(self):
        from assessments.permissions import type_management_permissions
        return type_management_permissions()

    def post(self, request, pk):
        need_type = get_object_or_404(NeedType, pk=pk)
        need_type.status = self.target_status
        need_type.save(update_fields=["status", "updated_at"])
        return Response(
            NeedTypeCatalogSerializer(need_type).data,
            status=status.HTTP_200_OK,
        )


class NeedTypeInactivateView(NeedTypeStatusView):
    """Inativa um tipo de necessidade."""

    target_status = NeedTypeStatus.INACTIVE


class NeedTypeReactivateView(NeedTypeStatusView):
    """Reativa um tipo de necessidade."""

    target_status = NeedTypeStatus.ACTIVE
