from __future__ import annotations

from rest_framework.permissions import BasePermission


class HasPermissionKey(BasePermission):
    """
    View-level RBAC using explicit permission keys.
    Set `required_permission` on views/viewsets.
    """

    def has_permission(self, request, view) -> bool:
        if hasattr(view, "get_required_permission"):
            required = view.get_required_permission()
        else:
            required = getattr(view, "required_permission", None)
        if not required:
            return True
        user = request.user
        return bool(user and user.is_authenticated and user.has_perm_key(required))
