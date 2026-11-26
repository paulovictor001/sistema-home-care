from django.db.models import Count
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from accounts.permissions import IsGerente
from .models import Neighborhood, Region
from .serializers import NeighborhoodSerializer, RegionSerializer


class RegionViewSet(viewsets.ModelViewSet):
    serializer_class = RegionSerializer
    queryset = Region.objects.annotate(neighborhood_count=Count('neighborhoods'))
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('active', 'true').lower() != 'false':
            qs = qs.filter(is_active=True)
        return qs

    def get_permissions(self):
        return [IsGerente() if self.request.method not in ('GET', 'HEAD', 'OPTIONS') else IsAuthenticated()]


class NeighborhoodViewSet(viewsets.ModelViewSet):
    serializer_class = NeighborhoodSerializer
    queryset = Neighborhood.objects.select_related('region')
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        for param, field in [('state', 'state'), ('city', 'city'), ('region', 'region_id')]:
            value = self.request.query_params.get(param)
            if value:
                qs = qs.filter(**{field: value if field != 'city' else value})
        if self.request.query_params.get('active', 'true').lower() != 'false':
            qs = qs.filter(is_active=True, region__is_active=True)
        return qs

    def get_permissions(self):
        return [IsGerente() if self.request.method not in ('GET', 'HEAD', 'OPTIONS') else IsAuthenticated()]
