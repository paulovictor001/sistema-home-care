from django import forms
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models.deletion import ProtectedError

from .models import (
    Category,
    GranularPermission,
    Profession,
    User,
    UserAuditLog,
)
from .services import protected_deletion_message, save_profession
from professionals.models import Professional


class ManagedUserAdminForm(forms.ModelForm):
    class Meta:
        model = User
        fields = "__all__"

    def clean(self):
        cleaned = super().clean()
        category = cleaned.get("category")
        if category is None:
            return cleaned
        profession = Profession.objects.filter(category=category).first()
        if profession is None:
            self.add_error("category", "A categoria precisa estar vinculada a uma profissão.")
            return cleaned
        if self.instance.pk:
            linked = Professional.objects.filter(user=self.instance).select_related("profession").first()
            if linked and linked.profession_id != profession.pk:
                self.add_error("category", "A categoria acompanha a profissão do profissional vinculado.")
        return cleaned


class ProfessionAdminForm(forms.ModelForm):
    class Meta:
        model = Profession
        fields = "__all__"

    def clean_name(self):
        name = self.cleaned_data["name"]
        categories = Category.objects.filter(name=name)
        if self.instance.pk:
            categories = categories.exclude(pk=self.instance.category_id)
        if categories.exists():
            raise forms.ValidationError(
                "Já existe uma categoria avulsa com esse nome. Renomeie-a antes."
            )
        return name


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    form = ManagedUserAdminForm
    fieldsets = (
        (None, {"fields": ("cpf", "password")}),
        (
            "Informacoes pessoais",
            {"fields": ("first_name", "last_name", "email", "category")},
        ),
        (
            "Permissoes",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Datas importantes", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("cpf", "email", "category", "password1", "password2"),
            },
        ),
    )
    list_display = ("cpf", "email", "category", "first_name", "is_staff")
    search_fields = ("cpf", "first_name", "last_name", "email")
    list_filter = ("category", "is_active")
    ordering = ("cpf",)

    @transaction.atomic
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        profession = Profession.objects.filter(category=obj.category).first()
        if profession is None:
            raise DjangoValidationError("A categoria precisa estar vinculada a uma profissão.")
        linked = Professional.objects.filter(user=obj).first()
        if linked is None:
            Professional.objects.create(
                user=obj,
                full_name=f"{obj.first_name} {obj.last_name}".strip() or obj.cpf,
                profession=profession,
                is_active=obj.is_active,
            )
        elif linked.profession_id != profession.pk:
            raise DjangoValidationError("A categoria deve corresponder à profissão do profissional vinculado.")

    def delete_model(self, request, obj):
        from .services import delete_managed_user

        try:
            delete_managed_user(user=obj, actor=request.user)
        except ProtectedError as exc:
            raise DjangoValidationError(protected_deletion_message(exc)) from exc

    def delete_queryset(self, request, queryset):
        for obj in queryset.iterator():
            self.delete_model(request, obj)

@admin.register(Profession)
class ProfessionAdmin(admin.ModelAdmin):
    form = ProfessionAdminForm
    list_display = ("name", "is_active", "updated_at")
    search_fields = ("name",)
    list_filter = ("is_active",)

    def save_model(self, request, obj, form, change):
        if change:
            save_profession(
                profession=obj,
                name=obj.name,
                is_active=obj.is_active,
            )
        else:
            saved = save_profession(name=obj.name, is_active=obj.is_active)
            obj.pk = saved.pk


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "updated_at")
    search_fields = ("name",)
    filter_horizontal = ("permissions",)

    def get_readonly_fields(self, request, obj=None):
        fields = list(super().get_readonly_fields(request, obj))
        if obj is not None and Profession.objects.filter(category=obj).exists():
            fields.append("name")
        return fields

    def has_delete_permission(self, request, obj=None):
        if obj is not None and Profession.objects.filter(category=obj).exists():
            return False
        return super().has_delete_permission(request, obj)


@admin.register(GranularPermission)
class GranularPermissionAdmin(admin.ModelAdmin):
    list_display = ("codename", "feature", "action", "description")
    search_fields = ("codename", "feature", "action")
    list_filter = ("feature",)


@admin.register(UserAuditLog)
class UserAuditLogAdmin(admin.ModelAdmin):
    """Trilha minima de auditoria do usuario: somente leitura no admin."""

    list_display = ("user", "action", "actor", "created_at")
    list_filter = ("action",)
    search_fields = ("user__cpf", "actor__cpf")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
