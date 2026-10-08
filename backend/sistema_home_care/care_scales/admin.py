from django.contrib import admin
from .models import CareScale, ScaleAuditEvent, ScaleSubstitution


class ReadOnlyAdmin(admin.ModelAdmin):
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(CareScale, ReadOnlyAdmin)
admin.site.register(ScaleAuditEvent, ReadOnlyAdmin)
admin.site.register(ScaleSubstitution, ReadOnlyAdmin)
