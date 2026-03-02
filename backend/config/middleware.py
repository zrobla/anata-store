import uuid
from typing import Callable

from django.http import HttpRequest, HttpResponse


class RequestIdMiddleware:
    """Attach a request identifier for traceability in logs and responses."""

    header_name = "X-Request-ID"

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        request_id = request.headers.get(self.header_name, str(uuid.uuid4()))
        request.request_id = request_id
        response = self.get_response(request)
        response[self.header_name] = request_id
        return response


class SecurityHeadersMiddleware:
    """Adds baseline security headers aligned with MVP premium policy."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)
        response.setdefault("X-Content-Type-Options", "nosniff")
        response.setdefault("X-Frame-Options", "DENY")
        response.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; object-src 'none'; frame-ancestors 'none'",
        )
        return response
