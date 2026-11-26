from django.contrib import admin
from .models import Neighborhood, Region

@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')
    search_fields = ('name',)

@admin.register(Neighborhood)
class NeighborhoodAdmin(admin.ModelAdmin):
    list_display = ('name', 'city', 'state', 'region', 'is_active')
    list_filter = ('state', 'region', 'is_active')
    search_fields = ('name', 'city')
