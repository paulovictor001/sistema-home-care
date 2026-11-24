from django.contrib import admin

from .models import NeedType


@admin.register(NeedType)
class NeedTypeAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "updated_at")
    search_fields = ("name",)
    list_filter = ("status",)

    def _can_manage(self, request):
        from .permissions import type_management_permissions
        return all(permission.has_permission(request, self)
                   for permission in type_management_permissions())

    def has_module_permission(self, request):
        return self._can_manage(request)

    def has_view_permission(self, request, obj=None):
        return self._can_manage(request)

    def has_add_permission(self, request):
        return self._can_manage(request)

    def has_change_permission(self, request, obj=None):
        return self._can_manage(request)

    def has_delete_permission(self, request, obj=None):
        return self._can_manage(request)

from .models import (
    AssessmentResource,
    PatientAssessmentAuditLog,
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


@admin.register(PatientAssessmentAuditLog)
class PatientAssessmentAuditLogAdmin(admin.ModelAdmin):
    list_display = ("assessment", "actor_name", "action", "created_at")
    list_filter = ("action", "created_at")
    search_fields = ("actor_name", "assessment__patient__full_name")
    readonly_fields = ("assessment", "actor", "actor_name", "action", "changes", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


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
