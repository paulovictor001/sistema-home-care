from django.db import migrations


ACTIONS = {
    "view": "Consultar necessidades",
    "update": "Editar necessidades",
    "delete": "Excluir necessidades",
}


def seed_permissions(apps, schema_editor):
    Permission = apps.get_model("accounts", "GranularPermission")
    Category = apps.get_model("accounts", "Category")
    alias = schema_editor.connection.alias
    permissions = []
    for action, description in ACTIONS.items():
        permission, _ = Permission.objects.using(alias).get_or_create(
            feature="necessidades", action=action,
            defaults={"codename": f"necessidades.{action}", "description": description},
        )
        permissions.append(permission)
    for category in Category.objects.using(alias).filter(name__in=("Médico", "Enfermeiro")):
        category.permissions.add(*permissions)


def unseed_permissions(apps, schema_editor):
    Permission = apps.get_model("accounts", "GranularPermission")
    Permission.objects.using(schema_editor.connection.alias).filter(
        codename__in=[f"necessidades.{action}" for action in ACTIONS]
    ).delete()


class Migration(migrations.Migration):
    dependencies = [("accounts", "0005_seed_avaliacoes_permissions")]
    operations = [migrations.RunPython(seed_permissions, unseed_permissions)]
