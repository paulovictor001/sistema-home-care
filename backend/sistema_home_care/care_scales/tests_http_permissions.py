from accounts.models import GranularPermission
from assessments.tests_api import auth_client, MEDICO_CPF, ENFERMEIRO_CPF, SEM_GRUPO_CPF
from rest_framework.test import APIClient
from .models import ScaleNeed, ScaleAssignment, CareScale
from .test_support import ScaleFixture


class HTTPScalePermissionTests(ScaleFixture):
    def test_roles_and_independent_action_grants_reject_side_effects(self):
        url = f'/api/escalas/{self.scale.pk}/'
        for cpf in (MEDICO_CPF, ENFERMEIRO_CPF, SEM_GRUPO_CPF):
            client = auth_client(self.users[cpf])
            for method, endpoint, data in (('post', '/api/escalas/', {}), ('patch', url, {'observation': 'Invasão'}), ('delete', url, {}), ('post', url + 'status/', {'status': 'CLOSED'})):
                with self.subTest(cpf=cpf, method=method):
                    self.assertEqual(getattr(client, method)(endpoint, data, format='json').status_code, 403)
        self.scale.refresh_from_db()
        self.assertEqual(self.scale.observation, '')
        self.assertEqual(self.scale.status, 'DRAFT')
        self.assertIsNone(self.scale.deleted_at)
        self.assertFalse(self.scale.audit_events.exists())
        user = self.users[SEM_GRUPO_CPF]
        user.category.permissions.add(GranularPermission.objects.get(codename='escalas.update'))
        client = auth_client(user)
        self.assertEqual(client.patch(url, {'observation': 'Concessão explícita'}, format='json').status_code, 200)
        self.assertEqual(client.delete(url).status_code, 403)
        self.assertEqual(client.post(url + 'status/', {'status': 'CLOSED'}, format='json').status_code, 403)
        self.assertEqual(APIClient().get(url).status_code, 401)

    def test_assigned_visibility_scopes_list_detail_history_and_catalog(self):
        user = self.users[SEM_GRUPO_CPF]
        self.professional.user = user
        self.professional.save()
        item = ScaleNeed.objects.create(scale=self.scale, plan_need=self.link)
        ScaleAssignment.objects.create(item=item, professional=self.professional)
        other = CareScale.objects.create(patient=self.patient, care_plan=self.plan)
        client = auth_client(user)
        response = client.get('/api/escalas/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row['id'] for row in response.data['results']], [self.scale.pk])
        for suffix in ('', 'historico/', 'substituicoes/'):
            self.assertEqual(client.get(f'/api/escalas/{self.scale.pk}/{suffix}').status_code, 200)
            self.assertEqual(client.get(f'/api/escalas/{other.pk}/{suffix}').status_code, 404)
        self.assertEqual(client.get('/api/escalas/planos/').status_code, 403)
        self.assertTrue(client.get('/api/escalas/acesso/').data['view'])
        self.assertFalse(client.get('/api/escalas/acesso/').data['update'])
