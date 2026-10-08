"""TA-89: contrato de criação das necessidades pela avaliação."""
from django.test import TestCase
from patients.models import NeedType
from .models import CareNeed, NeedPriority, PatientAssessment
from .tests_api import make_api_users, make_patient, auth_client, MEDICO_CPF, ENFERMEIRO_CPF


class NeedCreationContractTests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.assessment = PatientAssessment.objects.create(patient=make_patient())
        self.kind = NeedType.objects.get(name='Enfermagem')
        self.url = f'/api/avaliacoes/{self.assessment.pk}/necessidades/'
        self.client = auth_client(self.users[MEDICO_CPF])
        self.payload = {'need_type': self.kind.pk, 'description': 'Curativo', 'priority': 'LOW'}

    def test_both_clinical_profiles_create_independent_needs_for_all_priorities(self):
        for cpf in (MEDICO_CPF, ENFERMEIRO_CPF):
            for priority in NeedPriority.values:
                response = auth_client(self.users[cpf]).post(self.url,
                    {**self.payload, 'priority': priority, 'status': 'OTHER'}, format='json')
                self.assertEqual(response.status_code, 201)
                need = CareNeed.objects.get(pk=response.data['id'])
                self.assertEqual(need.assessment_id, self.assessment.pk)
                self.assertEqual(need.priority, priority)
                self.assertEqual(need.status, 'IDENTIFIED')
                self.assertTrue(need.is_active)
        self.assertEqual(self.assessment.care_needs.count(), 8)
        self.assertEqual(PatientAssessment.objects.count(), 1)

    def test_all_required_fields_missing_null_and_blank_leave_no_records(self):
        for field in self.payload:
            for mode in ('missing', 'null', 'blank'):
                payload = dict(self.payload)
                if mode == 'missing':
                    payload.pop(field)
                else:
                    payload[field] = None if mode == 'null' else '  '
                with self.subTest(field=field, mode=mode):
                    response = self.client.post(self.url, payload, format='json')
                    self.assertEqual(response.status_code, 400)
                    self.assertIn(field, response.data)
        self.assertFalse(CareNeed.objects.exists())

    def test_invalid_priority_type_and_assessment_are_rejected(self):
        for payload in ({**self.payload, 'priority': 'INVALID'},
                        {**self.payload, 'need_type': 999999}):
            self.assertEqual(self.client.post(self.url, payload, format='json').status_code, 400)
        self.assertEqual(self.client.post('/api/avaliacoes/999999/necessidades/',
            self.payload, format='json').status_code, 404)
        self.assertFalse(CareNeed.objects.exists())
