"""Modelo de usuario customizado com CPF como login."""

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.db import models

from .validators import CPF_LENGTH, is_valid_cpf, normalize_cpf


def validate_cpf_field(value: str) -> None:
    """Validator de model field: exige CPF valido (11 digitos)."""
    if not is_valid_cpf(value or ""):
        raise ValidationError("CPF invalido.")


class CustomUserManager(BaseUserManager):
    use_in_migrations = True

    def _normalize_cpf(self, cpf: str) -> str:
        return normalize_cpf(cpf)

    def get_by_natural_key(self, cpf):
        """Permite login com CPF mascarado (admin, shell, backends)."""
        return self.get(cpf=normalize_cpf(cpf or ""))

    def create_user(self, cpf, password=None, **extra_fields):
        if not cpf:
            raise ValueError("O CPF e obrigatorio.")
        cpf = self._normalize_cpf(cpf)
        if not is_valid_cpf(cpf):
            raise ValueError("CPF invalido.")
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        user = self.model(cpf=cpf, **extra_fields)
        user.set_password(password)
        user.full_clean(exclude=("password",))
        user.save(using=self._db)
        return user

    def create_superuser(self, cpf, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser precisa de is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser precisa de is_superuser=True.")
        return self.create_user(cpf, password, **extra_fields)


class User(AbstractUser):
    """Usuario cujo login e o CPF (somente digitos)."""

    username = None
    cpf = models.CharField(
        max_length=CPF_LENGTH,
        unique=True,
        validators=[validate_cpf_field],
        help_text="CPF do profissional, somente digitos.",
    )

    USERNAME_FIELD = "cpf"
    REQUIRED_FIELDS = []

    objects = CustomUserManager()

    def clean(self):
        super().clean()
        self.cpf = normalize_cpf(self.cpf or "")

    def save(self, *args, **kwargs):
        self.cpf = normalize_cpf(self.cpf or "")
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.cpf
