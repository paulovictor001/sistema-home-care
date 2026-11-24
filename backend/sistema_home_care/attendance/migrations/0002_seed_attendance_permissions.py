from django.db import migrations


ACTIONS = ("view", "create", "update", "delete")


def seed_permissions(apps, schema_editor):
    Permission = apps.get_model("accounts", "GranularPermission")
    Category = apps.get_model("accounts", "Category")
    alias = schema_editor.connection.alias
    managers = Category.objects.using(alias).filter(name="Gerente")
    for action in ACTIONS:
        permission, _ = Permission.objects.using(alias).get_or_create(
            feature="atendimentos",
            action=action,
            defaults={
                "codename": f"atendimentos.{action}",
                "description": f"Atendimentos: {action}",
            },
        )
        for category in managers:
            category.permissions.add(permission)


def unseed_permissions(apps, schema_editor):
    Permission = apps.get_model("accounts", "GranularPermission")
    alias = schema_editor.connection.alias
    permissions = Permission.objects.using(alias).filter(
        feature="atendimentos", action__in=ACTIONS
    )
    Permission.categories.through.objects.using(alias).filter(
        granularpermission__in=permissions
    ).delete()
    permissions.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0014_profession_category_one_to_one"),
        ("attendance", "0001_initial"),
    ]

    operations = [migrations.RunPython(seed_permissions, unseed_permissions)]
