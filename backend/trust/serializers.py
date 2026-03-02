from __future__ import annotations

from rest_framework import serializers

from catalog.models import Product
from trust.models import ProductQuestion, Review


class ReviewSerializer(serializers.ModelSerializer):
    product_id = serializers.UUIDField(source="product.id", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "product_id", "rating", "title", "body", "status", "created_at"]


class ReviewCreateSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    rating = serializers.IntegerField(min_value=1, max_value=5)
    title = serializers.CharField(max_length=180, required=False, allow_blank=True)
    body = serializers.CharField(required=False, allow_blank=True)

    def validate_product_id(self, value):
        if not Product.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Product not found")
        return value


class QuestionAnswerSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    answer = serializers.CharField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class QuestionSerializer(serializers.ModelSerializer):
    product_id = serializers.UUIDField(source="product.id", read_only=True)
    answers = serializers.SerializerMethodField()

    class Meta:
        model = ProductQuestion
        fields = ["id", "product_id", "question", "status", "created_at", "answers"]

    def get_answers(self, obj: ProductQuestion):
        return QuestionAnswerSerializer(obj.answers.all(), many=True).data


class QuestionCreateSerializer(serializers.Serializer):
    product_id = serializers.UUIDField()
    question = serializers.CharField()

    def validate_product_id(self, value):
        if not Product.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Product not found")
        return value
