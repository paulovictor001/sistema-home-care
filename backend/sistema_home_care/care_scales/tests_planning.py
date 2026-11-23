from assessments.tests_api import auth_client, SEM_GRUPO_CPF
from patients.models import PatientAddress
from .models import ScaleNeed
from .test_support import ScaleFixture


class ProfessionalPlanningTests(ScaleFixture):
    def test_region_and_availability_support_selection_without_time_rules(self):
        PatientAddress.objects.create(patient=self.patient, region='Centro')
        item = ScaleNeed.objects.create(scale=self.scale, plan_need=self.link, required_profession=self.profession)
        client = auth_client(self.manager)
        url = f'/api/escalas/profissionais/{self.professional.pk}/planejamento/'
        response = client.put(url, {'regions': ['Centro', 'Centro'], 'availability_notes': 'Preferência pelos dias úteis'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        options = client.get(f'/api/escalas/{self.scale.pk}/necessidades/{item.pk}/profissionais-disponiveis/')
        self.assertEqual(options.status_code, 200)
        option = next(row for row in options.data if row['id'] == self.professional.pk)
        self.assertTrue(option['region_match'])
        self.assertEqual(option['availability_notes'], 'Preferência pelos dias úteis')
        self.assertEqual(option['regions'], ['Centro'])
        self.assertEqual(auth_client(self.users[SEM_GRUPO_CPF]).put(url, {'regions': []}, format='json').status_code, 403)
        self.professional.is_active = False
        self.professional.save()
        options = client.get(f'/api/escalas/{self.scale.pk}/necessidades/{item.pk}/profissionais-disponiveis/')
        self.assertNotIn(self.professional.pk, [row['id'] for row in options.data])
