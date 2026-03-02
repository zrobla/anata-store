from rest_framework import serializers

from content.models import BlogPost, ContentPage, HomeSection


class ContentPageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContentPage
        fields = ["id", "slug", "title", "body_html", "is_published", "updated_at"]


class BlogPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = [
            "id",
            "slug",
            "title",
            "excerpt",
            "body_html",
            "cover_image_url",
            "is_published",
            "published_at",
            "updated_at",
        ]


class HomeSectionSerializer(serializers.ModelSerializer):
    payload = serializers.JSONField(source="payload_json")

    class Meta:
        model = HomeSection
        fields = [
            "id",
            "key",
            "type",
            "payload",
            "payload_json",
            "sort_order",
            "is_active",
            "updated_at",
        ]
