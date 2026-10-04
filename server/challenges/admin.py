from django.contrib import admin

from .models import Challenge


@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "event_at", "place", "is_active", "created_by")
    list_filter = ("is_active", "category")
    search_fields = ("title", "place", "description")
