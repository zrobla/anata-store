from rest_framework import serializers

from audit.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = [
            "id",
            "actor_user",
            "action",
            "resource",
            "resource_id",
            "before_json",
            "after_json",
            "request_id",
            "ip_address",
            "created_at",
        ]
