from accounts.models import Profession
from assessments.tests_api import auth_client
from . import services
from .test_support import ScaleFixture


class ProfessionalContractTests(ScaleFixture):
    def test_profession_changed_after_assignment_blocks_activation_and_wrong_profession_batch(self):
        item = services.add_need(actor=self.manager, scale=self.scale, plan_need=self.link)
        services.add_professional(actor=self.manager, scale=self.scale, item_id=item.pk, professional=self.professional)
        self.professional.profession = Profession.objects.get(name='Médico')
        self.professional.save()
        client = auth_client(self.manager)
        url = f'/api/escalas/{self.scale.pk}/'
        self.assertEqual(client.post(url + 'status/', {'status': 'ACTIVE'}, format='json').status_code, 400)
        self.professional.is_active = False
        self.professional.save()
        self.assertEqual(client.post(url + f'necessidades/{item.pk}/profissionais/lote/', {'professionals': [self.other_professional.pk, self.professional.pk]}, format='json').status_code, 400)
        self.assertFalse(item.assignments.filter(professional=self.other_professional).exists())
        item.refresh_from_db()
        self.assertEqual(item.required_profession_id, self.profession.pk)
        self.scale.refresh_from_db()
        self.assertEqual(self.scale.status, 'DRAFT')
