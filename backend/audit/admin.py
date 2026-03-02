from django.contrib import admin

from audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("action", "resource", "resource_id", "actor_user", "created_at")
    search_fields = ("action", "resource", "resource_id", "actor_user__email")
    list_filter = ("action", "resource")
