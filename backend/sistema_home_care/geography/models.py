from django.db import models


class Region(models.Model):
    name = models.CharField(max_length=100, unique=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Neighborhood(models.Model):
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name='neighborhoods')
    state = models.CharField(max_length=2)
    city = models.CharField(max_length=100)
    name = models.CharField(max_length=100)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['state', 'city', 'name']
        constraints = [models.UniqueConstraint(fields=['state', 'city', 'name'], name='unique_geo_neighborhood')]
        indexes = [models.Index(fields=['state', 'city', 'name'])]

    def __str__(self):
        return f'{self.name} - {self.city}/{self.state} ({self.region})'
