from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AssessmentViewSet,
    CareNeedViewSet,
    NeedTypeCatalogViewSet,
    NeedTypeInactivateView,
    NeedTypeReactivateView,
    ResourceCatalogViewSet,
)

router = DefaultRouter()
router.register(r"avaliacoes", AssessmentViewSet, basename="avaliacao")
router.register(r"necessidades", CareNeedViewSet, basename="necessidade")
router.register(r"recursos", ResourceCatalogViewSet, basename="recurso")
router.register(r"tipos-necessidade", NeedTypeCatalogViewSet, basename="tipo-necessidade")

urlpatterns = router.urls + [
    path("tipos-necessidade/<int:pk>/inativar/", NeedTypeInactivateView.as_view(), name="need-type-inactivate"),
    path("tipos-necessidade/<int:pk>/reativar/", NeedTypeReactivateView.as_view(), name="need-type-reactivate"),
]
