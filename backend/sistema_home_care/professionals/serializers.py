from rest_framework import serializers

from .models import Professional, Team


class TeamSerializer(serializers.ModelSerializer):
    professionals = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Professional.objects.filter(is_active=True), required=False
    )
    members = serializers.SerializerMethodField()

    class Meta:
        model = Team
        fields = ("id", "name", "is_active", "professionals", "members", "created_at", "updated_at")
        read_only_fields = ("id", "is_active", "members", "created_at", "updated_at")

    def get_members(self, team):
        return [{"id": p.id, "name": p.full_name, "profession": p.profession.name}
                for p in team.professionals.select_related("profession").all()]
