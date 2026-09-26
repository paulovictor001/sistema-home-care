from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = (
        (None, {"fields": ("cpf", "password")}),
        ("Informacoes pessoais", {"fields": ("first_name", "last_name", "email")}),
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
                "fields": ("cpf", "password1", "password2"),
            },
        ),
    )
    list_display = ("cpf", "email", "first_name", "last_name", "is_staff")
    search_fields = ("cpf", "first_name", "last_name", "email")
    ordering = ("cpf",)
