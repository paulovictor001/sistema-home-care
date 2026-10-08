from django.contrib import admin
from .models import CarePlan, CarePlanHistory


@admin.register(CarePlan)
class CarePlanAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'status', 'start_date', 'end_date', 'updated_at')
    list_filter = ('status',)
    search_fields = ('patient__full_name', 'patient__cpf')
    readonly_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')

    # O fluxo de edição e auditoria será implementado nas tasks de API.
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CarePlanHistory)
class CarePlanHistoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'care_plan', 'changed_by', 'changed_at')
    search_fields = ('care_plan__patient__full_name', 'description')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
