from assessments.tests_api import auth_client
from professionals.models import Professional
from .models import ScaleNeed
from .test_support import ScaleFixture


class MultipleProfessionalsTests(ScaleFixture):
    def test_multiple_assignments_and_atomic_batch_without_ceiling(self):
        item = ScaleNeed.objects.create(scale=self.scale, plan_need=self.link, required_profession=self.profession)
        third = Professional.objects.create(full_name='Pedro', profession=self.profession)
        client = auth_client(self.manager)
        url = f'/api/escalas/{self.scale.pk}/necessidades/{item.pk}/profissionais/lote/'
        self.assertEqual(client.post(url, {'professionals': [self.professional.pk, self.other_professional.pk, third.pk]}, format='json').status_code, 201)
        self.assertEqual(item.assignments.filter(removed_at__isnull=True).count(), 3)
        fourth = Professional.objects.create(full_name='Paula', profession=self.profession)
        self.assertEqual(client.post(url, {'professionals': [fourth.pk, third.pk]}, format='json').status_code, 400)
        self.assertFalse(item.assignments.filter(professional=fourth).exists())
        self.assertEqual(client.post(url, {'professionals': []}, format='json').status_code, 400)
