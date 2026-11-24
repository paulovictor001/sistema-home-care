from rest_framework import serializers

from .models import ProfessionalWeeklyAvailability, Visit, VisitHistory


class VisitSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    professional_name = serializers.CharField(source="professional.full_name", read_only=True)
    care_scale_id = serializers.IntegerField(read_only=True)
    scale_need_id = serializers.IntegerField(read_only=True)
    plan_need_description = serializers.CharField(source="plan_need.care_need.description", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    history = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()

    class Meta:
        model = Visit
        fields = ["id", "patient", "patient_name", "care_plan", "plan_need", "plan_need_description",
            "care_scale", "care_scale_id", "scale_need", "scale_need_id", "professional", "professional_name",
            "visit_date", "start_time", "end_time", "visit_type", "status", "observation", "address",
            "created_by", "created_by_name", "confirmed_by", "confirmed_at", "cancellation_reason", "not_realized_reason",
            "started_by", "started_at", "finished_by", "finished_at", "created_at", "updated_at", "history"]

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    def get_address(self, obj):
        return {key.removeprefix("address_"): getattr(obj, key) for key in (
            "address_zip_code", "address_state", "address_city", "address_neighborhood", "address_street",
            "address_number", "address_complement", "address_reference_point", "address_region")}

    def get_history(self, obj):
        return VisitHistorySerializer(obj.history.all(), many=True).data


class VisitHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = VisitHistory
        fields = ["id", "actor_name", "event_type", "changed_at", "previous_data", "new_data"]


class VisitCreateSerializer(serializers.Serializer):
    care_scale = serializers.IntegerField(min_value=1)
    scale_need = serializers.IntegerField(min_value=1)
    professional = serializers.IntegerField(min_value=1)
    visit_date = serializers.DateField()
    start_time = serializers.TimeField()
    end_time = serializers.TimeField()
    observation = serializers.CharField(required=False, allow_blank=True)
    visit_type = serializers.CharField(required=False, default="Atendimento domiciliar")


class VisitSeriesSerializer(VisitCreateSerializer):
    visit_dates = serializers.ListField(child=serializers.DateField(), allow_empty=False)
    visit_date = None


class VisitEditSerializer(serializers.Serializer):
    visit_date = serializers.DateField(required=False)
    start_time = serializers.TimeField(required=False)
    end_time = serializers.TimeField(required=False)
    observation = serializers.CharField(required=False, allow_blank=True)
    visit_type = serializers.CharField(required=False)
    address = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False)


class TransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=[("CONFIRMADA", "Confirmada"), ("EM_ATENDIMENTO", "Em atendimento"),
        ("CANCELADA", "Cancelada"), ("NAO_REALIZADA", "Não realizada")])
    reason = serializers.CharField(required=False, allow_blank=True)


class AvailabilitySerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    class Meta:
        model = ProfessionalWeeklyAvailability
        fields = ["id", "weekday", "start_time", "end_time"]
