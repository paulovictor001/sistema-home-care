from rest_framework import serializers
from professionals.models import Professional
from .models import FrequencyPeriod


class NeedConfigurationSerializer(serializers.Serializer):
    """Configuração exige um profissional específico, inclusive sem usuário."""
    required_professional = serializers.PrimaryKeyRelatedField(queryset=Professional.objects.all())
    frequency_quantity = serializers.IntegerField(min_value=1)
    frequency_period = serializers.ChoiceField(choices=FrequencyPeriod.choices)
