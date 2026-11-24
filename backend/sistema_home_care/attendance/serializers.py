from rest_framework import serializers

from .models import Attendance, AttendanceHistory


class AttendanceSerializer(serializers.ModelSerializer):
    history = serializers.SerializerMethodField()

    class Meta:
        model = Attendance
        fields = ["id", "visit", "care_description", "notes", "created_by", "created_at", "updated_at", "history"]
        read_only_fields = ["id", "visit", "created_by", "created_at", "updated_at", "history"]

    def get_history(self, obj):
        return AttendanceHistorySerializer(obj.history.all(), many=True).data


class AttendanceHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceHistory
        fields = ["id", "actor_name", "event_type", "changed_at", "previous_data", "new_data"]


class AttendanceWriteSerializer(serializers.Serializer):
    care_description = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)
    notes = serializers.CharField(required=False, allow_blank=True, trim_whitespace=True)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError("Informe ao menos um campo para salvar.")
        return attrs
