from rest_framework import serializers
from professionals.models import Professional


class NeedConfigurationSerializer(serializers.Serializer):
    """Configuração exige um profissional específico, inclusive sem usuário."""
    required_professional = serializers.PrimaryKeyRelatedField(queryset=Professional.objects.all())
