from datetime import date
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.db.models import ProtectedError
from django.test import TestCase
from assessments.tests_api import make_api_users, make_patient, MEDICO_CPF
from .models import CarePlan, CarePlanHistory, CarePlanStatus
from .models import CarePlanNeed, FrequencyPeriod
from django.utils import timezone
from assessments.models import CareNeed, PatientAssessment, NeedPriority
from patients.models import NeedType
from accounts.models import Profession
from professionals.models import Professional


class CarePlanModelTests(TestCase):
    def setUp(self):
        self.patient = make_patient()
        self.user = make_api_users()[MEDICO_CPF]

    def make_plan(self, **overrides):
        data = dict(patient=self.patient, start_date=date(2026, 10, 8),
                    created_by=self.user, updated_by=self.user)
        data.update(overrides)
        return CarePlan.objects.create(**data)

    def test_default_draft_optional_fields_and_authors(self):
        plan = self.make_plan()
        self.assertEqual(plan.status, CarePlanStatus.DRAFT)
        self.assertEqual(plan.objective, '')
        self.assertIsNone(plan.end_date)
        self.assertEqual(plan.created_by, self.user)
        self.assertEqual(plan.updated_by, self.user)
        self.assertIsNotNone(plan.created_at)
        self.assertIsNotNone(plan.updated_at)
        plan.full_clean()

    def test_patient_and_start_date_required(self):
        plan = CarePlan(start_date=date(2026, 10, 8))
        with self.assertRaises(ValidationError) as error:
            plan.full_clean()
        self.assertIn('patient', error.exception.message_dict)
        plan = CarePlan(patient=self.patient)
        with self.assertRaises(ValidationError) as error:
            plan.full_clean()
        self.assertIn('start_date', error.exception.message_dict)
        with self.assertRaises(IntegrityError), transaction.atomic():
            CarePlan.objects.create(patient=self.patient)

    def test_status_choices_and_database_constraint(self):
        for status in CarePlanStatus.values:
            plan = self.make_plan(status=status)
            plan.full_clean()
        with self.assertRaises(IntegrityError), transaction.atomic():
            self.make_plan(status='SUSPENDED')

    def test_end_date_can_be_provided_in_advance_without_closing(self):
        plan = self.make_plan(end_date=date(2026, 12, 31), objective='Objetivo de teste')
        plan.full_clean()
        self.assertEqual(plan.status, CarePlanStatus.DRAFT)
        self.assertEqual(plan.objective, 'Objetivo de teste')

    def test_update_preserves_record_and_created_timestamp(self):
        plan = self.make_plan()
        created_at, updated_at, pk = plan.created_at, plan.updated_at, plan.pk
        plan.objective = 'Novo objetivo'
        plan.save()
        self.assertEqual(plan.pk, pk)
        self.assertEqual(plan.created_at, created_at)
        self.assertGreater(plan.updated_at, updated_at)

    def test_patient_with_plan_is_protected(self):
        self.make_plan()
        with self.assertRaises(ProtectedError):
            self.patient.delete()

    def test_history_snapshots_and_user_deletion_preserve_data(self):
        plan = self.make_plan()
        event = CarePlanHistory.objects.create(care_plan=plan, changed_by=self.user,
            description='Alteração de objetivo', previous_data={'objective': ''},
            new_data={'objective': 'Objetivo'})
        event.full_clean()
        self.user.delete()
        plan.refresh_from_db()
        event.refresh_from_db()
        self.assertIsNone(plan.created_by)
        self.assertIsNone(plan.updated_by)
        self.assertIsNone(event.changed_by)
        self.assertEqual(event.previous_data, {'objective': ''})
        self.assertEqual(event.new_data, {'objective': 'Objetivo'})
        self.assertEqual(plan.history.get().pk, event.pk)
        with self.assertRaises(ProtectedError):
            plan.delete()


class CarePlanNeedModelTests(TestCase):
    def setUp(self):
        self.patient = make_patient()
        assessment = PatientAssessment.objects.create(patient=self.patient)
        self.need = CareNeed.objects.create(assessment=assessment,
            need_type=NeedType.objects.get(name='Enfermagem'),
            description='Curativo diário', priority=NeedPriority.HIGH)

    def make_plan(self, status=CarePlanStatus.DRAFT, **kwargs):
        return CarePlan.objects.create(patient=self.patient, start_date=date(2026, 10, 8),
                                       status=status, **kwargs)

    def link(self, plan, **kwargs):
        return CarePlanNeed.objects.create(care_plan=plan, care_need=self.need, **kwargs)

    def test_configuration_is_stored_per_link_and_preserved_after_removal(self):
        professional = Professional.objects.create(full_name='João',
            profession=Profession.objects.get(name='Enfermeiro'))
        plan = self.make_plan()
        link = self.link(plan, required_professional=professional,
                         frequency_quantity=2, frequency_period=FrequencyPeriod.WEEK)
        link.removed_at = timezone.now()
        link.removal_reason = 'Revisão da frequência'
        link.save()
        replacement = self.link(plan, required_professional=professional,
            frequency_quantity=1, frequency_period=FrequencyPeriod.DAY)
        link.refresh_from_db()
        replacement.refresh_from_db()
        self.assertEqual(link.required_professional, professional)
        self.assertEqual((link.frequency_quantity, link.frequency_period), (2, 'WEEK'))
        self.assertEqual((replacement.frequency_quantity, replacement.frequency_period), (1, 'DAY'))
        with self.assertRaises(ProtectedError):
            professional.delete()

    def test_frequency_periods_and_unconfigured_link(self):
        link = self.link(self.make_plan())
        self.assertIsNone(link.required_professional)
        self.assertIsNone(link.frequency_quantity)
        self.assertIsNone(link.frequency_period)
        for period in FrequencyPeriod.values:
            link.frequency_quantity = 3
            link.frequency_period = period
            link.save()
            link.refresh_from_db()
            self.assertEqual(link.frequency_period, period)

    def test_invalid_frequency_is_rejected_by_model_and_database(self):
        link = self.link(self.make_plan())
        for field, value in (('frequency_quantity', 0), ('frequency_quantity', -1),
                             ('frequency_period', 'YEAR'), ('frequency_period', '')):
            with self.subTest(field=field, value=value):
                setattr(link, field, value)
                with self.assertRaises(ValidationError):
                    link.save()
                with self.assertRaises(IntegrityError), transaction.atomic():
                    CarePlanNeed.objects.filter(pk=link.pk).update(**{field: value})
                link.refresh_from_db()

    def test_many_needs_and_draft_plans(self):
        first, second = self.make_plan(), self.make_plan()
        self.link(first)
        self.link(second)
        other = CareNeed.objects.create(assessment=self.need.assessment,
            need_type=self.need.need_type, description='Monitoramento', priority=NeedPriority.LOW)
        CarePlanNeed.objects.create(care_plan=first, care_need=other)
        self.assertEqual(first.need_links.count(), 2)
        self.assertEqual(self.need.care_plan_links.count(), 2)

    def test_duplicate_current_link_is_rejected_by_model_and_database(self):
        plan = self.make_plan()
        self.link(plan)
        with self.assertRaises(ValidationError):
            self.link(plan)
        with self.assertRaises(IntegrityError), transaction.atomic():
            CarePlanNeed.objects.bulk_create([CarePlanNeed(care_plan=plan, care_need=self.need)])

    def test_wrong_patient_is_rejected(self):
        other = make_patient(cpf='12345678909')
        plan = CarePlan.objects.create(patient=other, start_date=date(2026, 10, 8))
        with self.assertRaises(ValidationError) as error:
            self.link(plan)
        self.assertIn('care_need', error.exception.message_dict)

    def test_only_one_active_plan_per_need(self):
        self.link(self.make_plan(CarePlanStatus.ACTIVE))
        with self.assertRaises(ValidationError):
            self.link(self.make_plan(CarePlanStatus.ACTIVE))
        self.link(self.make_plan())

    def test_activation_and_reactivation_check_existing_links(self):
        self.link(self.make_plan(CarePlanStatus.ACTIVE))
        for status in (CarePlanStatus.DRAFT, CarePlanStatus.CLOSED):
            plan = self.make_plan(status)
            self.link(plan)
            plan.status = CarePlanStatus.ACTIVE
            with self.assertRaises(ValidationError):
                plan.save()
            plan.refresh_from_db()
            self.assertEqual(plan.status, status)

    def test_closed_plan_allows_reuse_and_keeps_need_active(self):
        plan = self.make_plan(CarePlanStatus.ACTIVE)
        old = self.link(plan)
        plan.status = CarePlanStatus.CLOSED
        plan.save()
        self.link(self.make_plan(CarePlanStatus.ACTIVE))
        self.need.refresh_from_db()
        old.refresh_from_db()
        self.assertTrue(self.need.is_active)
        self.assertIsNone(old.removed_at)

    def test_removal_preserves_record_and_allows_new_link(self):
        plan = self.make_plan(CarePlanStatus.ACTIVE)
        old = self.link(plan)
        old.removed_at = timezone.now()
        old.removal_reason = '  Revisão do plano  '
        old.save()
        self.link(plan)
        old.refresh_from_db()
        self.need.refresh_from_db()
        self.assertEqual(old.removal_reason, 'Revisão do plano')
        self.assertEqual(plan.need_links.count(), 2)
        self.assertTrue(self.need.is_active)
        self.assertIsNone(self.need.inactivated_at)

    def test_removal_requires_date_and_nonblank_reason(self):
        plan = self.make_plan()
        for data in ({'removed_at': timezone.now()},
                     {'removed_at': timezone.now(), 'removal_reason': '   '},
                     {'removal_reason': 'Revisão'}):
            with self.assertRaises(ValidationError):
                self.link(plan, **data)
        with self.assertRaises(IntegrityError), transaction.atomic():
            CarePlanNeed.objects.bulk_create([CarePlanNeed(care_plan=plan,
                care_need=self.need, removed_at=timezone.now())])

    def test_link_protects_need_and_plan_from_deletion(self):
        plan = self.make_plan()
        self.link(plan, removed_at=timezone.now(), removal_reason='Revisão')
        for obj in (self.need, plan):
            with self.assertRaises(ProtectedError):
                obj.delete()
