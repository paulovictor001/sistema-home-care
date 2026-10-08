from rest_framework import serializers
from professionals.models import Professional
from assessments.models import CareNeed, Resource
from patients.models import Patient
from .models import FrequencyPeriod, CarePlan, CarePlanNeed, CarePlanNeedResource, CarePlanHistory


class ResourceConfigurationSerializer(serializers.Serializer):
    resource = serializers.PrimaryKeyRelatedField(queryset=Resource.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    observation = serializers.CharField(required=False, allow_blank=True, default='')


class NeedConfigurationSerializer(serializers.Serializer):
    """Configuração exige um profissional específico, inclusive sem usuário."""
    required_professional = serializers.PrimaryKeyRelatedField(queryset=Professional.objects.all())
    frequency_quantity = serializers.IntegerField(min_value=1)
    frequency_period = serializers.ChoiceField(choices=FrequencyPeriod.choices)
    resources = ResourceConfigurationSerializer(many=True, required=False)


class PlanResourceSerializer(serializers.ModelSerializer):
    resource_name = serializers.CharField(source='resource.name', read_only=True)

    class Meta:
        model = CarePlanNeedResource
        fields = ('id', 'resource', 'resource_name', 'quantity', 'observation')
        read_only_fields = fields


class PlanNeedSerializer(serializers.ModelSerializer):
    description = serializers.CharField(source='care_need.description', read_only=True)
    priority = serializers.CharField(source='care_need.priority', read_only=True)
    need_type_name = serializers.CharField(source='care_need.need_type.name', read_only=True)
    professional_name = serializers.CharField(source='required_professional.full_name', read_only=True, default=None)
    resources = PlanResourceSerializer(many=True, read_only=True)

    class Meta:
        model = CarePlanNeed
        fields = ('id', 'care_need', 'description', 'priority', 'need_type_name',
            'required_professional', 'professional_name', 'frequency_quantity', 'frequency_period',
            'resources', 'removed_at', 'removal_reason', 'removed_by')
        read_only_fields = fields


class PlanSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    need_links = PlanNeedSerializer(many=True, read_only=True)

    class Meta:
        model = CarePlan
        fields = ('id', 'patient', 'patient_name', 'status', 'start_date', 'end_date',
            'objective', 'created_by', 'updated_by', 'created_at', 'updated_at', 'need_links')
        read_only_fields = fields


class PlanCreateSerializer(serializers.Serializer):
    patient = serializers.PrimaryKeyRelatedField(queryset=Patient.objects.all())
    start_date = serializers.DateField()
    end_date = serializers.DateField(required=False, allow_null=True, default=None)
    objective = serializers.CharField(required=False, allow_blank=True, default='')
    needs = serializers.PrimaryKeyRelatedField(queryset=CareNeed.objects.all(), many=True, allow_empty=False)


class PlanUpdateSerializer(serializers.Serializer):
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False, allow_null=True)
    objective = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        forbidden = set(self.initial_data) - {'start_date', 'end_date', 'objective'}
        if forbidden:
            raise serializers.ValidationError({field: 'Campo não editável nesta operação.' for field in forbidden})
        return attrs


class AttachNeedSerializer(serializers.Serializer):
    care_need = serializers.PrimaryKeyRelatedField(queryset=CareNeed.objects.all())


class RemovalSerializer(serializers.Serializer):
    reason = serializers.CharField(allow_blank=False)


class HistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = CarePlanHistory
        fields = ('id', 'changed_by', 'actor_name', 'event_type', 'changed_at', 'description', 'previous_data', 'new_data')
        read_only_fields = fields
