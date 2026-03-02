from rest_framework import permissions, viewsets

from accounts.permissions import HasPermissionKey
from audit.services import log_action
from inventory.models import InventoryItem, InventorySource
from inventory.serializers import InventoryItemSerializer, InventorySourceSerializer


class InventorySourceViewSet(viewsets.ModelViewSet):
    queryset = InventorySource.objects.all()
    serializer_class = InventorySourceSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermissionKey]

    def get_required_permission(self):
        if self.action in {"list", "retrieve"}:
            return "inventory.read"
        return "inventory.write"

    def perform_create(self, serializer):
        source = serializer.save()
        log_action(
            actor_user=self.request.user,
            action="create",
            resource="inventory_source",
            resource_id=str(source.id),
            after=InventorySourceSerializer(source).data,
            request_id=getattr(self.request, "request_id", ""),
        )

    def perform_update(self, serializer):
        before = InventorySourceSerializer(self.get_object()).data
        source = serializer.save()
        log_action(
            actor_user=self.request.user,
            action="update",
            resource="inventory_source",
            resource_id=str(source.id),
            before=before,
            after=InventorySourceSerializer(source).data,
            request_id=getattr(self.request, "request_id", ""),
        )


class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.select_related("variant", "source").all()
    serializer_class = InventoryItemSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermissionKey]

    def get_required_permission(self):
        if self.action in {"list", "retrieve"}:
            return "inventory.read"
        return "inventory.write"

    def perform_create(self, serializer):
        item = serializer.save()
        log_action(
            actor_user=self.request.user,
            action="create",
            resource="inventory_item",
            resource_id=str(item.id),
            after=InventoryItemSerializer(item).data,
            request_id=getattr(self.request, "request_id", ""),
        )

    def perform_update(self, serializer):
        before = InventoryItemSerializer(self.get_object()).data
        item = serializer.save()
        log_action(
            actor_user=self.request.user,
            action="update",
            resource="inventory_item",
            resource_id=str(item.id),
            before=before,
            after=InventoryItemSerializer(item).data,
            request_id=getattr(self.request, "request_id", ""),
        )
