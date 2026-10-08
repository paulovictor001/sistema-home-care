from assessments.tests_api import auth_client, SEM_GRUPO_CPF
from accounts.models import GranularPermission
from .models import ScaleStatus
from .test_support import ScaleFixture


class ScaleStatusTests(ScaleFixture):
    def test_four_statuses_any_transition_and_independent_permission(self):
        user = self.users[SEM_GRUPO_CPF]
        user.category.permissions.add(GranularPermission.objects.get(codename='escalas.change_status'))
        client = auth_client(user)
        url = f'/api/escalas/{self.scale.pk}/status/'
        for status in ('CLOSED', 'SUSPENDED', 'DRAFT', 'SUSPENDED', 'CLOSED', 'DRAFT'):
            response = client.post(url, {'status': status}, format='json')
            self.assertEqual(response.status_code, 200, response.data)
            self.assertEqual(response.data['status'], status)
        self.assertEqual(set(ScaleStatus.values), {'DRAFT', 'ACTIVE', 'SUSPENDED', 'CLOSED'})
        self.assertEqual(client.post(url, {'status': 'INVALID'}, format='json').status_code, 400)
        self.assertEqual(client.patch(f'/api/escalas/{self.scale.pk}/', {'observation': 'Não permitido'}, format='json').status_code, 403)
