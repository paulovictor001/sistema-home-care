"""Serializers do Gerenciamento de Usuarios.

Regras aplicadas:
- CPF normalizado antes da validacao de unicidade (mascara nao burla).
- E-mail unico e obrigatorio.
- Categoria obrigatoria e exatamente uma; deve corresponder a profissao
  do profissional vinculado.
- Profissional obrigatorio no cadastro (`professional_id` existente livre
  ou bloco `professional` inline); imutavel na edicao.
- `is_active` read-only (sai pelas actions inativar/reativar).
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from professionals.models import Professional

from .models import Category, GranularPermission, Profession, UserAuditAction
from .services import create_managed_user, log_user_event
from .validators import is_valid_cpf, normalize_cpf

User = get_user_model()


class GranularPermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GranularPermission
        fields = ("id", "feature", "action", "codename", "description")
        read_only_fields = fields


class CategorySerializer(serializers.ModelSerializer):
    permissions = GranularPermissionSerializer(many=True, read_only=True)
    permission_ids = serializers.PrimaryKeyRelatedField(
        queryset=GranularPermission.objects.all(),
        many=True,
        write_only=True,
        required=False,
    )
    users_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = (
            "id",
            "name",
            "permissions",
            "permission_ids",
            "users_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def update(self, instance, validated_data):
        permission_ids = validated_data.pop("permission_ids", None)
        instance = super().update(instance, validated_data)
        if permission_ids is not None:
            instance.permissions.set(permission_ids)
        return instance


class ProfessionSerializer(serializers.ModelSerializer):
    professionals_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Profession
        fields = (
            "id",
            "name",
            "is_active",
            "professionals_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")
    # Categoria espelho e criada em `Profession.save()` (sem permissoes).


class ProfessionalReadSerializer(serializers.ModelSerializer):
    profession = ProfessionSerializer(read_only=True)

    class Meta:
        model = Professional
        fields = ("id", "full_name", "profession", "is_active")


class ProfessionalInlineSerializer(serializers.Serializer):
    """Criacao do profissional durante o cadastro do usuario."""

    full_name = serializers.CharField(max_length=255)
    profession = serializers.PrimaryKeyRelatedField(
        queryset=Profession.objects.all()
    )


class UserSerializer(serializers.ModelSerializer):
    category_detail = CategorySerializer(source="category", read_only=True)
    professional_detail = ProfessionalReadSerializer(
        source="professional", read_only=True
    )
    professional_id = serializers.IntegerField(write_only=True, required=False)
    professional = ProfessionalInlineSerializer(write_only=True, required=False)
    password = serializers.CharField(
        write_only=True, required=False, style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = (
            "id",
            "cpf",
            "email",
            "first_name",
            "last_name",
            "category",
            "category_detail",
            "professional_detail",
            "professional_id",
            "professional",
            "password",
            "is_active",
            "date_joined",
        )
        read_only_fields = ("id", "is_active", "date_joined")
        extra_kwargs = {
            "category": {"required": False},
            "email": {"required": False},
        }

    def validate_cpf(self, value):
        cpf = normalize_cpf(value or "")
        if not is_valid_cpf(cpf):
            raise serializers.ValidationError("CPF invalido.")
        return cpf

    def validate(self, attrs):
        if self.instance is None:
            errors = {}
            if not attrs.get("email"):
                errors["email"] = "E-mail obrigatorio."
            if attrs.get("category") is None:
                errors["category"] = "Categoria obrigatoria."
            if not attrs.get("password"):
                errors["password"] = "Senha obrigatoria."
            has_link = (
                attrs.get("professional_id") is not None
                or attrs.get("professional") is not None
            )
            if not has_link:
                errors["professional"] = "Profissional vinculado obrigatorio."
            if errors:
                raise serializers.ValidationError(errors)
            try:
                validate_password(attrs.get("password", ""))
            except DjangoValidationError as exc:
                raise serializers.ValidationError({"password": list(exc.messages)})
        else:
            # Edicao: profissional e categoria sao imutaveis por aqui
            # (categoria acompanha a profissao via transferencia).
            initial = self.initial_data or {}
            if "professional_id" in initial or "professional" in initial:
                raise serializers.ValidationError(
                    {"professional": "Nao e permitido trocar o profissional."}
                )
            if "category" in initial:
                current = self.instance.category_id
                sent = initial.get("category")
                try:
                    sent_id = int(sent) if sent is not None else None
                except (TypeError, ValueError):
                    sent_id = None
                if sent_id != current:
                    raise serializers.ValidationError(
                        {
                            "category": (
                                "Categoria acompanha a profissao; "
                                "use a transferencia de profissao."
                            )
                        }
                    )
            if "password" in initial and initial.get("password"):
                try:
                    validate_password(initial.get("password"))
                except DjangoValidationError as exc:
                    raise serializers.ValidationError(
                        {"password": list(exc.messages)}
                    )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        actor = request.user if request is not None else None
        professional_id = validated_data.pop("professional_id", None)
        professional_data = validated_data.pop("professional", None)
        password = validated_data.pop("password")
        try:
            user, _professional = create_managed_user(
                cpf=validated_data.get("cpf"),
                password=password,
                email=validated_data.get("email"),
                category=validated_data.get("category"),
                first_name=validated_data.get("first_name", ""),
                last_name=validated_data.get("last_name", ""),
                professional_id=professional_id,
                professional_data=professional_data,
                actor=actor,
            )
        except ValueError as exc:
            raise serializers.ValidationError({"professional": str(exc)})
        except DjangoValidationError as exc:
            raise serializers.ValidationError(
                exc.message_dict if hasattr(exc, "message_dict") else str(exc)
            )
        return user

    def update(self, instance, validated_data):
        request = self.context.get("request")
        actor = request.user if request is not None else None
        validated_data.pop("professional_id", None)
        validated_data.pop("professional", None)
        validated_data.pop("category", None)
        password = validated_data.pop("password", None)
        instance = super().update(instance, validated_data)
        if password:
            instance.set_password(password)
            instance.save(update_fields=["password"])
        log_user_event(
            user=instance,
            actor=actor,
            action=UserAuditAction.UPDATE,
            changes={"id": instance.pk},
        )
        return instance


class ProfessionTransferSerializer(serializers.Serializer):
    to_profession_id = serializers.PrimaryKeyRelatedField(
        queryset=Profession.objects.all(), source="to_profession"
    )
