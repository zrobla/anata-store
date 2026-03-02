from django.contrib.auth import get_user_model
from django.test import TestCase

from accounts.models import Permission, Role


User = get_user_model()


class RBACTests(TestCase):
    def test_user_has_permission_via_role(self):
        user = User.objects.create_user(email="manager@example.com", username="manager", password="strong-pass-123")
        permission = Permission.objects.create(key="orders.status", description="Update order status")
        role = Role.objects.create(key="ORDER_MANAGER", name="Order Manager")
        role.permissions.add(permission)
        user.roles.add(role)

        self.assertTrue(user.has_perm_key("orders.status"))
        self.assertFalse(user.has_perm_key("catalog.write"))
