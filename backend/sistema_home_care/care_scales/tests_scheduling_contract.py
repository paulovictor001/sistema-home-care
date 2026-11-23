from rest_framework.exceptions import ValidationError
from assessments.tests_api import auth_client
from .models import ScaleNeed, ScaleAssignment
from .contracts import scheduling_requirement
from .test_support import ScaleFixture


class SchedulingContractTests(ScaleFixture):
    def test_closed_remains_readable_but_cannot_supply_new_schedule(self):
        item = ScaleNeed.objects.create(scale=self.scale, plan_need=self.link, required_profession=self.profession, frequency_quantity=2, frequency_period='WEEK')
        ScaleAssignment.objects.create(item=item, professional=self.professional)
        self.scale.status = 'ACTIVE'
        self.scale.save()
        contract = scheduling_requirement(self.scale)
        self.assertEqual(contract['items'][0]['professional_ids'], [self.professional.pk])
        for status in ('CLOSED', 'SUSPENDED', 'DRAFT'):
            self.scale.status = status
            self.scale.save()
            with self.assertRaises(ValidationError):
                scheduling_requirement(self.scale)
        self.assertEqual(auth_client(self.manager).get(f'/api/escalas/{self.scale.pk}/').status_code, 200)
        self.assertEqual(self.scale.items.count(), 1)
