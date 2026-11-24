from assessments.tests_api import auth_client, SEM_GRUPO_CPF
from .models import CareScale
from .test_support import ScaleFixture


class ScaleAPITests(ScaleFixture):
    def test_create_read_edit_delete_preserves_record(self):
        client = auth_client(self.manager)
        payload = {'patient': self.patient.pk, 'care_plan': self.plan.pk,
                   'start_date': '2026-10-01', 'end_date': '2026-11-30', 'observation': 'Inicial'}
        response = client.post('/api/escalas/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        pk = response.data['id']
        url = f'/api/escalas/{pk}/'
        self.assertEqual(client.get(url).status_code, 200)
        self.assertEqual(client.patch(url, {'observation': 'Atualizada'}, format='json').status_code, 200)
        self.assertEqual(client.patch(url, {'status': 'ACTIVE'}, format='json').status_code, 400)
        self.assertEqual(client.delete(url).status_code, 204)
        self.assertEqual(client.get(url).status_code, 404)
        self.assertIsNotNone(CareScale.objects.get(pk=pk).deleted_at)

    def test_scale_creation_requires_active_care_plan(self):
        from care_plans.models import CarePlanStatus
        self.plan.status = CarePlanStatus.DRAFT
        self.plan.save(update_fields=['status'])
        client = auth_client(self.manager)
        existing_count = CareScale.objects.filter(patient=self.patient, deleted_at__isnull=True).count()
        payload = {'patient': self.patient.pk, 'care_plan': self.plan.pk,
                   'start_date': '2026-10-01', 'end_date': '2026-11-30'}
        response = client.post('/api/escalas/', payload, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('plano de cuidados ativo', str(response.data))
        self.assertEqual(CareScale.objects.filter(patient=self.patient, deleted_at__isnull=True).count(), existing_count)

    def test_active_scale_must_be_closed_or_suspended_before_deletion(self):
        self.scale.status = 'ACTIVE'
        self.scale.save(update_fields=['status'])
        client = auth_client(self.manager)
        response = client.delete(f'/api/escalas/{self.scale.pk}/')
        self.assertEqual(response.status_code, 400)
        self.scale.refresh_from_db()
        self.assertIsNone(self.scale.deleted_at)

        self.scale.status = 'CLOSED'
        self.scale.save(update_fields=['status'])
        response = client.delete(f'/api/escalas/{self.scale.pk}/')
        self.assertEqual(response.status_code, 204)
        self.scale.refresh_from_db()
        self.assertIsNotNone(self.scale.deleted_at)

    def test_denied_operations_have_no_effect_and_filters_are_validated(self):
        client = auth_client(self.users[SEM_GRUPO_CPF])
        self.assertEqual(client.get('/api/escalas/').status_code, 403)
        self.assertEqual(client.patch(f'/api/escalas/{self.scale.pk}/', {'observation': 'Invasão'}, format='json').status_code, 403)
        self.scale.refresh_from_db()
        self.assertEqual(self.scale.observation, '')
        self.assertEqual(auth_client(self.manager).get('/api/escalas/?patient=abc').status_code, 400)

    def test_plan_catalog_requires_create_or_update_not_just_view(self):
        from accounts.models import GranularPermission
        user = self.users[SEM_GRUPO_CPF]
        user.category.permissions.add(GranularPermission.objects.get(codename='escalas.view'))
        client = auth_client(user)
        self.assertEqual(client.get('/api/escalas/planos/').status_code, 403)
        user.category.permissions.add(GranularPermission.objects.get(codename='escalas.create'))
        response = client.get('/api/escalas/planos/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]['patient'], self.patient.pk)
