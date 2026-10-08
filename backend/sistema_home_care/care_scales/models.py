from django.db import models


class CareScale(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'care_scales'
        ordering = ['-created_at', '-pk']

    def __str__(self):
        return f'Escala #{self.pk}'
