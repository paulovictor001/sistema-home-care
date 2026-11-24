from django.urls import path

from .views import FinishVisitView, VisitAttendanceView

urlpatterns = [
    path("atendimentos/visitas/<int:visit_id>/", VisitAttendanceView.as_view(), name="visit-attendance"),
    path("atendimentos/visitas/<int:visit_id>/concluir/", FinishVisitView.as_view(), name="finish-visit"),
]
