"""TA-91: CRUD pelo cadastro admin e catálogo de seleção da avaliação."""
from django.contrib import admin
from django.db.models import ProtectedError
from django.test import TestCase, RequestFactory
from assessments.models import CareNeed, PatientAssessment
from assessments.tests_api import make_api_users, make_patient, auth_client, MEDICO_CPF
from .models import NeedType


class NeedTypeContractTests(TestCase):
    def setUp(self):
        self.users = make_api_users()
        self.client = auth_client(self.users[MEDICO_CPF])
        self.model_admin = admin.site._registry[NeedType]
        self.request = RequestFactory().get('/admin/')
        self.request.user = self.users[MEDICO_CPF]

    def test_admin_create_update_read_delete_unlinked_type(self):
        form_class = self.model_admin.get_form(self.request)
        form = form_class(data={'name': 'Teste cadastrado', 'description': 'Descrição', 'status': 'ACTIVE'})
        self.assertTrue(form.is_valid(), form.errors)
        kind = form.save(commit=False)
        self.model_admin.save_model(self.request, kind, form, False)
        self.assertEqual(self.client.get(f'/api/tipos-necessidade/{kind.pk}/').data['name'], 'Teste cadastrado')
        form = form_class(instance=kind, data={'name': 'Renomeado', 'description': 'Editada', 'status': 'ACTIVE'})
        self.assertTrue(form.is_valid(), form.errors)
        self.model_admin.save_model(self.request, form.save(commit=False), form, True)
        kind.refresh_from_db()
        self.assertEqual(kind.description, 'Editada')
        pk = kind.pk
        self.model_admin.delete_model(self.request, kind)
        self.assertFalse(NeedType.objects.filter(pk=pk).exists())

    def test_inactive_type_hidden_rejected_for_new_need_and_historical_link_preserved(self):
        kind = NeedType.objects.get(name='Enfermagem')
        assessment = PatientAssessment.objects.create(patient=make_patient())
        need = CareNeed.objects.create(assessment=assessment, need_type=kind, description='Histórica', priority='LOW')
        url = f'/api/tipos-necessidade/{kind.pk}/'
        self.assertEqual(self.client.post(url + 'inativar/').status_code, 200)
        self.assertNotIn(kind.pk, [item['id'] for item in self.client.get('/api/tipos-necessidade/').data])
        self.assertIn(kind.pk, [item['id'] for item in self.client.get('/api/tipos-necessidade/?status=todos').data])
        payload = {'need_type': kind.pk, 'description': 'Nova', 'priority': 'LOW'}
        self.assertEqual(self.client.post(f'/api/avaliacoes/{assessment.pk}/necessidades/', payload, format='json').status_code, 400)
        need.refresh_from_db()
        self.assertEqual(need.need_type_id, kind.pk)
        with self.assertRaises(ProtectedError):
            kind.delete()
        self.assertEqual(self.client.post(url + 'reativar/').status_code, 200)
        self.assertIn(kind.pk, [item['id'] for item in self.client.get('/api/tipos-necessidade/').data])
        self.assertEqual(self.client.post(f'/api/avaliacoes/{assessment.pk}/necessidades/', payload, format='json').status_code, 201)
