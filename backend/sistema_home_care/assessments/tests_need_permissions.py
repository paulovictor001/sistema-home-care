"""Matriz completa de autorização: perfil E permissão granular."""
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.models import GranularPermission
from patients.models import NeedType
from .models import CareNeed, PatientAssessment
from .tests_api import make_api_users, make_patient, auth_client, GERENTE_CPF, MEDICO_CPF, ENFERMEIRO_CPF, SEM_GRUPO_CPF


class NeedAuthorizationTests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.assessment = PatientAssessment.objects.create(patient=make_patient())
        self.kind = NeedType.objects.get(name='Enfermagem')
        self.need = CareNeed.objects.create(assessment=self.assessment, need_type=self.kind,
            description='Original', priority='HIGH')
        base = f'/api/necessidades/{self.need.pk}/'
        self.operations = [
            ('view', 'get', '/api/necessidades/', {}),
            ('view', 'get', base, {}),
            ('view', 'get', base + 'historico/', {}),
            ('update', 'put', base, {'need_type': self.kind.pk, 'description': 'Editada', 'priority': 'LOW'}),
            ('update', 'patch', base, {'description': 'Editada'}),
            ('delete', 'delete', base, {}),
            ('inactivate', 'post', base + 'inativar/', {}),
            ('reactivate', 'post', base + 'reativar/', {}),
            ('create', 'post', f'/api/avaliacoes/{self.assessment.pk}/necessidades/',
             {'need_type': self.kind.pk, 'description': 'Nova', 'priority': 'LOW'}),
        ]

    def request(self, client, method, url, payload):
        return getattr(client, method)(url, payload, format='json')

    def test_each_clinical_profile_has_successful_access_to_every_operation(self):
        for cpf in (MEDICO_CPF, ENFERMEIRO_CPF):
            client = auth_client(self.users[cpf])
            created = client.post(f'/api/avaliacoes/{self.assessment.pk}/necessidades/',
                {'need_type': self.kind.pk, 'description': 'Nova', 'priority': 'LOW'}, format='json')
            self.assertEqual(created.status_code, 201)
            url = f"/api/necessidades/{created.data['id']}/"
            for endpoint in ('/api/necessidades/', url, url + 'historico/'):
                self.assertEqual(client.get(endpoint).status_code, 200)
            self.assertEqual(client.put(url, {'need_type': self.kind.pk,
                'description': 'Editada', 'priority': 'HIGH'}, format='json').status_code, 200)
            self.assertEqual(client.patch(url, {'priority': 'URGENT'}, format='json').status_code, 200)
            self.assertEqual(client.post(url + 'inativar/').status_code, 200)
            self.assertEqual(client.post(url + 'reativar/').status_code, 200)
            self.assertEqual(client.delete(url).status_code, 204)

    def test_manager_inactivation_requires_its_specific_permission(self):
        manager = self.users[GERENTE_CPF]
        permission = GranularPermission.objects.get(codename='necessidades.inactivate')
        manager.category.permissions.remove(permission)
        url = f'/api/necessidades/{self.need.pk}/inativar/'
        self.assertEqual(auth_client(manager).post(url).status_code, 403)
        self.assert_unchanged()
        manager.category.permissions.add(permission)
        self.assertEqual(auth_client(manager).post(url).status_code, 200)
        self.assertEqual(auth_client(manager).get(f'/api/necessidades/{self.need.pk}/').status_code, 403)

    def assert_unchanged(self):
        self.need.refresh_from_db()
        self.assertEqual(self.need.description, 'Original')
        self.assertTrue(self.need.is_active)
        self.assertEqual(CareNeed.objects.count(), 1)
        self.assertFalse(self.need.history.exists())

    def test_anonymous_and_other_profile_blocked_for_every_action(self):
        other = self.users[SEM_GRUPO_CPF]
        other.category.permissions.add(*GranularPermission.objects.all())
        for client, expected in ((APIClient(), 401), (auth_client(other), 403)):
            for action, method, url, payload in self.operations:
                with self.subTest(expected=expected, action=action, method=method):
                    self.assertEqual(self.request(client, method, url, payload).status_code, expected)
        self.assert_unchanged()

    def test_clinical_profile_without_permission_blocked_for_every_action(self):
        for cpf in (MEDICO_CPF, ENFERMEIRO_CPF):
            user = self.users[cpf]
            for action, method, url, payload in self.operations:
                permission = GranularPermission.objects.get(codename=f'necessidades.{action}')
                user.category.permissions.remove(permission)
                with self.subTest(cpf=cpf, action=action, method=method):
                    self.assertEqual(self.request(auth_client(user), method, url, payload).status_code, 403)
                user.category.permissions.add(permission)
        self.assert_unchanged()

    def test_manager_even_with_all_permissions_cannot_use_clinical_actions(self):
        manager = self.users[GERENTE_CPF]
        manager.category.permissions.add(*GranularPermission.objects.all())
        for action, method, url, payload in self.operations:
            if action in ('inactivate', 'reactivate'):
                continue
            self.assertEqual(self.request(auth_client(manager), method, url, payload).status_code, 403)
        self.assert_unchanged()

    def test_inactive_user_blocked_even_with_profile_and_permissions(self):
        user = self.users[MEDICO_CPF]
        user.is_active = False
        user.save(update_fields=['is_active'])
        for action, method, url, payload in self.operations:
            self.assertEqual(self.request(auth_client(user), method, url, payload).status_code, 403)
        self.assert_unchanged()

    def test_old_creation_permission_is_still_required(self):
        user = self.users[MEDICO_CPF]
        user.category.permissions.remove(GranularPermission.objects.get(codename='avaliacoes.add_need'))
        _, method, url, payload = self.operations[-1]
        self.assertEqual(self.request(auth_client(user), method, url, payload).status_code, 403)
        self.assert_unchanged()

    def test_type_status_requires_profile_and_manage_permission(self):
        for cpf in (GERENTE_CPF, MEDICO_CPF, ENFERMEIRO_CPF):
            user = self.users[cpf]
            client = auth_client(user)
            for operation in ('inativar', 'reativar'):
                url = f'/api/tipos-necessidade/{self.kind.pk}/{operation}/'
                self.assertEqual(client.post(url).status_code, 200)
                permission = GranularPermission.objects.get(codename='tipos_necessidade.manage')
                user.category.permissions.remove(permission)
                self.assertEqual(client.post(url).status_code, 403)
                user.category.permissions.add(permission)
        other = self.users[SEM_GRUPO_CPF]
        other.category.permissions.add(*GranularPermission.objects.all())
        for operation in ('inativar', 'reativar'):
            url = f'/api/tipos-necessidade/{self.kind.pk}/{operation}/'
            self.assertEqual(auth_client(other).post(url).status_code, 403)
            self.assertEqual(APIClient().post(url).status_code, 401)

    def test_inactive_user_cannot_manage_types(self):
        user = self.users[MEDICO_CPF]
        user.is_active = False
        user.save(update_fields=['is_active'])
        response = auth_client(user).post(f'/api/tipos-necessidade/{self.kind.pk}/inativar/')
        self.assertEqual(response.status_code, 403)
        self.kind.refresh_from_db()
        self.assertEqual(self.kind.status, 'ACTIVE')

    def test_admin_type_management_obeys_same_profile_and_granular_rules(self):
        from django.contrib import admin
        from rest_framework.test import APIRequestFactory
        model_admin = admin.site._registry[NeedType]
        request = APIRequestFactory().get('/admin/')
        other = self.users[SEM_GRUPO_CPF]
        other.category.permissions.add(*GranularPermission.objects.all())
        for cpf, allowed in ((GERENTE_CPF, True), (MEDICO_CPF, True),
                             (ENFERMEIRO_CPF, True), (SEM_GRUPO_CPF, False)):
            request.user = self.users[cpf]
            for operation in ('module', 'view', 'add', 'change', 'delete'):
                self.assertEqual(getattr(model_admin, f'has_{operation}_permission')(request), allowed)
        request.user = self.users[MEDICO_CPF]
        request.user.category.permissions.remove(GranularPermission.objects.get(codename='tipos_necessidade.manage'))
        self.assertFalse(model_admin.has_change_permission(request))
