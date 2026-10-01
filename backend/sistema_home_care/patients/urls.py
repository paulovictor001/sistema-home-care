from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    NeedTypeCatalogViewSet,
    NeedTypeInactivateView,
    NeedTypeReactivateView,
    PatientViewSet,
)

router = DefaultRouter()
router.register(r"pacientes", PatientViewSet, basename="paciente")
router.register(
    r"tipos-necessidade", NeedTypeCatalogViewSet, basename="tipo-necessidade"
)

urlpatterns = router.urls + [
    path(
        "tipos-necessidade/<int:pk>/inativar/",
        NeedTypeInactivateView.as_view(),
        name="need-type-inactivate",
    ),
    path(
        "tipos-necessidade/<int:pk>/reativar/",
        NeedTypeReactivateView.as_view(),
        name="need-type-reactivate",
    ),
]
