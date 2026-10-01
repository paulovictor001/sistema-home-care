"""Views das Necessidades Identificadas."""

from django.shortcuts import get_object_or_404
from rest_framework import generics

from .models import PatientAssessment
from .serializers import CareNeedSerializer


class CareNeedCreateView(generics.CreateAPIView):
    """Cria uma necessidade vinculada a uma avaliacao existente (TA-79)."""

    serializer_class = CareNeedSerializer

    def perform_create(self, serializer):
        assessment = get_object_or_404(
            PatientAssessment,
            pk=self.kwargs["assessment_id"],
        )
        serializer.save(assessment=assessment)
