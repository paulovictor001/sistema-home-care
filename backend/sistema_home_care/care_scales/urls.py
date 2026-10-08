from rest_framework.routers import DefaultRouter
from .views import CareScaleViewSet

router = DefaultRouter()
router.register('escalas', CareScaleViewSet, basename='escala')
urlpatterns = router.urls
