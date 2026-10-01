from rest_framework.routers import DefaultRouter

from .views import AssessmentViewSet, ResourceCatalogViewSet

router = DefaultRouter()
router.register(r"avaliacoes", AssessmentViewSet, basename="avaliacao")
router.register(r"recursos", ResourceCatalogViewSet, basename="recurso")

urlpatterns = router.urls
