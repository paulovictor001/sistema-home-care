"""Serializers das Necessidades Identificadas."""

from rest_framework import serializers

from patients.models import NeedType, NeedTypeStatus

from .models import CareNeed, NeedStatus


class CareNeedSerializer(serializers.ModelSerializer):
    """Serializer para criacao e representacao de uma necessidade."""

    need_type = serializers.PrimaryKeyRelatedField(queryset=NeedType.objects.all())

    class Meta:
        model = CareNeed
        fields = (
            "id",
            "assessment",
            "need_type",
            "description",
            "priority",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "assessment",
            "status",
            "created_at",
            "updated_at",
        )

    def validate_need_type(self, value):
        if value.status != NeedTypeStatus.ACTIVE:
            raise serializers.ValidationError(
                "Tipo de necessidade inativo não pode ser usado em uma nova necessidade."
            )
        return value

    def validate_description(self, value):
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Descrição é obrigatória.")
        return value

    def create(self, validated_data):
        validated_data["status"] = NeedStatus.IDENTIFIED
        return super().create(validated_data)
