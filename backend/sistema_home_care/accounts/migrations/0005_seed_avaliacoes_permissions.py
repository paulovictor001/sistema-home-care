# Seed das permissões granulares da Avaliação Inicial (TA-47 a TA-54).
#
# - Cria o catálogo `avaliacoes.*` (RF-AVL-019 + necessidades/recursos).
# - Gerente recebe todas (espelho do comportamento via Groups; o bloqueio
#   fino — gerente só troca `professional` — continua no serializer).
# - Médico/Enfermeiro recebem todas (criação/edição/nested + visualização).

from django.db import migrations


PERMISSIONS = [
    ("avaliacoes", "create", "Criar avaliações"),
    ("avaliacoes", "view", "Visualizar avaliações"),
    ("avaliacoes", "update", "Editar avaliações"),
    ("avaliacoes", "change_professional", "Alterar profissional responsável"),
    ("avaliacoes", "add_need", "Criar necessidades na avaliação"),
    ("avaliacoes", "add_resource", "Associar recursos à avaliação"),
]


def seed_avaliacoes_permissions(apps, schema_editor):
    Category = apps.get_model("accounts", "Category")
    GranularPermission = apps.get_model("accounts", "GranularPermission")

    perms = []
    for feature, action, description in PERMISSIONS:
        perm, _ = GranularPermission.objects.get_or_create(
            feature=feature,
            action=action,
            defaults={
                "codename": f"{feature}.{action}",
                "description": description,
            },
        )
        perms.append(perm)

    for name in ("Gerente", "Médico", "Enfermeiro"):
        try:
            category = Category.objects.get(name=name)
        except Category.DoesNotExist:
            continue
        category.permissions.add(*perms)


def unseed_avaliacoes_permissions(apps, schema_editor):
    GranularPermission = apps.get_model("accounts", "GranularPermission")
    GranularPermission.objects.filter(
        codename__in=[f"{feature}.{action}" for feature, action, _ in PERMISSIONS]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0004_seed_permissions_backfill"),
    ]

    operations = [
        migrations.RunPython(
            seed_avaliacoes_permissions, unseed_avaliacoes_permissions
        ),
    ]
