from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from professionals.models import Professional
from .models import ProfessionalWeeklyAvailability, Visit, VisitStatus
from . import services
from .serializers import (AvailabilitySerializer, TransitionSerializer, VisitCreateSerializer,
                          VisitEditSerializer, VisitSerializer, VisitSeriesSerializer)


def require_permission(user, action, feature="agendamentos"):
    if user.is_superuser:
        return
    category = getattr(user, "category", None)
    if not category or not category.permissions.filter(codename=f"{feature}.{action}").exists():
        raise PermissionDenied("Sua categoria não tem permissão para esta operação.")


class VisitListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        require_permission(request.user, "view")
        qs = Visit.objects.select_related("patient", "care_plan", "plan_need__care_need", "care_scale",
            "scale_need", "professional", "created_by").prefetch_related("history")
        for key, field in (("patient", "patient_id"), ("professional", "professional_id"),
                           ("care_scale", "care_scale_id"), ("status", "status"), ("from", "visit_date__gte"), ("to", "visit_date__lte")):
            value = request.query_params.get(key)
            if value:
                qs = qs.filter(**{field: value})
        return Response({"results": VisitSerializer(qs[:200], many=True).data})

    def post(self, request):
        require_permission(request.user, "create")
        series = "visit_dates" in request.data
        serializer = (VisitSeriesSerializer if series else VisitCreateSerializer)(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = dict(serializer.validated_data)
        scale, item, professional = data.pop("care_scale"), data.pop("scale_need"), data.pop("professional")
        if series:
            result = services.create_visit_series(actor=request.user, scale=scale, scale_need=item,
                professional=professional, **data)
            return Response({"created": VisitSerializer(result["created"], many=True).data,
                "rejected": result["rejected"]}, status=status.HTTP_201_CREATED)
        visit = services.create_visit(actor=request.user, scale=scale, scale_need=item,
            professional=professional, **data)
        return Response(VisitSerializer(visit).data, status=status.HTTP_201_CREATED)


class VisitDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk):
        return get_object_or_404(Visit.objects.select_related("patient", "care_plan", "plan_need__care_need",
            "care_scale", "scale_need", "professional", "created_by").prefetch_related("history"), pk=pk)

    def get(self, request, pk):
        require_permission(request.user, "view")
        return Response(VisitSerializer(self.get_object(pk)).data)

    def patch(self, request, pk):
        require_permission(request.user, "update")
        visit = self.get_object(pk)
        serializer = VisitEditSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(VisitSerializer(services.edit_visit(actor=request.user, visit=visit,
            changes=serializer.validated_data)).data)

    def delete(self, request, pk):
        services.delete_visit(actor=request.user, visit=self.get_object(pk))


class VisitStatusView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request, pk):
        serializer = TransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        action = {
            VisitStatus.CONFIRMED: "confirm",
            VisitStatus.CANCELLED: "cancel",
            VisitStatus.NOT_HELD: "not_realized",
            VisitStatus.IN_PROGRESS: "start",
        }[data["status"]]
        require_permission(request.user, action, feature="visitas")
        visit = services.transition_visit(actor=request.user, visit=pk,
            target_status=data['status'], reason=data.get('reason', ''))
        return Response(VisitSerializer(visit).data)


class ProfessionalAvailabilityView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, professional_id):
        require_permission(request.user, "view")
        get_object_or_404(Professional, pk=professional_id)
        items = ProfessionalWeeklyAvailability.objects.filter(professional_id=professional_id)
        return Response(AvailabilitySerializer(items, many=True).data)

    def put(self, request, professional_id):
        require_permission(request.user, "update")
        get_object_or_404(Professional, pk=professional_id)
        serializer = AvailabilitySerializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        windows = serializer.validated_data
        for index, window in enumerate(windows):
            if window["start_time"] >= window["end_time"]:
                raise ValidationError({"availability": f"Janela {index + 1}: início deve preceder o fim."})
            for other in windows[index + 1:]:
                if window["weekday"] == other["weekday"] and window["start_time"] < other["end_time"] and window["end_time"] > other["start_time"]:
                    raise ValidationError({"availability": "As janelas do mesmo dia não podem se sobrepor."})
        with transaction.atomic():
            ProfessionalWeeklyAvailability.objects.filter(professional_id=professional_id).delete()
            saved = [ProfessionalWeeklyAvailability.objects.create(professional_id=professional_id, **item) for item in windows]
        return Response(AvailabilitySerializer(saved, many=True).data)
