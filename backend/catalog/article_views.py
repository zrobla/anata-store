"""Endpoints « articles »: une seule ressource pour gerer un produit vendable."""

from __future__ import annotations

from django.db.models import Prefetch
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from accounts.permissions import HasPermissionKey
from audit.services import log_action
from catalog.article_serializers import ArticleSerializer, ArticleUpdateSerializer
from catalog.article_service import ArticleError, create_article, retire_article, update_article
from catalog.media_service import (
    PhotoUploadError,
    attach_photo_to_product,
    detach_photo,
    set_primary_photo,
)
from catalog.models import Product, ProductMedia
from catalog.serializers import SellerProductPhotoSerializer


class SellerArticleViewSet(viewsets.ModelViewSet):
    """CRUD complet d'un article, photos comprises."""

    permission_classes = [permissions.IsAuthenticated, HasPermissionKey]
    serializer_class = ArticleSerializer

    def get_queryset(self):
        queryset = (
            Product.objects.select_related("brand", "category")
            .prefetch_related(
                "variants",
                Prefetch("media_links", queryset=ProductMedia.objects.select_related("media_asset").order_by("sort_order")),
            )
            .order_by("-created_at")
        )

        recherche = self.request.query_params.get("recherche", "").strip()
        if recherche:
            queryset = queryset.filter(name__icontains=recherche)

        if self.request.query_params.get("en_ligne") == "1":
            queryset = queryset.filter(is_active=True)
        elif self.request.query_params.get("en_ligne") == "0":
            queryset = queryset.filter(is_active=False)

        return queryset

    def get_required_permission(self):
        lecture = self.action in {"list", "retrieve"} or (self.action == "photos" and self.request.method == "GET")
        return "catalog.read" if lecture else "catalog.write"

    def get_serializer_class(self):
        return ArticleUpdateSerializer if self.action in {"update", "partial_update"} else ArticleSerializer

    def create(self, request, *args, **kwargs):
        serializer = ArticleSerializer(data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            product = create_article(
                nom=data["nom"],
                marque=data["marque"],
                categorie=data["categorie"],
                prix=data["prix"],
                prix_promo=data.get("prix_promo"),
                quantite=data.get("quantite", 0),
                seuil_alerte=data.get("seuil_alerte"),
                description_courte=data.get("description_courte", ""),
                description=data.get("description", ""),
                en_ligne=data.get("en_ligne", True),
                mis_en_avant=data.get("mis_en_avant", False),
            )
        except ArticleError as error:
            return Response({"detail": str(error)}, status=400)

        log_action(
            actor_user=request.user,
            action="create",
            resource="article",
            resource_id=str(product.id),
            after={"nom": product.name, "prix": data["prix"], "quantite": data.get("quantite", 0)},
            request_id=getattr(request, "request_id", ""),
        )
        return Response(self._render(product), status=201)

    def update(self, request, *args, **kwargs):
        product = self.get_object()
        serializer = ArticleUpdateSerializer(data=request.data, partial=True, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)

        before = self._render(product)
        try:
            product = update_article(product, serializer.validated_data)
        except ArticleError as error:
            return Response({"detail": str(error)}, status=400)

        product.refresh_from_db()
        after = self._render(product)
        log_action(
            actor_user=request.user,
            action="update",
            resource="article",
            resource_id=str(product.id),
            before=before,
            after=after,
            request_id=getattr(request, "request_id", ""),
        )
        return Response(after)

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        product = self.get_object()
        before = self._render(product)
        retire_article(product)
        log_action(
            actor_user=request.user,
            action="soft_delete",
            resource="article",
            resource_id=str(product.id),
            before=before,
            after={"en_ligne": False},
            request_id=getattr(request, "request_id", ""),
        )
        return Response(status=204)

    @action(detail=True, methods=["get", "post"], url_path="photos", parser_classes=[MultiPartParser, FormParser])
    def photos(self, request, pk=None):
        product = self.get_object()

        if request.method == "GET":
            return Response(self._render_photos(product))

        try:
            link = attach_photo_to_product(product, request.FILES.get("file"), alt=request.data.get("alt", ""))
        except PhotoUploadError as error:
            return Response({"detail": str(error)}, status=400)

        log_action(
            actor_user=request.user,
            action="create",
            resource="article_photo",
            resource_id=str(link.id),
            after={"article": str(product.id)},
            request_id=getattr(request, "request_id", ""),
        )
        return Response(self._render_photos(product), status=201)

    @action(detail=True, methods=["delete"], url_path=r"photos/(?P<link_id>[^/.]+)")
    def delete_photo(self, request, pk=None, link_id=None):
        product = self.get_object()
        link = product.media_links.filter(pk=link_id).first()
        if link is None:
            return Response({"detail": "Cette photo n'existe plus."}, status=404)

        detach_photo(link)
        log_action(
            actor_user=request.user,
            action="delete",
            resource="article_photo",
            resource_id=str(link_id),
            before={"article": str(product.id)},
            request_id=getattr(request, "request_id", ""),
        )
        return Response(self._render_photos(product))

    @action(detail=True, methods=["post"], url_path=r"photos/(?P<link_id>[^/.]+)/principale")
    def set_photo_as_primary(self, request, pk=None, link_id=None):
        product = self.get_object()
        link = product.media_links.filter(pk=link_id).first()
        if link is None:
            return Response({"detail": "Cette photo n'existe plus."}, status=404)

        set_primary_photo(product, link)
        log_action(
            actor_user=request.user,
            action="update",
            resource="article_photo",
            resource_id=str(link_id),
            after={"article": str(product.id), "principale": True},
            request_id=getattr(request, "request_id", ""),
        )
        return Response(self._render_photos(product))

    def _render(self, product: Product) -> dict:
        return ArticleSerializer(product, context=self.get_serializer_context()).data

    def _render_photos(self, product: Product) -> list[dict]:
        links = product.media_links.select_related("media_asset").order_by("sort_order", "created_at")
        return SellerProductPhotoSerializer(links, many=True, context=self.get_serializer_context()).data
