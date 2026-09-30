from rest_framework.routers import DefaultRouter

from .views import AssessmentViewSet

router = DefaultRouter()
router.register(r"avaliacoes", AssessmentViewSet, basename="avaliacao")

urlpatterns = router.urls
