from django.contrib import admin

from .models import (
    AssessmentResource,
    CareNeed,
    PatientAssessment,
    Resource,
)


@admin.register(PatientAssessment)
class PatientAssessmentAdmin(admin.ModelAdmin):
    list_display = ("id", "patient", "professional", "assessment_type", "assessment_date")
    search_fields = ("patient__full_name", "patient__cpf")
    list_filter = ("assessment_type", "assessment_date")


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ("name", "updated_at")
    search_fields = ("name",)


@admin.register(CareNeed)
class CareNeedAdmin(admin.ModelAdmin):
    list_display = ("id", "assessment", "need_type", "priority", "status")
    search_fields = ("description",)
    list_filter = ("priority", "status", "need_type")


@admin.register(AssessmentResource)
class AssessmentResourceAdmin(admin.ModelAdmin):
    list_display = ("id", "assessment", "resource", "quantity")
    search_fields = ("resource__name", "observation")
