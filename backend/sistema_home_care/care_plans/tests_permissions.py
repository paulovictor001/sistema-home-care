from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import GranularPermission
from assessments.tests_api import make_api_users, auth_client, MEDICO_CPF, ENFERMEIRO_CPF, GERENTE_CPF, SEM_GRUPO_CPF
from .permissions import plan_permissions


class PlanPermissionMatrixTests(TestCase):
    def setUp(self):
        self.users = make_api_users()

    def test_matrix_requires_profile_even_with_every_permission(self):
        rules = {
            'list': {MEDICO_CPF, ENFERMEIRO_CPF, GERENTE_CPF},
            'retrieve': {MEDICO_CPF, ENFERMEIRO_CPF, GERENTE_CPF},
            'historico': {MEDICO_CPF, ENFERMEIRO_CPF, GERENTE_CPF},
            'create': {MEDICO_CPF}, 'update': {MEDICO_CPF}, 'partial_update': {MEDICO_CPF},
            'vincular': {MEDICO_CPF}, 'configurar': {MEDICO_CPF}, 'remover': {MEDICO_CPF},
            'ativar': {MEDICO_CPF}, 'encerrar': {MEDICO_CPF, ENFERMEIRO_CPF},
            'reativar': {MEDICO_CPF, ENFERMEIRO_CPF}, 'unknown': set(),
        }
        for cpf, user in self.users.items():
            user.category.permissions.add(*GranularPermission.objects.filter(feature='planos_cuidados'))
            request = type('Request', (), {'user': user})()
            for action, allowed in rules.items():
                with self.subTest(cpf=cpf, action=action):
                    self.assertEqual(all(p.has_permission(request, None) for p in plan_permissions(action)), cpf in allowed)

    def test_http_anonymous_inactive_other_profile_and_revoked_permission(self):
        self.assertEqual(APIClient().get('/api/planos-cuidados/').status_code, 401)
        self.assertEqual(auth_client(self.users[SEM_GRUPO_CPF]).get('/api/planos-cuidados/').status_code, 403)
        user = self.users[MEDICO_CPF]
        permission = GranularPermission.objects.get(codename='planos_cuidados.view')
        user.category.permissions.remove(permission)
        self.assertEqual(auth_client(user).get('/api/planos-cuidados/').status_code, 403)
        user.category.permissions.add(permission)
        user.is_active = False
        self.assertEqual(auth_client(user).get('/api/planos-cuidados/').status_code, 403)

    def test_each_write_requires_its_granular_permission(self):
        user = self.users[MEDICO_CPF]
        request = type('Request', (), {'user': user})()
        for action, codename in (('create', 'create'), ('configurar', 'update'), ('ativar', 'activate'),
                                ('encerrar', 'close'), ('reativar', 'reactivate')):
            permission = GranularPermission.objects.get(codename=f'planos_cuidados.{codename}')
            user.category.permissions.remove(permission)
            self.assertFalse(all(p.has_permission(request, None) for p in plan_permissions(action)))
            user.category.permissions.add(permission)
