from django.db import migrations


ACTIONS = ("create", "view", "update", "delete", "status")


def seed_permissions(apps, schema_editor):
    Permission = apps.get_model("accounts", "GranularPermission")
    Category = apps.get_model("accounts", "Category")
    alias = schema_editor.connection.alias
    manager_categories = Category.objects.using(alias).filter(name="Gerente")
    for action in ACTIONS:
        permission, _ = Permission.objects.using(alias).get_or_create(
            feature="agendamentos",
            action=action,
            defaults={
                "codename": f"agendamentos.{action}",
                "description": f"Agendamentos: {action}",
            },
        )
        for category in manager_categories:
            category.permissions.add(permission)


def unseed_permissions(apps, schema_editor):
    Permission = apps.get_model("accounts", "GranularPermission")
    alias = schema_editor.connection.alias
    permissions = Permission.objects.using(alias).filter(
        feature="agendamentos", action__in=ACTIONS
    )
    through = Permission.categories.through
    through.objects.using(alias).filter(granularpermission__in=permissions).delete()
    permissions.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0014_profession_category_one_to_one"),
        ("visits", "0001_initial"),
    ]

    operations = [migrations.RunPython(seed_permissions, unseed_permissions)]
