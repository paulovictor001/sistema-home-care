from django.test import TestCase
from rest_framework.test import APIClient
from assessments.tests_api import auth_client, MEDICO_CPF, GERENTE_CPF, ENFERMEIRO_CPF, SEM_GRUPO_CPF
from . import tests_api as fixtures
from .models import CarePlan


class PlanHTTPPermissionTests(TestCase):
    setUp = fixtures.PlanAPITests.setUp
    create = fixtures.PlanAPITests.create

    def test_every_profile_read_and_forbidden_writes_have_no_side_effects(self):
        data = self.create()
        base = f"/api/planos-cuidados/{data['id']}/"
        link = base + f"necessidades/{data['need_links'][0]['id']}/"
        for cpf in (MEDICO_CPF, GERENTE_CPF, ENFERMEIRO_CPF):
            client = auth_client(self.users[cpf])
            for path in ('/api/planos-cuidados/', base, base + 'historico/'):
                self.assertEqual(client.get(path).status_code, 200)
        writes = [('post', '/api/planos-cuidados/', self.payload),
                  ('patch', base, {'objective': 'Proibido'}),
                  ('post', base + 'necessidades/', {'care_need': self.need.pk}),
                  ('post', link + 'configurar/', self.configuration),
                  ('post', link + 'remover/', {'reason': 'Proibido'}),
                  ('post', base + 'ativar/', {})]
        for cpf in (GERENTE_CPF, ENFERMEIRO_CPF, SEM_GRUPO_CPF):
            for method, path, payload in writes:
                with self.subTest(cpf=cpf, path=path):
                    self.assertEqual(getattr(auth_client(self.users[cpf]), method)(path, payload, format='json').status_code, 403)
        for path in (base + 'encerrar/', base + 'reativar/'):
            self.assertEqual(auth_client(self.users[GERENTE_CPF]).post(path).status_code, 403)
        plan = CarePlan.objects.get(pk=data['id'])
        self.assertEqual(plan.objective, '')
        self.assertEqual(plan.status, 'DRAFT')
        self.assertEqual(plan.history.count(), 1)
        self.assertIsNone(plan.need_links.get().removed_at)
        self.assertEqual(CarePlan.objects.count(), 1)

    def test_anonymous_cannot_read_or_create(self):
        self.assertEqual(APIClient().get('/api/planos-cuidados/').status_code, 401)
        self.assertEqual(APIClient().post('/api/planos-cuidados/', self.payload, format='json').status_code, 401)
        self.assertFalse(CarePlan.objects.exists())
