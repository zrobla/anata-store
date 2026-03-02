from __future__ import annotations

import json
from typing import Any

from django.core.serializers.json import DjangoJSONEncoder

from audit.models import AuditLog


def _json_safe(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    if payload is None:
        return None
    return json.loads(json.dumps(payload, cls=DjangoJSONEncoder))


def log_action(
    *,
    actor_user,
    action: str,
    resource: str,
    resource_id: str,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    request_id: str = "",
    ip_address: str | None = None,
) -> AuditLog:
    return AuditLog.objects.create(
        actor_user=actor_user,
        action=action,
        resource=resource,
        resource_id=resource_id,
        before_json=_json_safe(before),
        after_json=_json_safe(after),
        request_id=request_id,
        ip_address=ip_address,
    )
