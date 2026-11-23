from assessments.tests_api import auth_client
from .test_support import ScaleFixture


class ScalePeriodTests(ScaleFixture):
    def test_boundaries_and_invalid_create_and_partial_update(self):
        client = auth_client(self.manager)
        payload = {'patient': self.patient.pk, 'care_plan': self.plan.pk,
                   'start_date': '2026-10-01', 'end_date': '2026-12-31'}
        self.assertEqual(client.post('/api/escalas/', payload, format='json').status_code, 201)
        for changes in ({'start_date': '2026-09-30'}, {'end_date': '2027-01-01'},
                        {'start_date': '2026-12-01', 'end_date': '2026-11-30'},
                        {'start_date': None}, {'end_date': None}):
            with self.subTest(changes=changes):
                self.assertEqual(client.post('/api/escalas/', payload | changes, format='json').status_code, 400)
                self.assertEqual(client.patch(f'/api/escalas/{self.scale.pk}/', changes, format='json').status_code, 400)
        self.scale.refresh_from_db()
        self.assertEqual(self.scale.end_date.isoformat(), '2026-11-30')
        self.plan.end_date = None
        self.plan.save()
        self.assertEqual(client.patch(f'/api/escalas/{self.scale.pk}/', {'end_date': '2027-01-01'}, format='json').status_code, 200)
