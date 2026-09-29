from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    Category,
    GranularPermission,
    Profession,
    User,
    UserAuditLog,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
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


@admin.register(Profession)
class ProfessionAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "updated_at")
    search_fields = ("name",)
    list_filter = ("is_active",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "updated_at")
    search_fields = ("name",)
    filter_horizontal = ("permissions",)


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
