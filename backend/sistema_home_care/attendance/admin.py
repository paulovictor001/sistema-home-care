from django.contrib import admin

from .models import Attendance, AttendanceHistory


class AttendanceHistoryInline(admin.TabularInline):
    model = AttendanceHistory
    extra = 0
    can_delete = False
    readonly_fields = ["actor", "actor_name", "event_type", "changed_at", "previous_data", "new_data"]


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ["id", "visit", "created_by", "created_at", "updated_at"]
    readonly_fields = [
        "visit", "care_description", "notes", "created_by", "created_at", "updated_at"
    ]
    inlines = [AttendanceHistoryInline]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AttendanceHistory)
class AttendanceHistoryAdmin(admin.ModelAdmin):
    list_display = ["id", "attendance", "event_type", "actor_name", "changed_at"]
    readonly_fields = ["attendance", "actor", "actor_name", "event_type", "changed_at", "previous_data", "new_data"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
