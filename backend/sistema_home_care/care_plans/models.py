"""TASK 01: plano principal e estrutura de histórico.

Fonte: regras_negocio_plano_cuidados.md e requisitos_funcionais_plano_cuidados.md.
Vínculos e configurações de necessidades: TASK 02–03; recursos: TASK 04.
Exclusividade de plano ativo e transições: TASK 06–10.
Autorização e preenchimento dos autores: TASK 13–14; gravação do histórico: TASK 19.
"""
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class CarePlanStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Rascunho'
    ACTIVE = 'ACTIVE', 'Ativo'
    CLOSED = 'CLOSED', 'Encerrado'


class FrequencyPeriod(models.TextChoices):
    DAY = 'DAY', 'Dia'
    WEEK = 'WEEK', 'Semana'
    MONTH = 'MONTH', 'Mês'


class CarePlan(models.Model):
    patient = models.ForeignKey('patients.Patient', on_delete=models.PROTECT, related_name='care_plans')
    status = models.CharField(max_length=10, choices=CarePlanStatus.choices, default=CarePlanStatus.DRAFT)
    start_date = models.DateField()
    # Pode ser informada antecipadamente; não significa encerramento automático.
    end_date = models.DateField(null=True, blank=True)
    objective = models.TextField(blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='created_care_plans')
    updated_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='updated_care_plans')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'care_plans'
        ordering = ['-created_at', '-pk']
        constraints = [models.UniqueConstraint(fields=['patient'],
            condition=models.Q(status=CarePlanStatus.ACTIVE), name='unique_active_plan_patient'),
            models.CheckConstraint(
            condition=models.Q(status__in=CarePlanStatus.values), name='care_plan_valid_status',
        )]

    def __str__(self):
        return f'Plano #{self.pk} — paciente {self.patient_id} ({self.get_status_display()})'

    def clean(self):
        super().clean()
        if self.patient_id and self.status == CarePlanStatus.ACTIVE:
            if CarePlan.objects.filter(patient_id=self.patient_id,
                    status=CarePlanStatus.ACTIVE).exclude(pk=self.pk).exists():
                raise ValidationError({'status': 'O paciente já possui um plano ativo.'})
        if self.pk and self.status == CarePlanStatus.ACTIVE:
            needs = self.need_links.filter(removed_at__isnull=True).values('care_need_id')
            if CarePlanNeed.objects.filter(care_need_id__in=needs,
                    removed_at__isnull=True, care_plan__status=CarePlanStatus.ACTIVE
                    ).exclude(care_plan_id=self.pk).exists():
                raise ValidationError({'status': 'Uma necessidade já está vinculada a outro plano ativo.'})

    def save(self, *args, **kwargs):
        # Valida também a ativação/reativação de um plano já vinculado.
        self.clean()
        return super().save(*args, **kwargs)


class CarePlanNeed(models.Model):
    """Cada registro é um vínculo; remoção preserva o registro e a necessidade."""
    care_plan = models.ForeignKey(CarePlan, on_delete=models.PROTECT, related_name='need_links')
    care_need = models.ForeignKey('assessments.CareNeed', on_delete=models.PROTECT,
                                 related_name='care_plan_links')
    # Nullable para vínculos existentes e configuração posterior (TASK 08–09).
    # PROTECT preserva a referência inclusive após remoção lógica do vínculo.
    required_professional = models.ForeignKey('professionals.Professional',
        on_delete=models.PROTECT, related_name='care_plan_needs', null=True, blank=True)
    frequency_quantity = models.PositiveIntegerField(null=True, blank=True)
    frequency_period = models.CharField(max_length=5, choices=FrequencyPeriod.choices,
                                       null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    removed_at = models.DateTimeField(null=True, blank=True)
    removal_reason = models.TextField(blank=True)
    removed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='removed_care_plan_needs')

    class Meta:
        db_table = 'care_plan_needs'
        ordering = ['created_at', 'pk']
        constraints = [
            models.CheckConstraint(condition=(models.Q(frequency_quantity__isnull=True)
                | models.Q(frequency_quantity__gt=0)), name='care_plan_need_positive_frequency'),
            models.CheckConstraint(condition=(models.Q(frequency_period__isnull=True)
                | models.Q(frequency_period__in=FrequencyPeriod.values)),
                name='care_plan_need_valid_frequency_period'),
            models.UniqueConstraint(fields=['care_plan', 'care_need'],
                condition=models.Q(removed_at__isnull=True), name='unique_current_plan_need'),
            models.CheckConstraint(condition=(
                models.Q(removed_at__isnull=True, removal_reason='', removed_by__isnull=True)
                | (models.Q(removed_at__isnull=False) & ~models.Q(removal_reason=''))
            ), name='care_plan_need_removal_metadata'),
        ]

    def clean(self):
        super().clean()
        self.removal_reason = self.removal_reason.strip()
        if self.removed_at is not None:
            if not self.removal_reason:
                raise ValidationError({'removal_reason': 'Informe o motivo da remoção.'})
        elif self.removal_reason or self.removed_by_id:
            raise ValidationError({'removed_at': 'Informe a data da remoção.'})
        if not self.care_plan_id or not self.care_need_id:
            return
        if self.care_need.assessment.patient_id != self.care_plan.patient_id:
            raise ValidationError({'care_need': 'A necessidade deve pertencer ao paciente do plano.'})
        if self.removed_at is None and self.care_plan.status == CarePlanStatus.ACTIVE:
            if CarePlanNeed.objects.filter(care_need_id=self.care_need_id,
                    removed_at__isnull=True, care_plan__status=CarePlanStatus.ACTIVE
                    ).exclude(care_plan_id=self.care_plan_id).exists():
                raise ValidationError({'care_need': 'A necessidade já está vinculada a outro plano ativo.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f'Necessidade {self.care_need_id} no plano {self.care_plan_id}'


class CarePlanHistory(models.Model):
    """Estrutura para preservar alterações; registro automático vem na TASK 19."""
    care_plan = models.ForeignKey(CarePlan, on_delete=models.PROTECT, related_name='history')
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='care_plan_changes')
    changed_at = models.DateTimeField(auto_now_add=True)
    actor_name = models.CharField(max_length=255, blank=True)
    event_type = models.CharField(max_length=30, default='UPDATE')
    description = models.TextField()
    previous_data = models.JSONField(default=dict, blank=True)
    new_data = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'care_plan_history'
        ordering = ['-changed_at', '-pk']

    def __str__(self):
        return f'Histórico #{self.pk} do plano {self.care_plan_id}'


class CarePlanNeedResource(models.Model):
    """Recurso cadastrado configurado para um vínculo de necessidade (TA-97)."""
    plan_need = models.ForeignKey(CarePlanNeed, on_delete=models.PROTECT, related_name='resources')
    resource = models.ForeignKey('assessments.Resource', on_delete=models.PROTECT,
                                 related_name='care_plan_resources')
    quantity = models.PositiveIntegerField()
    observation = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'care_plan_need_resources'
        ordering = ['pk']
        constraints = [models.CheckConstraint(condition=models.Q(quantity__gt=0),
            name='care_plan_resource_positive_quantity')]

    def save(self, *args, **kwargs):
        self.observation = (self.observation or '').strip()
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.resource_id} x{self.quantity} no vínculo {self.plan_need_id}'
