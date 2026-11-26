"""Serializers do Cadastro do Paciente.

Cobre em nivel de endpoint (DRF):
- TASK-CAD-PAC-004/031: `responsible_doctor` deve ser usuario do grupo
  MEDICO (checagem via `accounts.permissions.GroupNames`).
- `responsible_team` referencia uma equipe ativa cadastrada no modulo de
  profissionais.
- TASK-CAD-PAC-008: no cadastro, `responsible_doctor`, `health_condition`
  e `address` sao obrigatorios; CPF normalizado antes da validacao de
  unicidade (mascara nao burla duplicado).
- TASK-CAD-PAC-011/020: no update, `status` e read-only (sai pelas actions
  inativar/reativar) e somente gerente pode enviar `responsible_doctor` /
  `responsible_team` (outros perfis recebem 403; GERENTE também precisa
  da permissão granular `pacientes.update_manager`).
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied

from accounts.permissions import GroupNames
from accounts.validators import normalize_cpf
from professionals.models import Team
from geography.models import Neighborhood

from .models import Patient, PatientAddress

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
    neighborhood_id = serializers.PrimaryKeyRelatedField(source="neighborhood_record", queryset=Neighborhood.objects.filter(is_active=True), required=False, allow_null=True)
    region = serializers.SerializerMethodField()
    region_id = serializers.IntegerField(source="neighborhood_record.region_id", read_only=True, allow_null=True)
    legacy_region = serializers.CharField(source="region", read_only=True)
    class Meta:
        model = PatientAddress
        exclude = ("id", "patient", "neighborhood_record")
        read_only_fields = ("region", "region_id", "legacy_region")

    def get_region(self, address):
        if address.neighborhood_record_id:
            return address.neighborhood_record.region.name
        return address.region

    def validate(self, attrs):
        neighborhood = attrs.get('neighborhood_record')
        state = attrs.get('state', getattr(self.instance, 'state', ''))
        city = attrs.get('city', getattr(self.instance, 'city', ''))
        name = attrs.get('neighborhood', getattr(self.instance, 'neighborhood', ''))
        if neighborhood and (neighborhood.state.casefold() != state.casefold() or neighborhood.city.casefold() != city.casefold() or neighborhood.name.casefold() != name.casefold()):
            raise serializers.ValidationError({'neighborhood_id': 'O bairro cadastrado deve corresponder ao bairro, município e UF do endereço.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('region', None)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data.pop('region', None)
        return super().update(instance, validated_data)


class PatientSerializer(serializers.ModelSerializer):
    address = PatientAddressSerializer(required=False)
    gender = serializers.CharField()
    responsible_doctor = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, allow_null=True
    )
    health_condition = serializers.CharField(
        max_length=2000,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )
    responsible_doctor_name = serializers.SerializerMethodField()
    responsible_team = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.filter(is_active=True), required=False, allow_null=True
    )
    responsible_team_name = serializers.SerializerMethodField()

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
            "responsible_doctor_name",
            "responsible_team",
            "responsible_team_name",
            "health_condition",
            "allergies",
            "restrictions",
            "special_needs",
            "important_observations",
            "address",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id", "status", "created_at", "updated_at",
            "responsible_doctor_name",
        )

    def get_responsible_doctor_name(self, patient):
        doctor = patient.responsible_doctor
        if doctor is None:
            return None
        return f"{doctor.first_name} {doctor.last_name}".strip() or doctor.cpf

    def get_responsible_team_name(self, patient):
        return patient.responsible_team.name if patient.responsible_team_id else None

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

    def validate_gender(self, value):
        allowed = {"Masculino", "Feminino", "Prefiro não dizer"}
        if value in allowed:
            return value
        if self.instance is not None and value == self.instance.gender:
            return value
        raise serializers.ValidationError(
            "Selecione Masculino, Feminino ou Prefiro não dizer."
        )

    def validate(self, attrs):
        request = self.context.get("request")
        if self.instance is None:
            # Cadastro (TASK-CAD-PAC-008): relacionamentos obrigatorios.
            # Acumula todos os erros para o cliente corrigir de uma vez.
            errors = {}
            for field in ("responsible_doctor", "health_condition"):
                if attrs.get(field) is None:
                    errors[field] = "Obrigatorio no cadastro."
            if not attrs.get("health_condition", "").strip():
                errors["health_condition"] = "Informe ao menos uma condição de saúde."
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
