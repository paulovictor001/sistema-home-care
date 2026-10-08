from rest_framework import serializers
from .models import CareScale, ScaleNeed
from care_plans.models import CarePlanNeed


class ScaleNeedSerializer(serializers.ModelSerializer):
    description = serializers.CharField(source='plan_need.care_need.description', read_only=True)
    need_type = serializers.CharField(source='plan_need.care_need.need_type.name', read_only=True)

    class Meta:
        model = ScaleNeed
        fields = ['id', 'plan_need', 'description', 'need_type', 'required_profession',
                  'planned_quantity', 'planned_period', 'frequency_quantity', 'frequency_period',
                  'frequency_reason', 'observation', 'removed_at']


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
