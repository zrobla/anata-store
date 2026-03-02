from rest_framework import permissions, viewsets
from rest_framework.response import Response

from accounts.permissions import HasPermissionKey
from content.models import BlogPost, ContentPage, HomeSection
from content.serializers import BlogPostSerializer, ContentPageSerializer, HomeSectionSerializer


class PublicContentPageViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ContentPageSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return ContentPage.objects.filter(is_published=True)


class PublicBlogPostViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = BlogPostSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "slug"

    def get_queryset(self):
        return BlogPost.objects.filter(is_published=True)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        try:
            page = max(int(request.query_params.get("page", 1)), 1)
        except ValueError:
            page = 1
        try:
            page_size = int(request.query_params.get("page_size", 24))
        except ValueError:
            page_size = 24
        page_size = min(max(page_size, 1), 100)

        total = queryset.count()
        total_pages = (total + page_size - 1) // page_size
        start = (page - 1) * page_size
        items = queryset[start : start + page_size]
        return Response(
            {
                "meta": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": total_pages,
                },
                "items": BlogPostSerializer(items, many=True).data,
            }
        )


class PublicHomeSectionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = HomeSectionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return HomeSection.objects.filter(is_active=True)


class SellerContentPageViewSet(viewsets.ModelViewSet):
    queryset = ContentPage.objects.all()
    serializer_class = ContentPageSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermissionKey]

    def get_required_permission(self):
        if self.action in {"list", "retrieve"}:
            return "content.read"
        return "content.write"


class SellerBlogPostViewSet(viewsets.ModelViewSet):
    queryset = BlogPost.objects.all()
    serializer_class = BlogPostSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermissionKey]

    def get_required_permission(self):
        if self.action in {"list", "retrieve"}:
            return "content.read"
        return "content.write"


class SellerHomeSectionViewSet(viewsets.ModelViewSet):
    queryset = HomeSection.objects.all()
    serializer_class = HomeSectionSerializer
    permission_classes = [permissions.IsAuthenticated, HasPermissionKey]

    def get_required_permission(self):
        if self.action in {"list", "retrieve"}:
            return "content.read"
        return "content.write"
