from rest_framework import serializers
from .models import CareScale


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
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = CareScale
        fields = ['id', 'patient', 'patient_name', 'care_plan', 'start_date', 'end_date',
                  'status', 'observation', 'created_by', 'updated_by', 'created_at', 'updated_at']
        read_only_fields = fields
