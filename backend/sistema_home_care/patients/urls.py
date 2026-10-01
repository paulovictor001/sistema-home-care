from rest_framework.routers import DefaultRouter

from .views import NeedTypeCatalogViewSet, PatientViewSet

router = DefaultRouter()
router.register(r"pacientes", PatientViewSet, basename="paciente")
router.register(
    r"tipos-necessidade", NeedTypeCatalogViewSet, basename="tipo-necessidade"
)

urlpatterns = router.urls
