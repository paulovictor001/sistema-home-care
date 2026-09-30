from django.contrib import admin

from .models import (
    HealthCondition,
    NeedType,
    Patient,
    PatientAddress,
    PatientAuditLog,
)


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("full_name", "cpf", "status", "updated_at")
    search_fields = ("full_name", "cpf")
    list_filter = ("status",)


@admin.register(PatientAddress)
class PatientAddressAdmin(admin.ModelAdmin):
    list_display = ("patient", "city", "neighborhood", "region")
    search_fields = ("patient__full_name", "patient__cpf", "city", "neighborhood")
    list_filter = ("state",)


@admin.register(HealthCondition)
class HealthConditionAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at", "updated_at")


@admin.register(NeedType)
class NeedTypeAdmin(admin.ModelAdmin):
    """Tipos de necessidade (TA-73): criação/edição e ativa/inativa."""

    list_display = ("name", "status", "updated_at")
    search_fields = ("name",)
    list_filter = ("status",)


@admin.register(PatientAuditLog)
class PatientAuditLogAdmin(admin.ModelAdmin):
    """Trilha minima de auditoria (TA-37): somente leitura no admin."""

    list_display = ("patient", "action", "actor", "created_at")
    list_filter = ("action",)
    search_fields = ("patient__full_name", "patient__cpf")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
