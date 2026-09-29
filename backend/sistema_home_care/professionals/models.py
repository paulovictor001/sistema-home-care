"""Profissional vinculado ao usuario (stub minimo).

Campos especificos do cadastro de profissionais pertencem ao modulo
oficial de Profissionais; aqui existe apenas o minimo necessario para
o gerenciamento de usuarios: nome, profissao e status, com vinculo 1:1
obrigatorio (lado usuario) e sincronizacao de status.
"""

from django.conf import settings
from django.db import models


class Professional(models.Model):
    # Nullable: permite profissionais cadastrados sem acesso ainda (pool).
    # Todo usuario, por outro lado, exige profissional (regra de API).
    # CASCADE: excluir o usuario exclui o profissional vinculado.
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="professional",
    )
    full_name = models.CharField(max_length=255)
    profession = models.ForeignKey(
        "accounts.Profession",
        on_delete=models.PROTECT,
        related_name="professionals",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "professionals"
        ordering = ["full_name"]

    def __str__(self):
        return self.full_name
