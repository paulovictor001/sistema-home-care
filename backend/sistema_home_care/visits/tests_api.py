from datetime import time
from rest_framework.test import APIClient

from care_scales.test_support import ScaleFixture
from care_scales.models import ScaleAssignment, ScaleNeed, ScaleStatus
from patients.models import PatientAddress
from .models import ProfessionalWeeklyAvailability, Visit, VisitStatus
from .services import create_visit


class VisitApiTests(ScaleFixture):
    def setUp(self):
        super().setUp()
        self.scale_need = ScaleNeed.objects.create(scale=self.scale, plan_need=self.link,
            frequency_quantity=2, frequency_period='WEEK', required_profession=self.profession)
        ScaleAssignment.objects.create(item=self.scale_need, professional=self.professional)
        self.scale.status = ScaleStatus.ACTIVE
        self.scale.save(update_fields=['status'])
        PatientAddress.objects.create(patient=self.patient, zip_code='01001000', state='SP', city='São Paulo',
            neighborhood='Sé', street='Rua A', number='10', region='Centro')
        for weekday in range(7):
            ProfessionalWeeklyAvailability.objects.create(professional=self.professional, weekday=weekday,
                start_time=time(8), end_time=time(12))
        self.client = APIClient()
        self.client.force_authenticate(self.manager)

    def visit(self):
        return create_visit(actor=self.manager, scale=self.scale, scale_need=self.scale_need,
            professional=self.professional, visit_date=self.scale.start_date,
            start_time=time(9), end_time=time(10))

    def test_create_then_list_detail_and_filter(self):
        payload = {"care_scale": self.scale.pk, "scale_need": self.scale_need.pk,
            "professional": self.professional.pk, "visit_date": self.scale.start_date.isoformat(),
            "start_time": "09:00", "end_time": "10:00"}
        response = self.client.post('/api/agendamentos/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['patient_name'], self.patient.full_name)
        self.assertIn('street', response.data['address'])
        self.assertEqual(self.client.get('/api/agendamentos/').status_code, 200)
        detail = self.client.get(f"/api/agendamentos/{response.data['id']}/")
        self.assertEqual(detail.status_code, 200)
        filtered = self.client.get(f"/api/agendamentos/?patient={self.patient.pk}")
        self.assertEqual(len(filtered.data['results']), 1)

    def test_series_returns_per_occurrence_result(self):
        self.scale_need.frequency_quantity = 1
        self.scale_need.frequency_period = 'WEEK'
        self.scale_need.save()
        day = self.scale.start_date
        response = self.client.post('/api/agendamentos/', {"care_scale": self.scale.pk,
            "scale_need": self.scale_need.pk, "professional": self.professional.pk,
            "visit_dates": [day.isoformat()], "start_time": "09:00", "end_time": "10:00"}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(len(response.data['created']), 1)
        self.assertEqual(response.data['rejected'], [])

    def test_status_action_and_delete_never_remove_record(self):
        visit = self.visit()
        response = self.client.post(f'/api/agendamentos/{visit.pk}/status/', {'status': 'CONFIRMADA'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        response = self.client.post(f'/api/agendamentos/{visit.pk}/status/', {'status': 'CANCELADA', 'reason': 'Solicitado'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.client.delete(f'/api/agendamentos/{visit.pk}/')
        self.assertTrue(Visit.objects.filter(pk=visit.pk, status=VisitStatus.CANCELLED).exists())

    def test_status_api_uses_operation_permission_and_persists_not_realized_reason(self):
        from accounts.models import GranularPermission
        visit = self.visit()
        permission = GranularPermission.objects.get(codename="visitas.not_realized")
        self.manager.category.permissions.remove(permission)
        response = self.client.post(f'/api/agendamentos/{visit.pk}/status/',
            {'status': 'NAO_REALIZADA', 'reason': 'Paciente ausente'}, format='json')
        self.assertEqual(response.status_code, 403)
        self.manager.category.permissions.add(permission)
        response = self.client.post(f'/api/agendamentos/{visit.pk}/status/',
            {'status': 'NAO_REALIZADA', 'reason': '  Paciente ausente  '}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['not_realized_reason'], 'Paciente ausente')

    def test_edit_and_weekly_availability_api(self):
        visit = self.visit()
        response = self.client.patch(f'/api/agendamentos/{visit.pk}/',
            {'observation': 'Atualizada'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['observation'], 'Atualizada')
        agenda_url = f'/api/agendamentos/profissionais/{self.professional.pk}/agenda/'
        response = self.client.put(agenda_url, [{'weekday': 0, 'start_time': '07:00', 'end_time': '11:00'}], format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(self.client.get(agenda_url).status_code, 200)

    def test_missing_view_permission_is_forbidden(self):
        from assessments.tests_api import MEDICO_CPF
        user = self.users[MEDICO_CPF]
        self.client.force_authenticate(user)
        self.assertEqual(self.client.get('/api/agendamentos/').status_code, 403)
