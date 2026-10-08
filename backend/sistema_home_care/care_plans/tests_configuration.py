from django.test import TestCase
from accounts.models import Profession
from professionals.models import Professional
from .serializers import NeedConfigurationSerializer


class ProfessionalConfigurationTests(TestCase):
    def test_only_existing_specific_professional_and_not_user_or_profession(self):
        profession = Profession.objects.create(name='Profissão de teste')
        professional = Professional.objects.create(full_name='João', profession=profession)
        serializer = NeedConfigurationSerializer(data={'required_professional': professional.pk,
            'frequency_quantity': 2, 'frequency_period': 'WEEK'})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['required_professional'], professional)
        self.assertIsNone(professional.user_id)
        for payload in ({}, {'required_professional': None}, {'required_professional': 999999},
                        {'required_professional': {'name': 'Inventado'}}):
            serializer = NeedConfigurationSerializer(data=payload)
            self.assertFalse(serializer.is_valid())
            self.assertIn('required_professional', serializer.errors)


class FrequencyConfigurationTests(TestCase):
    def setUp(self):
        profession = Profession.objects.create(name='Frequência teste')
        professional = Professional.objects.create(full_name='João', profession=profession)
        self.payload = {'required_professional': professional.pk, 'frequency_quantity': 2, 'frequency_period': 'DAY'}

    def test_all_three_periods_and_positive_quantity(self):
        for period in ('DAY', 'WEEK', 'MONTH'):
            serializer = NeedConfigurationSerializer(data={**self.payload, 'frequency_period': period})
            self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_missing_null_zero_negative_fraction_and_invalid_period(self):
        for field, values in (('frequency_quantity', (None, '', 0, -1, 1.5)),
                              ('frequency_period', (None, '', 'YEAR'))):
            payload = dict(self.payload)
            payload.pop(field)
            serializer = NeedConfigurationSerializer(data=payload)
            self.assertFalse(serializer.is_valid())
            self.assertIn(field, serializer.errors)
            for value in values:
                serializer = NeedConfigurationSerializer(data={**self.payload, field: value})
                self.assertFalse(serializer.is_valid())
                self.assertIn(field, serializer.errors)
