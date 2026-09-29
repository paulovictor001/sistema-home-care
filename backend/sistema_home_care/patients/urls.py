from rest_framework.routers import DefaultRouter

from .views import PatientViewSet

router = DefaultRouter()
router.register(r"pacientes", PatientViewSet, basename="paciente")

urlpatterns = router.urls
