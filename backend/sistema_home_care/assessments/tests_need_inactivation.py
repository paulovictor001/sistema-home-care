from unittest.mock import patch
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import GranularPermission
from patients.models import NeedType
from .models import CareNeed, CareNeedHistory, PatientAssessment
from .tests_api import make_api_users, make_patient, auth_client, GERENTE_CPF, MEDICO_CPF, ENFERMEIRO_CPF, SEM_GRUPO_CPF


class NeedInactivationTests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.assessment = PatientAssessment.objects.create(patient=make_patient())
        self.need_type = NeedType.objects.get(name='Enfermagem')
        self.need = self.make_need()
        self.url = f'/api/necessidades/{self.need.pk}/inativar/'
        self.client = auth_client(self.users[MEDICO_CPF])

    def make_need(self):
        return CareNeed.objects.create(assessment=self.assessment,
            need_type=self.need_type, description='Necessidade original', priority='HIGH')

    def test_all_authorized_profiles_can_inactivate_with_snapshot(self):
        for cpf in (GERENTE_CPF, MEDICO_CPF, ENFERMEIRO_CPF):
            with self.subTest(cpf=cpf):
                need = self.make_need()
                created_at = need.created_at
                response = auth_client(self.users[cpf]).post(f'/api/necessidades/{need.pk}/inativar/')
                self.assertEqual(response.status_code, 200)
                self.assertNotIn('description', response.data)
                need.refresh_from_db()
                self.assertFalse(need.is_active)
                self.assertIsNotNone(need.inactivated_at)
                self.assertEqual(need.status, 'IDENTIFIED')
                self.assertEqual(need.description, 'Necessidade original')
                self.assertEqual(need.created_at, created_at)
                event = need.history.get()
                self.assertEqual(event.actor, self.users[cpf])
                self.assertEqual(event.snapshot['description'], need.description)
                self.assertEqual(event.snapshot['assessment'], self.assessment.pk)
                self.assertTrue(event.snapshot['is_active'])

    def test_repeated_request_is_idempotent(self):
        self.client.post(self.url)
        self.need.refresh_from_db()
        timestamp = self.need.inactivated_at
        updated = self.need.updated_at
        self.assertEqual(self.client.post(self.url).status_code, 200)
        self.need.refresh_from_db()
        self.assertEqual(self.need.inactivated_at, timestamp)
        self.assertEqual(self.need.updated_at, updated)
        self.assertEqual(self.need.history.count(), 1)

    def test_inactive_filtered_but_detail_and_assessment_preserve_record(self):
        self.client.post(self.url)
        self.assertEqual(self.client.get('/api/necessidades/').data['count'], 0)
        for situation in ('inativo', 'todos'):
            self.assertEqual(self.client.get(f'/api/necessidades/?situacao={situation}').data['count'], 1)
        self.assertEqual(self.client.get('/api/necessidades/?situacao=invalid').status_code, 400)
        detail = self.client.get(f'/api/necessidades/{self.need.pk}/')
        self.assertEqual(detail.status_code, 200)
        self.assertFalse(detail.data['is_active'])
        assessment = self.client.get(f'/api/avaliacoes/{self.assessment.pk}/')
        self.assertFalse(assessment.data['care_needs'][0]['is_active'])

    def test_read_only_state_cannot_be_bypassed(self):
        self.client.post(self.url)
        self.client.patch(f'/api/necessidades/{self.need.pk}/',
            {'is_active': True, 'inactivated_at': None, 'description': 'Editada'}, format='json')
        self.need.refresh_from_db()
        self.assertFalse(self.need.is_active)
        self.assertIsNotNone(self.need.inactivated_at)
        self.assertEqual(self.need.history.get().snapshot['description'], 'Necessidade original')

    def test_permissions_and_missing_need(self):
        self.assertEqual(APIClient().post(self.url).status_code, 401)
        self.assertEqual(auth_client(self.users[SEM_GRUPO_CPF]).post(self.url).status_code, 403)
        permission = GranularPermission.objects.get(codename='necessidades.inactivate')
        for cpf in (GERENTE_CPF, MEDICO_CPF, ENFERMEIRO_CPF):
            self.users[cpf].category.permissions.remove(permission)
            self.assertEqual(auth_client(self.users[cpf]).post(self.url).status_code, 403)
        self.assertFalse(self.need.history.exists())
        self.users[MEDICO_CPF].category.permissions.add(permission)
        self.assertEqual(self.client.post('/api/necessidades/999999/inativar/').status_code, 404)

    def test_history_access_and_preservation_after_deletions(self):
        manager = self.users[GERENTE_CPF]
        auth_client(manager).post(self.url)
        url = f'/api/necessidades/{self.need.pk}/historico/'
        self.assertEqual(auth_client(manager).get(url).status_code, 403)
        self.assertEqual(self.client.get(url).status_code, 200)
        event = self.need.history.get()
        manager.delete()
        event.refresh_from_db()
        self.assertIsNone(event.actor)
        self.assertTrue(event.actor_name)
        self.assertEqual(self.client.delete(f'/api/necessidades/{self.need.pk}/').status_code, 204)
        event.refresh_from_db()
        self.assertIsNone(event.need)
        self.assertEqual(event.snapshot['id'], self.need.pk)

    def test_log_failure_rolls_back_inactivation(self):
        with patch('assessments.views.CareNeedHistory.objects.create', side_effect=RuntimeError('fail')):
            with self.assertRaises(RuntimeError):
                self.client.post(self.url)
        self.need.refresh_from_db()
        self.assertTrue(self.need.is_active)
        self.assertIsNone(self.need.inactivated_at)
        self.assertFalse(CareNeedHistory.objects.exists())


class NeedReactivationTests(TestCase):
    setUp = NeedInactivationTests.setUp
    make_need = NeedInactivationTests.make_need

    def test_profiles_reactivate_and_preserve_history(self):
        for cpf in (GERENTE_CPF, MEDICO_CPF, ENFERMEIRO_CPF):
            with self.subTest(cpf=cpf):
                need = self.make_need()
                client = auth_client(self.users[cpf])
                base = f'/api/necessidades/{need.pk}/'
                client.post(base + 'inativar/')
                original_event = need.history.get()
                response = client.post(base + 'reativar/')
                self.assertEqual(response.status_code, 200)
                self.assertNotIn('description', response.data)
                need.refresh_from_db()
                self.assertTrue(need.is_active)
                self.assertIsNone(need.inactivated_at)
                self.assertEqual(need.status, 'IDENTIFIED')
                self.assertEqual(need.description, 'Necessidade original')
                event = need.history.get(action='REACTIVATE')
                self.assertEqual(event.actor, self.users[cpf])
                self.assertFalse(event.snapshot['is_active'])
                self.assertIsNotNone(event.snapshot['inactivated_at'])
                self.assertTrue(need.history.filter(pk=original_event.pk).exists())
                self.assertEqual(need.history.count(), 2)
                updated = need.updated_at
                self.assertEqual(client.post(base + 'reativar/').status_code, 200)
                need.refresh_from_db()
                self.assertEqual(need.updated_at, updated)
                self.assertEqual(need.history.count(), 2)

    def test_reactivated_need_returns_to_active_list_and_repeated_cycles(self):
        base = f'/api/necessidades/{self.need.pk}/'
        for _ in range(2):
            self.client.post(base + 'inativar/')
            self.client.post(base + 'reativar/')
        self.assertEqual(self.need.history.filter(action='INACTIVATE').count(), 2)
        self.assertEqual(self.need.history.filter(action='REACTIVATE').count(), 2)
        self.assertEqual(self.client.get('/api/necessidades/').data['count'], 1)
        self.assertEqual(self.client.get('/api/necessidades/?situacao=inativo').data['count'], 0)
        self.assertEqual(len(self.client.get(base + 'historico/').data), 4)

    def test_permission_and_missing_record(self):
        url = f'/api/necessidades/{self.need.pk}/reativar/'
        self.assertEqual(APIClient().post(url).status_code, 401)
        self.assertEqual(auth_client(self.users[SEM_GRUPO_CPF]).post(url).status_code, 403)
        permission = GranularPermission.objects.get(codename='necessidades.reactivate')
        for cpf in (GERENTE_CPF, MEDICO_CPF, ENFERMEIRO_CPF):
            self.users[cpf].category.permissions.remove(permission)
            self.assertEqual(auth_client(self.users[cpf]).post(url).status_code, 403)
        self.users[MEDICO_CPF].category.permissions.add(permission)
        self.assertEqual(self.client.post('/api/necessidades/999999/reativar/').status_code, 404)

    def test_failure_rolls_back_reactivation(self):
        self.client.post(self.url)
        self.need.refresh_from_db()
        timestamp = self.need.inactivated_at
        with patch('assessments.views.CareNeedHistory.objects.create', side_effect=RuntimeError('fail')):
            with self.assertRaises(RuntimeError):
                self.client.post(f'/api/necessidades/{self.need.pk}/reativar/')
        self.need.refresh_from_db()
        self.assertFalse(self.need.is_active)
        self.assertEqual(self.need.inactivated_at, timestamp)
        self.assertEqual(self.need.history.count(), 1)
