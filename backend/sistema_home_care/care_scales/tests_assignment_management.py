from assessments.tests_api import auth_client
from .models import ScaleNeed, ScaleSubstitution
from .test_support import ScaleFixture


class AssignmentManagementTests(ScaleFixture):
    def test_add_remove_and_substitute_preserve_previous_professional(self):
        item = ScaleNeed.objects.create(scale=self.scale, plan_need=self.link, required_profession=self.profession)
        client = auth_client(self.manager)
        url = f'/api/escalas/{self.scale.pk}/necessidades/{item.pk}/profissionais/'
        data = {'professional': self.professional.pk}
        self.assertEqual(client.post(url, data, format='json').status_code, 201)
        self.assertEqual(client.post(url, data, format='json').status_code, 400)
        previous = item.assignments.get()
        self.assertEqual(client.post(f'{url}{previous.pk}/substituir/', {'professional': self.other_professional.pk}, format='json').status_code, 200)
        previous.refresh_from_db()
        self.assertIsNotNone(previous.removed_at)
        history = ScaleSubstitution.objects.get()
        self.assertEqual(history.previous_name, 'João')
        self.assertEqual(history.new_name, 'Maria')
        current = item.assignments.get(removed_at__isnull=True)
        self.assertEqual(client.post(f'{url}{current.pk}/remover/', {}, format='json').status_code, 200)
        self.assertEqual(ScaleSubstitution.objects.count(), 1)
        self.assertFalse(item.assignments.filter(removed_at__isnull=True).exists())
        self.assertEqual(client.post(f'{url}{previous.pk}/substituir/', data, format='json').status_code, 404)
