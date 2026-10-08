from django.core.exceptions import ValidationError as ModelValidationError, PermissionDenied as ModelPermissionDenied
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from accounts.permissions import IsGerente, IsClinicalStaff, IsMedico
from assessments.permissions import IsActiveUser
from assessments.models import CareNeed, Resource
from professionals.models import Professional
from .models import CarePlan
from .serializers import (PlanSerializer, PlanCreateSerializer, PlanUpdateSerializer,
    AttachNeedSerializer, NeedConfigurationSerializer, RemovalSerializer, HistorySerializer)
from . import services


def execute(operation, **kwargs):
    try:
        return operation(**kwargs)
    except ModelValidationError as exc:
        raise ValidationError(exc.message_dict if hasattr(exc, 'message_dict') else exc.messages)
    except ModelPermissionDenied as exc:
        raise PermissionDenied(str(exc))
    except IntegrityError:
        raise ValidationError('A operação conflita com outro registro. Atualize os dados e tente novamente.')


class PlanPagination(PageNumberPagination):
    page_size = 20


class CarePlanViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = PlanSerializer
    pagination_class = PlanPagination
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']
    queryset = CarePlan.objects.select_related('patient').prefetch_related(
        'need_links__care_need__need_type', 'need_links__required_professional', 'need_links__resources__resource')

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'vincular', 'configurar', 'remover', 'ativar', 'necessidades_disponiveis'):
            profile = IsMedico
        elif self.action in ('encerrar', 'reativar'):
            profile = IsClinicalStaff
        else:
            profile = IsGerente | IsClinicalStaff
        return [IsActiveUser(), profile()]

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list' and 'patient' in self.request.query_params:
            queryset = queryset.filter(patient_id=self.patient_id())
        return queryset

    def patient_id(self):
        try:
            pk = int(self.request.query_params.get('patient', ''))
            if pk < 1:
                raise ValueError
            return pk
        except (ValueError, TypeError):
            raise ValidationError({'patient': 'Informe um ID de paciente válido.'})

    def validated(self, serializer_class):
        serializer = serializer_class(data=self.request.data)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def create(self, request):
        plan = execute(services.create_plan, actor=request.user, **self.validated(PlanCreateSerializer))
        return Response(PlanSerializer(plan).data, status=201)

    def update(self, request, pk=None):
        plan = execute(services.update_plan, actor=request.user, plan=self.get_object(),
                       data=self.validated(PlanUpdateSerializer))
        return Response(PlanSerializer(plan).data)

    def partial_update(self, request, pk=None):
        return self.update(request, pk)

    @action(detail=True, methods=['post'], url_path='necessidades')
    def vincular(self, request, pk=None):
        data = self.validated(AttachNeedSerializer)
        plan = self.get_object()
        execute(services.attach_need, actor=request.user, plan=plan, need=data['care_need'])
        return Response(PlanSerializer(CarePlan.objects.get(pk=plan.pk)).data, status=201)

    @action(detail=True, methods=['post'], url_path=r'necessidades/(?P<link_id>\d+)/configurar')
    def configurar(self, request, pk=None, link_id=None):
        plan = self.get_object()
        link = get_object_or_404(plan.need_links.all(), pk=link_id)
        execute(services.configure_need, actor=request.user, link=link, data=self.validated(NeedConfigurationSerializer))
        return Response(PlanSerializer(CarePlan.objects.get(pk=plan.pk)).data)

    @action(detail=True, methods=['post'], url_path=r'necessidades/(?P<link_id>\d+)/remover')
    def remover(self, request, pk=None, link_id=None):
        plan = self.get_object()
        link = get_object_or_404(plan.need_links.all(), pk=link_id)
        execute(services.remove_need, actor=request.user, link=link, **self.validated(RemovalSerializer))
        return Response(PlanSerializer(CarePlan.objects.get(pk=plan.pk)).data)

    def transition(self, request, target, expected):
        current = self.get_object()
        if current.status != expected:
            raise ValidationError({'status': 'Ação incompatível com o status atual.'})
        plan = execute(services.change_status, actor=request.user, plan=current, target=target)
        return Response(PlanSerializer(plan).data)

    @action(detail=True, methods=['post'])
    def ativar(self, request, pk=None):
        return self.transition(request, 'ACTIVE', 'DRAFT')

    @action(detail=True, methods=['post'])
    def encerrar(self, request, pk=None):
        plan = execute(services.close_plan, actor=request.user, plan=self.get_object())
        return Response(PlanSerializer(plan).data)

    @action(detail=True, methods=['post'])
    def reativar(self, request, pk=None):
        return self.transition(request, 'ACTIVE', 'CLOSED')

    @action(detail=True, methods=['get'])
    def historico(self, request, pk=None):
        return Response(HistorySerializer(self.get_object().history.all(), many=True).data)

    @action(detail=False, methods=['get'], url_path='profissionais')
    def profissionais(self, request):
        return Response(list(Professional.objects.order_by('full_name').values('id', 'full_name', 'profession__name', 'is_active')))

    @action(detail=False, methods=['get'], url_path='recursos')
    def recursos(self, request):
        return Response(list(Resource.objects.order_by('name').values('id', 'name')))

    @action(detail=False, methods=['get'], url_path='necessidades-disponiveis')
    def necessidades_disponiveis(self, request):
        needs = CareNeed.objects.filter(assessment__patient_id=self.patient_id(), is_active=True, status='IDENTIFIED')
        return Response(list(needs.values('id', 'description', 'priority', 'assessment_id', 'need_type__name')))
