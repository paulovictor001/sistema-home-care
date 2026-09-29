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

    #: Categoria padrao para usuarios criados sem categoria explicita
    #: (shell, createsuperuser). A API exige categoria explicita.
    DEFAULT_CATEGORY_NAME = "Gerente"

    def _normalize_cpf(self, cpf: str) -> str:
        return normalize_cpf(cpf)

    def _default_category(self):
        """Categoria padrao (criada sob demanda) + profissao espelho."""
        Category = self.model._meta.apps.get_model("accounts", "Category")
        Profession = self.model._meta.apps.get_model("accounts", "Profession")
        Profession.objects.get_or_create(
            name=self.DEFAULT_CATEGORY_NAME, defaults={"is_active": True}
        )
        category, _ = Category.objects.get_or_create(
            name=self.DEFAULT_CATEGORY_NAME
        )
        return category

    def get_by_natural_key(self, cpf):
        """Permite login com CPF mascarado (admin, shell, backends)."""
        return self.get(cpf=normalize_cpf(cpf or ""))

    def create_user(self, cpf, password=None, email=None, category=None, **extra_fields):
        if not cpf:
            raise ValueError("O CPF e obrigatorio.")
        cpf = self._normalize_cpf(cpf)
        if not is_valid_cpf(cpf):
            raise ValueError("CPF invalido.")
        if not email:
            raise ValueError("O e-mail e obrigatorio.")
        if category is None:
            category = self._default_category()
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        user = self.model(cpf=cpf, email=email, category=category, **extra_fields)
        user.set_password(password)
        user.full_clean(exclude=("password",))
        user.save(using=self._db)
        return user

    def create_superuser(self, cpf, password=None, email=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser precisa de is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser precisa de is_superuser=True.")
        user = self.create_user(cpf, password, email=email, **extra_fields)
        # Bootstrap: grupo + categoria GERENTE e profissional vinculado.
        from django.contrib.auth.models import Group

        group, _ = Group.objects.get_or_create(name="GERENTE")
        user.groups.add(group)
        Professional = self.model._meta.apps.get_model(
            "professionals", "Professional"
        )
        Profession = self.model._meta.apps.get_model("accounts", "Profession")
        profession, _ = Profession.objects.get_or_create(
            name=self.DEFAULT_CATEGORY_NAME, defaults={"is_active": True}
        )
        Professional.objects.get_or_create(
            user=user,
            defaults={
                "full_name": f"{user.first_name} {user.last_name}".strip()
                or user.cpf,
                "profession": profession,
                "is_active": True,
            },
        )
        return user


class User(AbstractUser):
    """Usuario cujo login e o CPF (somente digitos)."""

    username = None
    cpf = models.CharField(
        max_length=CPF_LENGTH,
        unique=True,
        validators=[validate_cpf_field],
        help_text="CPF do profissional, somente digitos.",
    )
    email = models.EmailField(
        unique=True,
        help_text="E-mail do usuario (unico, usado para contato/recuperacao).",
    )
    # Exatamente uma categoria por usuario (RN-USU). PROTECT: categoria com
    # usuarios nao pode ser excluida. Legado: `groups` continua espelhado
    # (GERENTE/MEDICO/ENFERMEIRO) ate os endpoints clinicos migrarem.
    category = models.ForeignKey(
        "accounts.Category",
        on_delete=models.PROTECT,
        related_name="users",
        help_text="Categoria do usuario (corresponde a profissao).",
    )

    USERNAME_FIELD = "cpf"
    REQUIRED_FIELDS = ["email"]

    objects = CustomUserManager()

    def clean(self):
        super().clean()
        self.cpf = normalize_cpf(self.cpf or "")

    def save(self, *args, **kwargs):
        self.cpf = normalize_cpf(self.cpf or "")
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.cpf


class GranularPermission(models.Model):
    """Permissao granular do catalogo (funcionalidade + acao).

    Ex.: feature="usuarios", action="create" -> codename="usuarios.create".
    O Gerente atribui estas permissoes as categorias; categorias novas
    comecam sem permissoes.
    """

    feature = models.CharField(max_length=50)
    action = models.CharField(max_length=50)
    codename = models.CharField(max_length=120, unique=True)
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "granular_permissions"
        ordering = ["feature", "action"]
        constraints = [
            models.UniqueConstraint(
                fields=["feature", "action"], name="uniq_permission_feature_action"
            )
        ]

    def save(self, *args, **kwargs):
        if not self.codename:
            self.codename = f"{self.feature}.{self.action}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.codename


class Category(models.Model):
    """Categoria do usuario (flexivel, nao limitada a cargos fixos).

    Espelha a profissao homonima: ao criar uma profissao, a categoria e
    criada automaticamente e comeca sem permissoes.
    """

    name = models.CharField(max_length=100, unique=True)
    permissions = models.ManyToManyField(
        GranularPermission, blank=True, related_name="categories"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Profession(models.Model):
    """Profissao cadastravel (somente o Gerente administra)."""

    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "professions"
        ordering = ["name"]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Categoria espelho criada automaticamente, sem permissoes.
        Category.objects.get_or_create(name=self.name)

    def __str__(self):
        return self.name


class UserAuditAction(models.TextChoices):
    CREATE = "CREATE", "Criação"
    UPDATE = "UPDATE", "Edição"
    INACTIVATE = "INACTIVATE", "Inativação"
    REACTIVATE = "REACTIVATE", "Reativação"
    DELETE = "DELETE", "Exclusão definitiva"
    PROFESSION_CHANGE = "PROFESSION_CHANGE", "Troca de profissão"
    CATEGORY_CHANGE = "CATEGORY_CHANGE", "Troca de categoria"


class UserAuditLog(models.Model):
    """Trilha minima de auditoria do usuario.

    `user` e `actor` usam SET_NULL para preservar a trilha apos a
    exclusao fisica do usuario/ator (exclusao definitiva em cascata).
    """

    user = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="audit_subject_logs",
    )
    actor = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="user_audit_logs",
    )
    action = models.CharField(max_length=20, choices=UserAuditAction.choices)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_audit_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"UserAuditLog #{self.pk} {self.action}"
