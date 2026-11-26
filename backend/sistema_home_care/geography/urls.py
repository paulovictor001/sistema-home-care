from rest_framework.routers import DefaultRouter
from .views import NeighborhoodViewSet, RegionViewSet

router = DefaultRouter()
router.register('regioes', RegionViewSet, basename='regiao')
router.register('bairros', NeighborhoodViewSet, basename='bairro')
urlpatterns = router.urls
