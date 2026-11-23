from io import StringIO
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from rest_framework.test import APIClient
from accounts.management.commands.seed_demo import PROFILES, demo_cpf
from accounts.models import User, Category
from care_plans.models import CarePlan
from care_scales.models import CareScale, ScaleAuditEvent, ScaleSubstitution
from patients.models import Patient
from professionals.models import Professional

PASSWORD = 'TesteDemoSeguro@2026'


class DemoDataTests(TestCase):
    def seed(self):
        call_command('seed_demo', password=PASSWORD, stdout=StringIO())

    def test_repeatable_complete_demo_and_login_roles(self):
        self.seed()
        counts = tuple(model.objects.count() for model in (User, Patient, CarePlan, CareScale, ScaleAuditEvent, ScaleSubstitution))
        self.seed()
        self.assertEqual(counts, tuple(model.objects.count() for model in (User, Patient, CarePlan, CareScale, ScaleAuditEvent, ScaleSubstitution)))
        self.assertEqual(User.objects.filter(email__endswith='@demo.homecare.invalid').count(), len(PROFILES))
        self.assertEqual(Patient.objects.filter(full_name__endswith='(Demo)').count(), 6)
        self.assertEqual(set(CareScale.objects.values_list('status', flat=True)), {'DRAFT', 'ACTIVE', 'SUSPENDED', 'CLOSED'})
        self.assertEqual(ScaleSubstitution.objects.count(), 1)
        self.assertEqual(Professional.objects.filter(user__isnull=True).count(), 2)
        for index, (key, name, _) in enumerate(PROFILES, 1):
            client = APIClient()
            response = client.post('/api/auth/login/', {'cpf': demo_cpf(index), 'password': PASSWORD}, format='json')
            self.assertEqual(response.status_code, 400 if key == 'inativo' else 200, (key, response.data))
            if key != 'inativo':
                self.assertTrue(response.cookies['access_token']['httponly'])
        admin = User.objects.get(email='administrador@demo.homecare.invalid')
        self.assertTrue(admin.is_superuser and admin.is_staff)
        client = APIClient()
        client.force_authenticate(User.objects.get(email='fisioterapeuta@demo.homecare.invalid'))
        self.assertEqual(client.get('/api/escalas/').status_code, 200)
        self.assertEqual(client.post('/api/escalas/', {}, format='json').status_code, 403)
        client.force_authenticate(User.objects.get(email='coordenador@demo.homecare.invalid'))
        self.assertEqual(client.get('/api/escalas/planos/').status_code, 200)
        self.assertEqual(client.get('/api/usuarios/').status_code, 403)

    def test_collision_rolls_back_without_touching_existing_account(self):
        user = User.objects.create_user(cpf=demo_cpf(1), email='existente@example.invalid', password=PASSWORD,
            category=Category.objects.get(name='Gerente'))
        with self.assertRaises(CommandError):
            self.seed()
        user.refresh_from_db()
        self.assertEqual(user.email, 'existente@example.invalid')
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(Patient.objects.count(), 0)
