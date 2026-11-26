from django.contrib import admin

from .models import Professional, Team


@admin.register(Professional)
class ProfessionalAdmin(admin.ModelAdmin):
    list_display = ("full_name", "profession", "user", "is_active", "updated_at")
    search_fields = ("full_name", "user__cpf")
    list_filter = ("is_active", "profession")


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "is_active", "updated_at")
    search_fields = ("name",)
    list_filter = ("is_active",)
    filter_horizontal = ("professionals",)
