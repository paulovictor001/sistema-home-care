from django.db import models
from care_plans.models import FrequencyPeriod


class ScaleStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Rascunho'
    ACTIVE = 'ACTIVE', 'Ativa'
    SUSPENDED = 'SUSPENDED', 'Suspensa'
    CLOSED = 'CLOSED', 'Encerrada'


class CareScale(models.Model):
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=ScaleStatus.choices, default=ScaleStatus.DRAFT)
    observation = models.TextField(blank=True)
    patient = models.ForeignKey('patients.Patient', on_delete=models.PROTECT,
        related_name='care_scales', null=True, blank=True)
    care_plan = models.ForeignKey('care_plans.CarePlan', on_delete=models.PROTECT,
        related_name='care_scales', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'care_scales'
        ordering = ['-created_at', '-pk']
        constraints = [models.CheckConstraint(condition=models.Q(status__in=ScaleStatus.values), name='valid_care_scale_status')]

    def __str__(self):
        return f'Escala #{self.pk}'


class ScaleNeed(models.Model):
    frequency_quantity = models.PositiveIntegerField(null=True, blank=True)
    frequency_period = models.CharField(max_length=5, choices=FrequencyPeriod.choices, null=True, blank=True)
    planned_quantity = models.PositiveIntegerField(null=True, blank=True)
    planned_period = models.CharField(max_length=5, choices=FrequencyPeriod.choices, null=True, blank=True)
    frequency_reason = models.TextField(blank=True)
    observation = models.TextField(blank=True)
    scale = models.ForeignKey(CareScale, on_delete=models.PROTECT, related_name='items')
    plan_need = models.ForeignKey('care_plans.CarePlanNeed', on_delete=models.PROTECT, related_name='scale_items')
    # Snapshot da profissão exigida no momento da inclusão. Plano não sobrescreve escala.
    required_profession = models.ForeignKey('accounts.Profession', on_delete=models.PROTECT,
        null=True, blank=True, related_name='scale_requirements')
    removed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'care_scale_needs'
        ordering = ['pk']
        constraints = [models.UniqueConstraint(fields=['scale', 'plan_need'],
            condition=models.Q(removed_at__isnull=True), name='unique_current_scale_need'),
            models.CheckConstraint(condition=models.Q(frequency_quantity__isnull=True) | models.Q(frequency_quantity__gt=0), name='scale_need_positive_frequency'),
            models.CheckConstraint(condition=models.Q(frequency_period__isnull=True) | models.Q(frequency_period__in=FrequencyPeriod.values), name='scale_need_valid_period')]


class ScaleAssignment(models.Model):
    item = models.ForeignKey(ScaleNeed, on_delete=models.PROTECT, related_name='assignments')
    professional = models.ForeignKey('professionals.Professional', on_delete=models.PROTECT, related_name='scale_assignments')
    removed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'care_scale_assignments'
        ordering = ['pk']
        constraints = [models.UniqueConstraint(fields=['item', 'professional'],
            condition=models.Q(removed_at__isnull=True), name='unique_current_scale_professional')]
