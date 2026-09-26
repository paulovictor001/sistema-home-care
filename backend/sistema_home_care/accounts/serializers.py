from django.contrib.auth import authenticate
from rest_framework import serializers

from .validators import normalize_cpf, validate_cpf


class LoginSerializer(serializers.Serializer):
    cpf = serializers.CharField(max_length=14)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        try:
            cpf = validate_cpf(attrs.get("cpf", ""))
        except ValueError:
            raise serializers.ValidationError("CPF ou senha invalidos.")
        password = attrs.get("password", "")
        user = authenticate(cpf=cpf, password=password)
        if user is None:
            # Mensagem generica: nao revela se o CPF existe.
            raise serializers.ValidationError("CPF ou senha invalidos.")
        if not user.is_active:
            raise serializers.ValidationError("CPF ou senha invalidos.")
        attrs["user"] = user
        attrs["cpf"] = cpf
        return attrs
