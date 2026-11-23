from assessments.tests_api import auth_client, MEDICO_CPF
from .models import ScaleNeed
from .test_support import ScaleFixture


class PlanConsistencyTests(ScaleFixture):
    def test_explicit_scale_removal_required_before_plan_removal(self):
        item = ScaleNeed.objects.create(scale=self.scale, plan_need=self.link)
        doctor = auth_client(self.users[MEDICO_CPF])
        url = f'/api/planos-cuidados/{self.plan.pk}/necessidades/{self.link.pk}/remover/'
        history_count = self.plan.history.count()
        response = doctor.post(url, {'reason': 'Alta clínica'}, format='json')
        self.assertEqual(response.status_code, 400, response.data)
        self.link.refresh_from_db()
        self.assertIsNone(self.link.removed_at)
        self.assertEqual(self.plan.history.count(), history_count)
        response = auth_client(self.manager).post(f'/api/escalas/{self.scale.pk}/necessidades/{item.pk}/remover/', {}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(doctor.post(url, {'reason': 'Alta clínica'}, format='json').status_code, 200)
        item.refresh_from_db()
        self.assertIsNotNone(item.removed_at)
