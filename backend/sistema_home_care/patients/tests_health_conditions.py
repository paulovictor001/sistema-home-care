from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import GranularPermission
from assessments.tests_api import make_api_users, auth_client, GERENTE_CPF, MEDICO_CPF, ENFERMEIRO_CPF, SEM_GRUPO_CPF
from .models import HealthCondition


class HealthConditionCatalogTests(TestCase):
    def setUp(self):
        self.users = make_api_users()

    def test_manager_creates_named_condition_and_care_team_lists(self):
        response = auth_client(self.users[GERENTE_CPF]).post(
            '/api/condicoes-saude/', {'name': ' Condição de teste '}, format='json')
        self.assertEqual(response.status_code, 201)
        condition = HealthCondition.objects.get(pk=response.data['id'])
        self.assertEqual(condition.name, 'Condição de teste')
        for cpf in (GERENTE_CPF, MEDICO_CPF, ENFERMEIRO_CPF):
            response = auth_client(self.users[cpf]).get('/api/condicoes-saude/')
            self.assertEqual(response.status_code, 200)
            self.assertIn({'id': condition.pk, 'name': condition.name}, response.data)

    def test_blank_and_missing_names_rejected(self):
        client = auth_client(self.users[GERENTE_CPF])
        for payload in ({}, {'name': '  '}, {'name': None}, {'name': 'a' * 256}):
            self.assertEqual(client.post('/api/condicoes-saude/', payload, format='json').status_code, 400)

    def test_creation_and_read_permissions(self):
        for cpf in (MEDICO_CPF, ENFERMEIRO_CPF, SEM_GRUPO_CPF):
            self.assertEqual(auth_client(self.users[cpf]).post('/api/condicoes-saude/', {'name': 'Teste'}, format='json').status_code, 403)
        self.assertEqual(APIClient().get('/api/condicoes-saude/').status_code, 401)
        self.assertEqual(auth_client(self.users[SEM_GRUPO_CPF]).get('/api/condicoes-saude/').status_code, 403)
        manager = self.users[GERENTE_CPF]
        manager.category.permissions.remove(GranularPermission.objects.get(codename='pacientes.create'))
        self.assertEqual(auth_client(manager).post('/api/condicoes-saude/', {'name': 'Teste'}, format='json').status_code, 403)

    def test_legacy_unnamed_condition_remains_available(self):
        condition = HealthCondition.objects.create()
        response = auth_client(self.users[GERENTE_CPF]).get('/api/condicoes-saude/')
        self.assertIn({'id': condition.pk, 'name': ''}, response.data)
