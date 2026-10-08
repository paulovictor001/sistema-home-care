"""Serializers da Avaliação Inicial (DRF).

Cobre em nível de endpoint:
- TASK-AVL-BE-001 (TA-47): criação via `PatientAssessmentSerializer`.
- TASK-AVL-BE-002 (TA-48): obrigatórios no create — paciente,
  profissional, data, hora, tipo, motivo da solicitação e queixa
  principal (RN-AVL-003). Acumula todos os erros numa 400 única.
- TASK-AVL-BE-005/006 (TA-53/54): no update, gerente só pode enviar
  `professional` (outros campos → 403); clínico edita tudo.
- TASK-AVL-BE-007 (TA-51): `CareNeedSerializer` — `need_type` ativo,
  `description`/`priority` obrigatórias, `status` read-only (Identificada).
- TASK-AVL-BE-008 (TA-52): `AssessmentResourceSerializer` — só recurso
  existente, `quantity >= 1`.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from accounts.permissions import GroupNames
from patients.models import NeedTypeStatus, Patient

from .models import (
    AssessmentResource,
    AssessmentType,
    CareNeed,
    PatientAssessment,
    Resource,
)

User = get_user_model()

# Campos que o gerente pode alterar na avaliação (TASK-AVL-BE-006).
GERENTE_ALLOWED_UPDATE_FIELDS = ("professional",)


def _is_gerente(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and user.groups.filter(name=GroupNames.GERENTE).exists()
    )


def _has_granular(user, codename: str) -> bool:
    if not user or not user.is_authenticated:
        return False
    if getattr(user, "is_superuser", False):
        return True
    category = getattr(user, "category", None)
    if category is None:
        return False
    return category.permissions.filter(codename=codename).exists()


class CareNeedReadSerializer(serializers.ModelSerializer):
    need_type_name = serializers.CharField(
        source="need_type.name", read_only=True
    )

    class Meta:
        model = CareNeed
        fields = (
            "id",
            "need_type",
            "need_type_name",
            "description",
            "priority",
            "status",
            "created_at",
        )
        read_only_fields = fields


class AssessmentResourceReadSerializer(serializers.ModelSerializer):
    resource_name = serializers.CharField(
        source="resource.name", read_only=True
    )

    class Meta:
        model = AssessmentResource
        fields = (
            "id",
            "resource",
            "resource_name",
            "quantity",
            "observation",
            "created_at",
        )
        read_only_fields = fields


class PatientAssessmentSerializer(serializers.ModelSerializer):
    patient = serializers.PrimaryKeyRelatedField(
        queryset=Patient.objects.all(),
        required=False,
        allow_null=True,
    )
    professional = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    care_needs = CareNeedReadSerializer(many=True, read_only=True)
    assessment_resources = AssessmentResourceReadSerializer(
        many=True, read_only=True
    )

    class Meta:
        model = PatientAssessment
        fields = (
            "id",
            "patient",
            "professional",
            "assessment_type",
            "assessment_date",
            "assessment_time",
            "request_origin",
            "administrative_observations",
            "request_reason",
            "chief_complaint",
            "initial_need_description",
            "need_start_date",
            "anamnesis",
            "hda",
            "current_condition",
            "observations",
            "relevant_information",
            "conclusion",
            "recommendation",
            "care_needs",
            "assessment_resources",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_professional(self, value):
        """Profissional responsável deve ser MEDICO ou ENFERMEIRO."""
        if value is None:
            return value
        if not value.groups.filter(
            name__in=(GroupNames.MEDICO, GroupNames.ENFERMEIRO)
        ).exists():
            raise serializers.ValidationError(
                "Profissional responsável deve ser um usuário do grupo "
                "MEDICO ou ENFERMEIRO."
            )
        return value

    def validate_assessment_type(self, value):
        if value and value != AssessmentType.INITIAL:
            raise serializers.ValidationError(
                "Tipo de avaliação inválido. Use 'Avaliação inicial'."
            )
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if self.instance is None:
            # Criação (TASK-AVL-BE-002): acumula todos os obrigatórios.
            errors = {}
            if attrs.get("patient") is None:
                errors["patient"] = "Obrigatório no cadastro."
            if attrs.get("professional") is None:
                errors["professional"] = "Obrigatório no cadastro."
            if attrs.get("assessment_date") is None:
                errors["assessment_date"] = "Obrigatório no cadastro."
            if attrs.get("assessment_time") is None:
                errors["assessment_time"] = "Obrigatório no cadastro."
            if not (attrs.get("request_reason") or "").strip():
                errors["request_reason"] = "Obrigatório no cadastro."
            if not (attrs.get("chief_complaint") or "").strip():
                errors["chief_complaint"] = "Obrigatório no cadastro."
            if errors:
                raise serializers.ValidationError(errors)
            return attrs
        # Edição (TASK-AVL-BE-005/006).
        if request is not None and _is_gerente(request.user):
            touched = set(self.initial_data or {})
            disallowed = touched - set(GERENTE_ALLOWED_UPDATE_FIELDS)
            if disallowed:
                raise PermissionDenied(
                    "Gerente pode alterar apenas o profissional responsável."
                )
            if "professional" in touched and not _has_granular(
                request.user, "avaliacoes.change_professional"
            ):
                raise PermissionDenied(
                    "Sua categoria não tem permissão para esta operação."
                )
        return attrs


class CareNeedSerializer(serializers.ModelSerializer):
    need_type_name = serializers.CharField(source="need_type.name", read_only=True)

    class Meta:
        model = CareNeed
        fields = (
            "id",
            "assessment",
            "need_type",
            "need_type_name",
            "description",
            "priority",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "assessment", "status", "created_at", "updated_at")

    def validate_description(self, value):
        if not (value or "").strip():
            raise serializers.ValidationError("Descrição é obrigatória.")
        return (value or "").strip()

    def validate_need_type(self, value):
        # Um tipo inativado continua válido no vínculo histórico existente.
        if self.instance is not None and value.pk == self.instance.need_type_id:
            return value
        if value is not None and value.status != NeedTypeStatus.ACTIVE:
            raise serializers.ValidationError(
                "Tipo de necessidade inativo não pode ser usado."
            )
        return value


class AssessmentResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssessmentResource
        fields = (
            "id",
            "resource",
            "quantity",
            "observation",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
        extra_kwargs = {"quantity": {"min_value": 1}}


class ResourceCatalogSerializer(serializers.ModelSerializer):
    """Catálogo read-only p/ o select da avaliação (TA-63/TASK-AVL-FE-006).

    Somente leitura: cadastro detalhado pendente (stub mínimo como
    HealthCondition); criação/edição pelo admin (ResourceAdmin).
    """

    class Meta:
        model = Resource
        fields = ("id", "name")
        read_only_fields = fields
