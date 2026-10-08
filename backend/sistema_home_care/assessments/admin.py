from django.contrib import admin

from .models import (
    AssessmentResource,
    CareNeed,
    CareNeedHistory,
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
    list_display = ("id", "assessment", "need_type", "priority", "status", "is_active")
    search_fields = ("description",)
    list_filter = ("priority", "status", "need_type", "is_active")
    readonly_fields = ("is_active", "inactivated_at")


@admin.register(CareNeedHistory)
class CareNeedHistoryAdmin(admin.ModelAdmin):
    list_display = ("need", "actor_name", "action", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AssessmentResource)
class AssessmentResourceAdmin(admin.ModelAdmin):
    list_display = ("id", "assessment", "resource", "quantity")
    search_fields = ("resource__name", "observation")
