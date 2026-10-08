"""TASK 01: plano principal e estrutura de histórico.

Fonte: regras_negocio_plano_cuidados.md e requisitos_funcionais_plano_cuidados.md.
Vínculos/configurações de necessidades e recursos: TASK 02–04.
Exclusividade de plano ativo e transições: TASK 06–10.
Autorização e preenchimento dos autores: TASK 13–14; gravação do histórico: TASK 19.
"""
from django.conf import settings
from django.db import models


class CarePlanStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Rascunho'
    ACTIVE = 'ACTIVE', 'Ativo'
    CLOSED = 'CLOSED', 'Encerrado'


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
        constraints = [models.CheckConstraint(
            condition=models.Q(status__in=CarePlanStatus.values), name='care_plan_valid_status',
        )]

    def __str__(self):
        return f'Plano #{self.pk} — paciente {self.patient_id} ({self.get_status_display()})'


class CarePlanHistory(models.Model):
    """Estrutura para preservar alterações; registro automático vem na TASK 19."""
    care_plan = models.ForeignKey(CarePlan, on_delete=models.PROTECT, related_name='history')
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='care_plan_changes')
    changed_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField()
    previous_data = models.JSONField(default=dict, blank=True)
    new_data = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'care_plan_history'
        ordering = ['-changed_at', '-pk']

    def __str__(self):
        return f'Histórico #{self.pk} do plano {self.care_plan_id}'
