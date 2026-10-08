from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.decorators import action
from . import services
from .models import CareScale
from .permissions import ScalePermission, visible_scales
from .serializers import ScaleSerializer, ScaleWriteSerializer, AddNeedSerializer, ProfessionalSerializer, ProfessionalsSerializer
from .serializers import NeedConfigurationSerializer


class ScalePagination(PageNumberPagination):
    page_size = 20


class CareScaleViewSet(viewsets.ModelViewSet):
    serializer_class = ScaleSerializer
    permission_classes = [ScalePermission]
    pagination_class = ScalePagination

    def get_queryset(self):
        if self.action in ('list', 'retrieve'):
            queryset = visible_scales(self.request.user)
        else:
            queryset = CareScale.objects.filter(deleted_at__isnull=True)
        if 'patient' in self.request.query_params:
            try:
                patient_id = int(self.request.query_params['patient'])
                if patient_id < 1:
                    raise ValueError
            except (ValueError, TypeError):
                raise ValidationError({'patient': 'Informe um ID válido.'})
            queryset = queryset.filter(patient_id=patient_id)
        return queryset.select_related('patient', 'care_plan')

    def create(self, request):
        serializer = ScaleWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        scale = services.create_scale(actor=request.user, **serializer.validated_data)
        return Response(ScaleSerializer(scale).data, status=201)

    def update(self, request, *args, **kwargs):
        serializer = ScaleWriteSerializer(data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        scale = services.update_scale(actor=request.user, scale=self.get_object(), data=serializer.validated_data)
        return Response(ScaleSerializer(scale).data)

    def destroy(self, request, *args, **kwargs):
        services.delete_scale(actor=request.user, scale=self.get_object())
        return Response(status=204)

    @action(detail=True, methods=['post'], url_path='necessidades')
    def add_need(self, request, pk=None):
        scale = self.get_object()
        serializer = AddNeedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.add_need(actor=request.user, scale=scale, **serializer.validated_data)
        return Response(ScaleSerializer(scale).data, status=201)

    @action(detail=True, methods=['post'], url_path=r'necessidades/(?P<item_id>\d+)/remover')
    def remove_need(self, request, pk=None, item_id=None):
        scale = self.get_object()
        services.remove_need(actor=request.user, scale=scale, item_id=item_id)
        return Response(ScaleSerializer(scale).data)

    @action(detail=True, methods=['post'], url_path=r'necessidades/(?P<item_id>\d+)/profissionais')
    def add_professional(self, request, pk=None, item_id=None):
        scale = self.get_object()
        serializer = ProfessionalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.add_professional(actor=request.user, scale=scale, item_id=item_id, **serializer.validated_data)
        return Response(ScaleSerializer(scale).data, status=201)

    @action(detail=True, methods=['post'], url_path=r'necessidades/(?P<item_id>\d+)/profissionais/(?P<assignment_id>\d+)/remover')
    def remove_professional(self, request, pk=None, item_id=None, assignment_id=None):
        scale = self.get_object()
        services.remove_professional(actor=request.user, scale=scale, item_id=item_id, assignment_id=assignment_id)
        return Response(ScaleSerializer(scale).data)

    @action(detail=True, methods=['post'], url_path=r'necessidades/(?P<item_id>\d+)/profissionais/(?P<assignment_id>\d+)/substituir')
    def substitute_professional(self, request, pk=None, item_id=None, assignment_id=None):
        scale = self.get_object()
        serializer = ProfessionalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.substitute_professional(actor=request.user, scale=scale, item_id=item_id,
            assignment_id=assignment_id, **serializer.validated_data)
        return Response(ScaleSerializer(scale).data)

    @action(detail=True, methods=['post'], url_path=r'necessidades/(?P<item_id>\d+)/profissionais/lote')
    def add_professionals(self, request, pk=None, item_id=None):
        scale = self.get_object()
        serializer = ProfessionalsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.add_professionals(actor=request.user, scale=scale, item_id=item_id, **serializer.validated_data)
        return Response(ScaleSerializer(scale).data, status=201)

    @action(detail=True, methods=['post'], url_path=r'necessidades/(?P<item_id>\d+)/configurar')
    def configure_need(self, request, pk=None, item_id=None):
        scale = self.get_object()
        serializer = NeedConfigurationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.configure_need(actor=request.user, scale=scale, item_id=item_id, data=serializer.validated_data)
        return Response(ScaleSerializer(scale).data)
