from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsGerente
from patients.audit import log_patient_event
from patients.models import Patient, PatientAuditAction

from .models import Team
from .serializers import TeamSerializer
from .models import Professional


class TeamProfessionalListView(APIView):
    permission_classes = [IsGerente]

    def get(self, request):
        return Response(list(Professional.objects.filter(is_active=True)
            .select_related("profession").order_by("full_name")
            .values("id", "full_name", "profession__name")))


class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    permission_classes = [IsGerente]
    queryset = Team.objects.prefetch_related("professionals__profession").all()
    http_method_names = ["get", "post", "put", "patch", "head", "options"]

    def filter_queryset(self, queryset):
        queryset = super().filter_queryset(queryset)
        if self.action != "list": return queryset
        qs = queryset
        status_filter = self.request.query_params.get("status", "ativo")
        if status_filter == "ativo": return qs.filter(is_active=True)
        if status_filter == "inativo": return qs.filter(is_active=False)
        if status_filter == "todos": return qs
        raise ValidationError({"status": "Use 'ativo', 'inativo' ou 'todos'."})

    @action(detail=True, methods=["post"])
    @transaction.atomic
    def inativar(self, request, pk=None):
        team = self.get_object()
        if not team.is_active:
            return Response(self.get_serializer(team).data)
        affected = list(Patient.objects.filter(responsible_team=team).select_related("responsible_team"))
        Patient.objects.filter(responsible_team=team).update(responsible_team=None)
        for patient in affected:
            log_patient_event(patient=patient, actor=request.user,
                action=PatientAuditAction.DOCTOR_TEAM_CHANGE,
                changes={"responsible_team": [team.pk, None], "reason": "team_inactivated"})
        team.is_active = False
        team.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(team).data)

    @action(detail=True, methods=["post"])
    def reativar(self, request, pk=None):
        team = self.get_object()
        team.is_active = True
        team.save(update_fields=["is_active", "updated_at"])
        return Response(self.get_serializer(team).data)
