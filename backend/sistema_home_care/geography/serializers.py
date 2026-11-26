from rest_framework import serializers
from .models import Neighborhood, Region


class NeighborhoodSerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source='region.name', read_only=True)
    class Meta:
        model = Neighborhood
        fields = ['id', 'region', 'region_name', 'state', 'city', 'name', 'is_active']

    def validate_state(self, value):
        return value.strip().upper()


class RegionSerializer(serializers.ModelSerializer):
    neighborhood_count = serializers.IntegerField(read_only=True)
    class Meta:
        model = Region
        fields = ['id', 'name', 'is_active', 'neighborhood_count']
