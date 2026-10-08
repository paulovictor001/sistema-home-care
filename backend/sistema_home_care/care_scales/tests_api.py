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

    def test_denied_operations_have_no_effect_and_filters_are_validated(self):
        client = auth_client(self.users[SEM_GRUPO_CPF])
        self.assertEqual(client.get('/api/escalas/').status_code, 403)
        self.assertEqual(client.patch(f'/api/escalas/{self.scale.pk}/', {'observation': 'Invasão'}, format='json').status_code, 403)
        self.scale.refresh_from_db()
        self.assertEqual(self.scale.observation, '')
        self.assertEqual(auth_client(self.manager).get('/api/escalas/?patient=abc').status_code, 400)
