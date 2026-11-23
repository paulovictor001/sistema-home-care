from rest_framework import serializers
from .models import CareScale, ScaleNeed, ScaleAssignment, ScaleStatus, ScaleAuditEvent, ScaleSubstitution
from professionals.models import Professional
from care_plans.models import CarePlanNeed
from care_plans.models import FrequencyPeriod


class StatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ScaleStatus.choices)


class PlanningInfoSerializer(serializers.Serializer):
    regions = serializers.ListField(child=serializers.CharField(max_length=100), required=False)
    availability_notes = serializers.CharField(allow_blank=True, required=False)

    def validate_regions(self, value):
        return list(dict.fromkeys(region.strip() for region in value))


class NeedConfigurationSerializer(serializers.Serializer):
    frequency_reason = serializers.CharField(allow_blank=True, required=False)
    frequency_quantity = serializers.IntegerField(min_value=1, required=False)
    frequency_period = serializers.ChoiceField(choices=FrequencyPeriod.choices, required=False)
    observation = serializers.CharField(allow_blank=True, required=False)

    def to_internal_value(self, data):
        unknown = set(data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({key: 'Campo não editável.' for key in unknown})
        return super().to_internal_value(data)


class AssignmentSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(source='professional.full_name', read_only=True)
    profession_name = serializers.CharField(source='professional.profession.name', read_only=True)

    class Meta:
        model = ScaleAssignment
        fields = ['id', 'professional', 'full_name', 'profession_name', 'created_at', 'removed_at']


class ProfessionalSerializer(serializers.Serializer):
    professional = serializers.PrimaryKeyRelatedField(queryset=Professional.objects.all())


class ProfessionalsSerializer(serializers.Serializer):
    professionals = serializers.PrimaryKeyRelatedField(queryset=Professional.objects.all(), many=True, allow_empty=False)


class ScaleNeedSerializer(serializers.ModelSerializer):
    assignments = AssignmentSerializer(many=True, read_only=True)
    description = serializers.CharField(source='plan_need.care_need.description', read_only=True)
    need_type = serializers.CharField(source='plan_need.care_need.need_type.name', read_only=True)

    class Meta:
        model = ScaleNeed
        fields = ['id', 'plan_need', 'description', 'need_type', 'required_profession',
                  'planned_quantity', 'planned_period', 'frequency_quantity', 'frequency_period',
                  'frequency_reason', 'observation', 'removed_at', 'assignments']


class AddNeedSerializer(serializers.Serializer):
    plan_need = serializers.PrimaryKeyRelatedField(queryset=CarePlanNeed.objects.all())


class ScaleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = CareScale
        fields = ['patient', 'care_plan', 'start_date', 'end_date', 'observation']
        extra_kwargs = {field: {'required': True, 'allow_null': False} for field in ('patient', 'care_plan', 'start_date', 'end_date')}

    def to_internal_value(self, data):
        unknown = set(data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({key: 'Campo não editável.' for key in unknown})
        return super().to_internal_value(data)


class ScaleSerializer(serializers.ModelSerializer):
    items = ScaleNeedSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = CareScale
        fields = ['id', 'patient', 'patient_name', 'care_plan', 'start_date', 'end_date',
                  'status', 'observation', 'created_by', 'updated_by', 'created_at', 'updated_at', 'items']
        read_only_fields = fields


class AuditSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScaleAuditEvent
        fields = ['id', 'actor', 'actor_name', 'action', 'created_at', 'previous_data', 'new_data']


class SubstitutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScaleSubstitution
        fields = ['id', 'item', 'previous_professional', 'new_professional',
                  'previous_name', 'new_name', 'actor', 'actor_name', 'created_at']
