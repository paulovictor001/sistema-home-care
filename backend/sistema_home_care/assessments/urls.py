from django.urls import path

from .views import CareNeedCreateView

urlpatterns = [
    path(
        "avaliacoes/<int:assessment_id>/necessidades/",
        CareNeedCreateView.as_view(),
        name="assessment-care-needs-create",
    ),
]
