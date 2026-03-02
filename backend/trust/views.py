from __future__ import annotations

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from catalog.models import Product
from trust.models import ProductQuestion, Review
from trust.serializers import (
    QuestionCreateSerializer,
    QuestionSerializer,
    ReviewCreateSerializer,
    ReviewSerializer,
)


class ReviewCreateView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "interaction"

    def post(self, request):
        serializer = ReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = Product.objects.get(id=serializer.validated_data["product_id"], is_active=True)
        review = Review.objects.create(
            product=product,
            customer_user=request.user if getattr(request.user, "is_authenticated", False) else None,
            rating=serializer.validated_data["rating"],
            title=serializer.validated_data.get("title", ""),
            body=serializer.validated_data.get("body", ""),
            status=Review.PENDING,
        )
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class QuestionCreateView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "interaction"

    def post(self, request):
        serializer = QuestionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = Product.objects.get(id=serializer.validated_data["product_id"], is_active=True)
        question = ProductQuestion.objects.create(
            product=product,
            customer_user=request.user if getattr(request.user, "is_authenticated", False) else None,
            question=serializer.validated_data["question"],
            status=ProductQuestion.PENDING,
        )
        return Response(QuestionSerializer(question).data, status=status.HTTP_201_CREATED)
