# Seed do gerenciamento de usuarios + backfill de usuarios legados.
#
# - Cria o catalogo de permissoes granulares e as profissoes/categorias
#   Gerente/Medico/Enfermeiro (matriz inicial = comportamento atual via Groups).
# - Atribui a cada usuario existente exatamente uma categoria (pelo grupo;
#   sem grupo -> "Apoio", sem permissoes) e um profissional vinculado (stub).
# - Ao final, `User.category` passa a ser obrigatoria.

import django.db.models.deletion
from django.db import migrations, models


PERMISSIONS = [
    ("pacientes", "view", "Visualizar pacientes"),
    ("pacientes", "create", "Cadastrar pacientes"),
    ("pacientes", "update_clinical", "Editar dados clinicos do paciente"),
    ("pacientes", "update_manager", "Alterar medico/equipe responsavel"),
    ("pacientes", "inactivate", "Inativar pacientes"),
    ("pacientes", "reactivate", "Reativar pacientes"),
    ("usuarios", "view", "Visualizar usuarios"),
    ("usuarios", "create", "Criar usuarios"),
    ("usuarios", "update", "Editar usuarios"),
    ("usuarios", "inactivate", "Inativar usuarios"),
    ("usuarios", "reactivate", "Reativar usuarios"),
    ("usuarios", "delete", "Excluir usuarios definitivamente"),
    ("categorias", "view", "Visualizar categorias"),
    ("categorias", "create", "Criar categorias"),
    ("categorias", "update", "Editar categorias"),
    ("categorias", "manage_permissions", "Configurar permissoes das categorias"),
    ("profissoes", "view", "Visualizar profissoes"),
    ("profissoes", "create", "Criar profissoes"),
    ("profissoes", "update", "Editar profissoes"),
    ("profissoes", "inactivate", "Inativar profissoes"),
    ("profissoes", "delete", "Excluir profissoes definitivamente"),
    ("profissoes", "transfer", "Transferir profissionais entre profissoes"),
    ("medicos", "view", "Listar medicos (apoio ao cadastro de paciente)"),
    ("permissoes", "view", "Visualizar catalogo de permissoes"),
]

CLINICAL_PERMS = {"pacientes.view", "pacientes.update_clinical"}

LEGACY_CATEGORIES = (
    ("Gerente", "GERENTE"),
    ("Médico", "MEDICO"),
    ("Enfermeiro", "ENFERMEIRO"),
)


def seed_and_backfill(apps, schema_editor):
    Category = apps.get_model("accounts", "Category")
    Profession = apps.get_model("accounts", "Profession")
    GranularPermission = apps.get_model("accounts", "GranularPermission")
    User = apps.get_model("accounts", "User")
    Professional = apps.get_model("professionals", "Professional")
    Group = apps.get_model("auth", "Group")

    perms = {}
    for feature, action, description in PERMISSIONS:
        perm, _ = GranularPermission.objects.get_or_create(
            feature=feature,
            action=action,
            defaults={
                "codename": f"{feature}.{action}",
                "description": description,
            },
        )
        perms[perm.codename] = perm

    categories = {}
    for cat_name, _group_name in LEGACY_CATEGORIES:
        profession, _ = Profession.objects.get_or_create(
            name=cat_name, defaults={"is_active": True}
        )
        category, _ = Category.objects.get_or_create(name=profession.name)
        categories[cat_name] = (profession, category)

    gerente = categories["Gerente"][1]
    gerente.permissions.set(perms.values())
    for cat_name in ("Médico", "Enfermeiro"):
        categories[cat_name][1].permissions.set(
            perms[codename] for codename in CLINICAL_PERMS
        )

    apoio_profession, _ = Profession.objects.get_or_create(
        name="Apoio", defaults={"is_active": True}
    )
    apoio_category, _ = Category.objects.get_or_create(name="Apoio")

    for user in User.objects.all().order_by("id"):
        group_names = set(
            Group.objects.filter(user=user).values_list("name", flat=True)
        )
        if "GERENTE" in group_names:
            profession, category = categories["Gerente"]
        elif "MEDICO" in group_names:
            profession, category = categories["Médico"]
        elif "ENFERMEIRO" in group_names:
            profession, category = categories["Enfermeiro"]
        else:
            profession, category = apoio_profession, apoio_category
        if user.category_id is None:
            user.category = category
            user.save(update_fields=["category"])
        if not Professional.objects.filter(user_id=user.pk).exists():
            full_name = f"{user.first_name} {user.last_name}".strip() or user.cpf
            Professional.objects.create(
                user_id=user.pk,
                full_name=full_name,
                profession_id=profession.pk,
                is_active=user.is_active,
            )


def unseed_and_unfill(apps, schema_editor):
    Professional = apps.get_model("professionals", "Professional")
    User = apps.get_model("accounts", "User")
    Category = apps.get_model("accounts", "Category")
    Profession = apps.get_model("accounts", "Profession")
    GranularPermission = apps.get_model("accounts", "GranularPermission")
    Professional.objects.filter(user__isnull=False).delete()
    User.objects.all().update(category=None)
    Category.objects.filter(
        name__in=["Gerente", "Médico", "Enfermeiro", "Apoio"]
    ).delete()
    Profession.objects.filter(
        name__in=["Gerente", "Médico", "Enfermeiro", "Apoio"]
    ).delete()
    GranularPermission.objects.filter(
        codename__in=[f"{feature}.{action}" for feature, action, _ in PERMISSIONS]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0003_category_profession_alter_user_email_user_category_and_more"),
        ("professionals", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_and_backfill, unseed_and_unfill),
        migrations.AlterField(
            model_name="user",
            name="category",
            field=models.ForeignKey(
                help_text="Categoria do usuario (corresponde a profissao).",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="users",
                to="accounts.category",
            ),
        ),
    ]
