from django.db import migrations


def seed(apps, schema_editor):
    Permission = apps.get_model('accounts', 'GranularPermission')
    Category = apps.get_model('accounts', 'Category')
    alias = schema_editor.connection.alias
    for action in ('create', 'update', 'view', 'delete', 'change_status'):
        permission, _ = Permission.objects.using(alias).get_or_create(
            feature='escalas', action=action,
            defaults={'codename': f'escalas.{action}', 'description': f'Escala: {action}'})
        for category in Category.objects.using(alias).filter(name='Gerente'):
            category.permissions.add(permission)


class Migration(migrations.Migration):
    dependencies = [('accounts', '0010_seed_care_plan_permissions')]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
