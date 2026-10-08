from django.test import TestCase
from accounts.models import Profession
from professionals.models import Professional
from .serializers import NeedConfigurationSerializer


class ProfessionalConfigurationTests(TestCase):
    def test_only_existing_specific_professional_and_not_user_or_profession(self):
        profession = Profession.objects.create(name='Profissão de teste')
        professional = Professional.objects.create(full_name='João', profession=profession)
        serializer = NeedConfigurationSerializer(data={'required_professional': professional.pk})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['required_professional'], professional)
        self.assertIsNone(professional.user_id)
        for payload in ({}, {'required_professional': None}, {'required_professional': 999999},
                        {'required_professional': {'name': 'Inventado'}}):
            serializer = NeedConfigurationSerializer(data=payload)
            self.assertFalse(serializer.is_valid())
            self.assertIn('required_professional', serializer.errors)
