from django.db import models


class CareScale(models.Model):
    patient = models.ForeignKey('patients.Patient', on_delete=models.PROTECT,
        related_name='care_scales', null=True, blank=True)
    care_plan = models.ForeignKey('care_plans.CarePlan', on_delete=models.PROTECT,
        related_name='care_scales', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'care_scales'
        ordering = ['-created_at', '-pk']

    def __str__(self):
        return f'Escala #{self.pk}'


class ScaleNeed(models.Model):
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
            condition=models.Q(removed_at__isnull=True), name='unique_current_scale_need')]


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
