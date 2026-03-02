from rest_framework import permissions, viewsets

from accounts.permissions import HasPermissionKey
from audit.models import AuditLog
from audit.serializers import AuditLogSerializer


class SellerAuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("actor_user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermissionKey]
    required_permission = "audit.read"
