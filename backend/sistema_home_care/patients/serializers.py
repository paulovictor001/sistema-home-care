"""Serializers do Cadastro do Paciente.

Cobre em nivel de endpoint (DRF):
- TASK-CAD-PAC-004/031: `responsible_doctor` deve ser usuario do grupo
  MEDICO (checagem via `accounts.permissions.GroupNames`).
- TASK-CAD-PAC-005: `responsible_team` aceito como JSON livre provisorio
  (sem validacao de conteudo; estrutura real no modulo de profissionais).
- TASK-CAD-PAC-008: no cadastro, `responsible_doctor`, `health_condition`
  e `address` sao obrigatorios; CPF normalizado antes da validacao de
  unicidade (mascara nao burla duplicado).
- TASK-CAD-PAC-011/020: no update, `status` e read-only (sai pelas actions
  inativar/reativar) e somente gerente pode enviar `responsible_doctor` /
  `responsible_team` (outros perfis recebem 403).
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from accounts.permissions import GroupNames
from accounts.validators import normalize_cpf

from .models import HealthCondition, NeedType, Patient, PatientAddress

User = get_user_model()

# Campos que somente gerente pode alterar (TASK-CAD-PAC-011/020).
GERENTE_ONLY_FIELDS = ("responsible_doctor", "responsible_team")


def _is_gerente(user) -> bool:
    return bool(
        user
        and user.is_authenticated
        and user.groups.filter(name=GroupNames.GERENTE).exists()
    )


class PatientAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = PatientAddress
        exclude = ("id", "patient")


class PatientSerializer(serializers.ModelSerializer):
    address = PatientAddressSerializer(required=False)
    responsible_doctor = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    health_condition = serializers.PrimaryKeyRelatedField(
        queryset=HealthCondition.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Patient
        fields = (
            "id",
            "full_name",
            "birth_date",
            "cpf",
            "rg",
            "age",
            "phone",
            "gender",
            "status",
            "responsible_doctor",
            "responsible_team",
            "health_condition",
            "address",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "status", "created_at", "updated_at")

    def validate_cpf(self, value):
        """Normaliza antes do UniqueValidator (TASK-CAD-PAC-006/029)."""
        return normalize_cpf(value or "")

    def validate_responsible_doctor(self, value):
        """Medico responsavel deve ser usuario do grupo MEDICO (TA-5)."""
        if value is None:
            return value
        if not value.groups.filter(name=GroupNames.MEDICO).exists():
            raise serializers.ValidationError(
                "Medico responsavel deve ser um usuario do grupo MEDICO."
            )
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        if self.instance is None:
            # Cadastro (TASK-CAD-PAC-008): relacionamentos obrigatorios.
            # Acumula todos os erros para o cliente corrigir de uma vez.
            errors = {}
            for field in ("responsible_doctor", "health_condition"):
                if attrs.get(field) is None:
                    errors[field] = "Obrigatorio no cadastro."
            if "address" not in attrs:
                errors["address"] = "Endereco obrigatorio no cadastro."
            if errors:
                raise serializers.ValidationError(errors)
        elif request is not None and not _is_gerente(request.user):
            # Edicao por medico/enfermeiro (TASK-CAD-PAC-011/020).
            touched = set(self.initial_data or {}) & set(GERENTE_ONLY_FIELDS)
            if touched:
                raise PermissionDenied(
                    "Somente gerente pode alterar medico/equipe responsavel."
                )
        return attrs

    def create(self, validated_data):
        address_data = validated_data.pop("address")
        patient = Patient.objects.create(**validated_data)
        PatientAddress.objects.create(patient=patient, **address_data)
        return patient

    def update(self, instance, validated_data):
        address_data = validated_data.pop("address", None)
        instance = super().update(instance, validated_data)
        if address_data is not None:
            PatientAddress.objects.update_or_create(
                patient=instance, defaults=address_data
            )
        return instance


class NeedTypeStatusSerializer(serializers.ModelSerializer):
    """Representacao dos dados de um tipo para as acoes de status."""

    class Meta:
        model = NeedType
        fields = (
            "id",
            "name",
            "description",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
