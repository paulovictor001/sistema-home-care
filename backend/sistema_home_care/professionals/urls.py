from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import TeamProfessionalListView, TeamViewSet

router = DefaultRouter()
router.register("equipes", TeamViewSet, basename="equipe")
urlpatterns = [path("equipe-profissionais/", TeamProfessionalListView.as_view()), *router.urls]
