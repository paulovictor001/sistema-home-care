from accounts.models import Profession
from assessments.tests_api import auth_client
from .models import ScaleNeed, ScaleAssignment
from .test_support import ScaleFixture


class ProfessionalValidationTests(ScaleFixture):
    def test_inactive_and_incompatible_substitution_rolls_back(self):
        item = ScaleNeed.objects.create(scale=self.scale, plan_need=self.link, required_profession=self.profession)
        previous = ScaleAssignment.objects.create(item=item, professional=self.professional)
        client = auth_client(self.manager)
        base = f'/api/escalas/{self.scale.pk}/necessidades/{item.pk}/profissionais/'
        self.other_professional.is_active = False
        self.other_professional.save()
        payload = {'professional': self.other_professional.pk}
        self.assertEqual(client.post(base, payload, format='json').status_code, 400)
        self.assertEqual(client.post(f'{base}{previous.pk}/substituir/', payload, format='json').status_code, 400)
        previous.refresh_from_db()
        self.assertIsNone(previous.removed_at)
        self.assertFalse(self.scale.substitutions.exists())
        self.other_professional.is_active = True
        self.other_professional.profession = Profession.objects.get(name='Médico')
        self.other_professional.save()
        self.assertEqual(client.post(base, payload, format='json').status_code, 400)
        item.required_profession = None
        item.save()
        self.assertEqual(client.post(base, {'professional': self.professional.pk}, format='json').status_code, 400)
