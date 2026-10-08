"""TA-90: edição, inativação e exclusão preservam os dados relacionados."""
from django.test import TestCase
from patients.models import NeedType
from .models import CareNeed, CareNeedHistory, PatientAssessment
from .tests_api import make_api_users, make_patient, auth_client, MEDICO_CPF


class NeedLifecycleContractTests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.client = auth_client(self.users[MEDICO_CPF])
        self.assessment = PatientAssessment.objects.create(patient=make_patient())
        self.kind = NeedType.objects.get(name='Enfermagem')
        self.need = CareNeed.objects.create(assessment=self.assessment, need_type=self.kind,
                                           description='Original', priority='HIGH')
        self.url = f'/api/necessidades/{self.need.pk}/'

    def test_edit_inactivate_edit_and_delete_preserve_prior_snapshot(self):
        self.assertEqual(self.client.patch(self.url, {'description': 'Antes da inativação'}, format='json').status_code, 200)
        self.assertEqual(self.client.post(self.url + 'inativar/').status_code, 200)
        event = self.need.history.get()
        snapshot = dict(event.snapshot)
        self.assertEqual(snapshot['description'], 'Antes da inativação')
        self.assertTrue(snapshot['is_active'])
        self.assertEqual(event.actor, self.users[MEDICO_CPF])
        self.assertEqual(self.client.patch(self.url, {'description': 'Depois', 'priority': 'URGENT'}, format='json').status_code, 200)
        self.need.refresh_from_db()
        self.assertFalse(self.need.is_active)
        self.assertEqual(self.need.status, 'IDENTIFIED')
        self.assertEqual(self.client.delete(self.url).status_code, 204)
        event.refresh_from_db()
        self.assertIsNone(event.need_id)
        self.assertEqual(event.snapshot, snapshot)
        self.assertEqual(CareNeedHistory.objects.count(), 1)
        self.assertTrue(PatientAssessment.objects.filter(pk=self.assessment.pk).exists())
        self.assertTrue(NeedType.objects.filter(pk=self.kind.pk).exists())
        self.assertEqual(self.client.get(self.url).status_code, 404)

    def test_invalid_edit_of_inactive_record_preserves_data_and_history(self):
        self.client.post(self.url + 'inativar/')
        event = self.need.history.get()
        snapshot = dict(event.snapshot)
        for payload in ({'description': ' '}, {'priority': 'INVALID'}, {'need_type': 999999}):
            self.assertEqual(self.client.patch(self.url, payload, format='json').status_code, 400)
        self.need.refresh_from_db()
        event.refresh_from_db()
        self.assertEqual(self.need.description, 'Original')
        self.assertEqual(self.need.priority, 'HIGH')
        self.assertFalse(self.need.is_active)
        self.assertEqual(event.snapshot, snapshot)
        self.assertEqual(self.need.history.count(), 1)
