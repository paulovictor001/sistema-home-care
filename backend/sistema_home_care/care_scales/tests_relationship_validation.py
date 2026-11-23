from assessments.tests_api import auth_client, make_patient
from .models import CareScale, ScaleNeed
from .test_support import ScaleFixture


class ScaleRelationshipValidationTests(ScaleFixture):
    def test_create_and_edit_reject_unrelated_plan_atomically(self):
        other = make_patient(cpf='52998224725')
        client = auth_client(self.manager)
        payload = {'patient': other.pk, 'care_plan': self.plan.pk,
                   'start_date': '2026-10-01', 'end_date': '2026-11-30'}
        self.assertEqual(client.post('/api/escalas/', payload, format='json').status_code, 400)
        self.assertEqual(CareScale.objects.count(), 1)
        url = f'/api/escalas/{self.scale.pk}/'
        self.assertEqual(client.patch(url, {'patient': other.pk, 'observation': 'Inválida'}, format='json').status_code, 400)
        self.scale.refresh_from_db()
        self.assertEqual(self.scale.patient_id, self.patient.pk)
        self.assertEqual(self.scale.observation, '')
        for field in ('patient', 'care_plan'):
            self.assertEqual(client.patch(url, {field: None}, format='json').status_code, 400)

    def test_plan_cannot_change_after_need_attached(self):
        from care_plans.models import CarePlan
        other = CarePlan.objects.create(patient=self.patient, start_date=self.plan.start_date)
        ScaleNeed.objects.create(scale=self.scale, plan_need=self.link)
        response = auth_client(self.manager).patch(f'/api/escalas/{self.scale.pk}/', {'care_plan': other.pk}, format='json')
        self.assertEqual(response.status_code, 400)
