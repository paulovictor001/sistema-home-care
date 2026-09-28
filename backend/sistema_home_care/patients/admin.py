from django.contrib import admin

from .models import HealthCondition, Patient, PatientAddress


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
