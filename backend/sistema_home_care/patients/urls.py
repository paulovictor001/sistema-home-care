from rest_framework.routers import DefaultRouter

from .views import HealthConditionViewSet, PatientViewSet

router = DefaultRouter()
router.register(r"condicoes-saude", HealthConditionViewSet, basename="condicao-saude")
router.register(r"pacientes", PatientViewSet, basename="paciente")
urlpatterns = router.urls
