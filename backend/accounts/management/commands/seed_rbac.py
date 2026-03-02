from django.core.management.base import BaseCommand

from accounts.models import Permission, Role

PERMISSIONS = [
    "catalog.read",
    "catalog.write",
    "inventory.read",
    "inventory.write",
    "inventory.ledger",
    "orders.read",
    "orders.write",
    "orders.status",
    "orders.assign_driver",
    "cod.read",
    "cod.write",
    "cod.reconcile",
    "promotions.read",
    "promotions.write",
    "content.read",
    "content.write",
    "moderation.reviews",
    "moderation.qna",
    "moderation.returns",
    "security.users",
    "security.roles",
    "audit.read",
]

RBAC_MATRIX = {
    "OWNER_ADMIN": ["*"],
    "CATALOG_MANAGER": ["catalog.read", "catalog.write", "promotions.read", "content.read"],
    "STOCK_MANAGER": ["inventory.read", "inventory.write", "inventory.ledger", "catalog.read"],
    "ORDER_MANAGER": [
        "orders.read",
        "orders.write",
        "orders.status",
        "orders.assign_driver",
        "cod.read",
        "cod.write",
        "cod.reconcile",
    ],
    "SUPPORT": [
        "moderation.reviews",
        "moderation.qna",
        "moderation.returns",
        "orders.read",
        "content.read",
    ],
    "DELIVERY": ["orders.read", "cod.write"],
}


class Command(BaseCommand):
    help = "Seed RBAC roles and permissions for MVP"

    def handle(self, *args, **options):
        permission_objs = {}
        for key in PERMISSIONS:
            permission_objs[key], _ = Permission.objects.get_or_create(
                key=key, defaults={"description": key}
            )

        wildcard, _ = Permission.objects.get_or_create(key="*", defaults={"description": "all"})

        for role_key, keys in RBAC_MATRIX.items():
            role, _ = Role.objects.get_or_create(
                key=role_key,
                defaults={
                    "name": role_key.replace("_", " ").title(),
                    "description": role_key,
                },
            )
            role.permissions.clear()
            for key in keys:
                if key == "*":
                    role.permissions.add(wildcard)
                else:
                    role.permissions.add(permission_objs[key])

        self.stdout.write(self.style.SUCCESS("RBAC seeded."))
