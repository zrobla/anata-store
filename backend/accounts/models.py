import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from common.models import BaseUUIDModel


class Permission(BaseUUIDModel):
    key = models.CharField(max_length=120, unique=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["key"]

    def __str__(self) -> str:
        return self.key


class Role(BaseUUIDModel):
    key = models.CharField(max_length=60, unique=True)
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    permissions = models.ManyToManyField(Permission, blank=True, related_name="roles")

    class Meta:
        ordering = ["key"]

    def __str__(self) -> str:
        return self.key


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=30, blank=True)
    roles = models.ManyToManyField(Role, blank=True, related_name="users")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    def has_perm_key(self, permission_key: str) -> bool:
        if self.is_superuser:
            return True
        role_keys = set(self.roles.values_list("key", flat=True))
        if "OWNER_ADMIN" in role_keys:
            return True
        permission_keys = set(
            Permission.objects.filter(roles__users=self).values_list("key", flat=True)
        )
        return "*" in permission_keys or permission_key in permission_keys
