from __future__ import annotations

from django.conf import settings
from django.db import models

from common.models import BaseUUIDModel


class Review(BaseUUIDModel):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    STATUS_CHOICES = [(PENDING, "Pending"), (APPROVED, "Approved"), (REJECTED, "Rejected")]

    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="reviews")
    customer_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviews",
    )
    rating = models.PositiveSmallIntegerField()
    title = models.CharField(max_length=180, blank=True)
    body = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)

    class Meta:
        ordering = ["-created_at"]


class ProductQuestion(BaseUUIDModel):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    STATUS_CHOICES = [(PENDING, "Pending"), (APPROVED, "Approved"), (REJECTED, "Rejected")]

    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="questions")
    customer_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="product_questions",
    )
    question = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PENDING)

    class Meta:
        ordering = ["-created_at"]


class ProductAnswer(BaseUUIDModel):
    question = models.ForeignKey(
        ProductQuestion, on_delete=models.CASCADE, related_name="answers"
    )
    seller_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="product_answers",
    )
    answer = models.TextField()

    class Meta:
        ordering = ["created_at"]
