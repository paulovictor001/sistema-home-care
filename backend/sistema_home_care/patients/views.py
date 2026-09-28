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
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from accounts.permissions import IsEnfermeiro, IsGerente, IsMedico
from accounts.validators import normalize_cpf

from .models import Patient, PatientStatus
from .serializers import PatientSerializer

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
            permission_classes = [IsGerente]
        elif self.action in ("inativar", "reativar"):
            permission_classes = [IsGerente]
        else:
            permission_classes = [IsCareTeam]
        return [permission() for permission in permission_classes]

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
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
            serializer.save()
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message_dict)

    def perform_update(self, serializer):
        try:
            serializer.save()
        except DjangoValidationError as exc:
            raise DRFValidationError(exc.message_dict)

    def _set_status(self, request, pk, new_status: str):
        # Busca fora do filtro default de ativos: inativar um inativo e
        # reativar um inativo precisam encontrar o objeto (idempotentes).
        patient = get_object_or_404(self.get_queryset(), pk=pk)
        self.check_object_permissions(request, patient)
        patient.status = new_status
        patient.save(update_fields=["status", "updated_at"])
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
