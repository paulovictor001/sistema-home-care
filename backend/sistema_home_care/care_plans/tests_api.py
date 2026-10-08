from unittest.mock import patch
from django.test import TestCase
from professionals.models import Professional
from accounts.models import Profession
from patients.models import NeedType
from assessments.models import CareNeed, PatientAssessment, Resource
from assessments.tests_api import make_api_users, make_patient, auth_client, MEDICO_CPF, ENFERMEIRO_CPF
from .models import CarePlan


class PlanAPITests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.client = auth_client(self.users[MEDICO_CPF])
        self.patient = make_patient()
        self.assessment = PatientAssessment.objects.create(patient=self.patient)
        self.need = CareNeed.objects.create(assessment=self.assessment, need_type=NeedType.objects.first(),
                                           description='Curativo', priority='HIGH')
        self.professional = Professional.objects.create(full_name='João', profession=Profession.objects.get(name='Enfermeiro'))
        self.resource = Resource.objects.create(name='Gaze')
        self.payload = {'patient': self.patient.pk, 'start_date': '2026-10-08', 'needs': [self.need.pk]}
        self.configuration = {'required_professional': self.professional.pk,
            'frequency_quantity': 2, 'frequency_period': 'WEEK',
            'resources': [{'resource': self.resource.pk, 'quantity': 3, 'observation': 'Curativo'}]}

    def create(self):
        response = self.client.post('/api/planos-cuidados/', self.payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        return response.data

    def test_full_api_lifecycle_and_history(self):
        data = self.create()
        base = f"/api/planos-cuidados/{data['id']}/"
        link_base = base + f"necessidades/{data['need_links'][0]['id']}/"
        self.assertEqual(self.client.get(base).data['patient_name'], self.patient.full_name)
        response = self.client.post(link_base + 'configurar/', self.configuration, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['need_links'][0]['resources'][0]['quantity'], 3)
        self.assertEqual(self.client.patch(base, {'objective': 'Recuperação'}, format='json').status_code, 200)
        self.assertEqual(self.client.post(base + 'reativar/').status_code, 400)
        self.assertEqual(self.client.post(base + 'ativar/').status_code, 200)
        nurse = auth_client(self.users[ENFERMEIRO_CPF])
        self.assertEqual(nurse.post(base + 'encerrar/').status_code, 200)
        self.assertEqual(self.client.post(base + 'ativar/').status_code, 400)
        self.assertEqual(nurse.post(base + 'reativar/').status_code, 200)
        self.assertEqual(self.client.post(link_base + 'remover/', {'reason': 'Revisão'}, format='json').status_code, 200)
        self.need.refresh_from_db()
        self.assertTrue(self.need.is_active)
        history = self.client.get(base + 'historico/').data
        self.assertEqual(len(history), 7)
        self.assertEqual(history[0]['new_data']['needs'][0]['removal_reason'], 'Revisão')
        self.assertEqual(self.client.delete(base).status_code, 405)

    def test_create_required_fields_filters_and_catalogs(self):
        response = self.client.post('/api/planos-cuidados/', {}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertEqual(set(response.data), {'patient', 'start_date', 'needs'})
        self.create()
        self.assertEqual(self.client.get(f'/api/planos-cuidados/?patient={self.patient.pk}').data['count'], 1)
        for value in ('abc', '0', '-1', ''):
            self.assertEqual(self.client.get(f'/api/planos-cuidados/?patient={value}').status_code, 400)
        for path in ('profissionais', 'recursos', f'necessidades-disponiveis/?patient={self.patient.pk}'):
            url = '/api/planos-cuidados/' + path
            if '?' not in path:
                url += '/'
            self.assertEqual(self.client.get(url).status_code, 200)

    def test_invalid_configuration_leaves_link_unchanged_and_resources_optional(self):
        data = self.create()
        base = f"/api/planos-cuidados/{data['id']}/"
        configure = base + f"necessidades/{data['need_links'][0]['id']}/configurar/"
        for payload in ({}, {**self.configuration, 'frequency_quantity': 0},
                        {**self.configuration, 'required_professional': 999999},
                        {**self.configuration, 'resources': [{'resource': self.resource.pk, 'quantity': 0}]},
                        {**self.configuration, 'resources': [{'resource': 999999, 'quantity': 1}]}):
            self.assertEqual(self.client.post(configure, payload, format='json').status_code, 400)
        self.assertIsNone(CarePlan.objects.get(pk=data['id']).need_links.get().required_professional_id)
        self.assertEqual(self.client.post(configure, self.configuration, format='json').status_code, 200)
        self.assertEqual(self.client.post(configure, {**self.configuration, 'resources': []}, format='json').status_code, 200)
        self.assertFalse(CarePlan.objects.get(pk=data['id']).need_links.get().resources.exists())
        for field in ('patient', 'status', 'created_by'):
            self.assertEqual(self.client.patch(base, {field: 999999}, format='json').status_code, 400)

    def test_link_is_scoped_to_plan_and_configure_removed_link_is_blocked(self):
        first, second = self.create(), self.create()
        base = f"/api/planos-cuidados/{second['id']}/"
        wrong = base + f"necessidades/{first['need_links'][0]['id']}/configurar/"
        self.assertEqual(self.client.post(wrong, self.configuration, format='json').status_code, 404)
        link_base = base + f"necessidades/{second['need_links'][0]['id']}/"
        self.assertEqual(self.client.post(link_base + 'remover/', {'reason': ' '}, format='json').status_code, 400)
        self.assertEqual(self.client.post(link_base + 'remover/', {'reason': 'Revisão'}, format='json').status_code, 200)
        self.assertEqual(self.client.post(link_base + 'configurar/', self.configuration, format='json').status_code, 400)
        response = self.client.post(base + 'necessidades/', {'care_need': self.need.pk}, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(len(response.data['need_links']), 2)

    def test_configuration_rolls_back_if_history_fails(self):
        data = self.create()
        base = f"/api/planos-cuidados/{data['id']}/necessidades/{data['need_links'][0]['id']}/configurar/"
        with patch('care_plans.services.record', side_effect=RuntimeError('failure')):
            with self.assertRaises(RuntimeError):
                self.client.post(base, self.configuration, format='json')
        link = CarePlan.objects.get(pk=data['id']).need_links.get()
        self.assertIsNone(link.required_professional_id)
        self.assertFalse(link.resources.exists())
