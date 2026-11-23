from rest_framework.routers import DefaultRouter
from .views import CarePlanViewSet

router = DefaultRouter()
router.register('planos-cuidados', CarePlanViewSet, basename='plano-cuidados')
urlpatterns = router.urls
