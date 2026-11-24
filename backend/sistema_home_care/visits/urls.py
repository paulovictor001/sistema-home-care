from django.urls import path
from .views import ProfessionalAvailabilityView, VisitDetailView, VisitListCreateView, VisitStatusView

urlpatterns = [
    path('agendamentos/', VisitListCreateView.as_view(), name='visit-list-create'),
    path('agendamentos/<int:pk>/', VisitDetailView.as_view(), name='visit-detail'),
    path('agendamentos/<int:pk>/status/', VisitStatusView.as_view(), name='visit-status'),
    path('agendamentos/profissionais/<int:professional_id>/agenda/', ProfessionalAvailabilityView.as_view(), name='professional-availability'),
]
