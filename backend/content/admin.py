from django.contrib import admin

from content.models import BlogPost, ContentPage, HomeSection


@admin.register(ContentPage)
class ContentPageAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "is_published", "updated_at")
    search_fields = ("slug", "title")
    list_filter = ("is_published",)


@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ("slug", "title", "is_published", "published_at")
    search_fields = ("slug", "title")
    list_filter = ("is_published",)


@admin.register(HomeSection)
class HomeSectionAdmin(admin.ModelAdmin):
    list_display = ("key", "type", "sort_order", "is_active")
    search_fields = ("key", "type")
    list_filter = ("type", "is_active")
