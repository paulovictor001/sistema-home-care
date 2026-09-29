from django.urls import path
from rest_framework.routers import DefaultRouter

from .views_users import (
    CategoryViewSet,
    FreeProfessionalListView,
    GranularPermissionViewSet,
    ProfessionViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register(r"usuarios", UserViewSet, basename="usuario")
router.register(r"categorias", CategoryViewSet, basename="categoria")
router.register(r"profissoes", ProfessionViewSet, basename="profissao")
router.register(r"permissoes", GranularPermissionViewSet, basename="permissao")

urlpatterns = [
    path(
        "profissionais-livres/",
        FreeProfessionalListView.as_view(),
        name="profissionais-livres",
    ),
    *router.urls,
]
