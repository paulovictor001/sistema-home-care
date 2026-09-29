from django.contrib import admin

from .models import Professional


@admin.register(Professional)
class ProfessionalAdmin(admin.ModelAdmin):
    list_display = ("full_name", "profession", "user", "is_active", "updated_at")
    search_fields = ("full_name", "user__cpf")
    list_filter = ("is_active", "profession")
