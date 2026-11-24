from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from visits.models import Visit

from .models import Attendance
from .serializers import AttendanceSerializer, AttendanceWriteSerializer
from .services import _require_permission, finish_visit_with_attendance, save_attendance


class VisitAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, visit_id):
        _require_permission(request.user, "view")
        attendance = get_object_or_404(
            Attendance.objects.prefetch_related("history"), visit_id=visit_id
        )
        return Response(AttendanceSerializer(attendance).data)

    def post(self, request, visit_id):
        serializer = AttendanceWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if "care_description" not in serializer.validated_data:
            raise ValidationError({"care_description": "Descreva os cuidados realizados."})
        attendance = save_attendance(
            actor=request.user, visit=visit_id, expected_operation="create",
            **serializer.validated_data
        )
        return Response(AttendanceSerializer(attendance).data, status=status.HTTP_201_CREATED)

    def patch(self, request, visit_id):
        serializer = AttendanceWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        attendance = save_attendance(
            actor=request.user, visit=visit_id, expected_operation="update",
            **serializer.validated_data
        )
        return Response(AttendanceSerializer(attendance).data)


class FinishVisitView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, visit_id):
        visit = finish_visit_with_attendance(actor=request.user, visit=visit_id)
        return Response({"id": visit.pk, "status": visit.status, "finished_at": visit.finished_at})
