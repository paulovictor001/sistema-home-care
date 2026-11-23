from assessments.tests_api import auth_client
from .models import ScaleNeed, ScaleAssignment
from .test_support import ScaleFixture


class ActivationTests(ScaleFixture):
    def test_activation_validates_needs_frequency_and_current_professional(self):
        client = auth_client(self.manager)
        url = f'/api/escalas/{self.scale.pk}/status/'
        activate = lambda: client.post(url, {'status': 'ACTIVE'}, format='json')
        self.assertEqual(activate().status_code, 400)
        item = ScaleNeed.objects.create(scale=self.scale, plan_need=self.link, required_profession=self.profession)
        self.assertEqual(activate().status_code, 400)
        item.frequency_quantity = 2
        item.frequency_period = 'WEEK'
        item.save()
        self.assertEqual(activate().status_code, 400)
        ScaleAssignment.objects.create(item=item, professional=self.professional)
        self.assertEqual(activate().status_code, 200)
        self.assertEqual(client.post(url, {'status': 'CLOSED'}, format='json').status_code, 200)
        self.professional.is_active = False
        self.professional.save()
        self.assertEqual(activate().status_code, 400)
        self.scale.refresh_from_db()
        self.assertEqual(self.scale.status, 'CLOSED')
