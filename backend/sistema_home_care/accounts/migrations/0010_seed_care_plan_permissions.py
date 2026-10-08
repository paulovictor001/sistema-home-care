from django.db import migrations


def seed(apps, schema_editor):
    Permission = apps.get_model('accounts', 'GranularPermission')
    Category = apps.get_model('accounts', 'Category')
    alias = schema_editor.connection.alias
    rules = {
        'view': ('Gerente', 'Médico', 'Enfermeiro'),
        'create': ('Médico',), 'update': ('Médico',), 'activate': ('Médico',),
        'close': ('Médico', 'Enfermeiro'), 'reactivate': ('Médico', 'Enfermeiro'),
    }
    for action, categories in rules.items():
        permission, _ = Permission.objects.using(alias).get_or_create(feature='planos_cuidados', action=action,
            defaults={'codename': f'planos_cuidados.{action}', 'description': f'Plano de cuidados: {action}'})
        for category in Category.objects.using(alias).filter(name__in=categories):
            category.permissions.add(permission)


def unseed(apps, schema_editor):
    apps.get_model('accounts', 'GranularPermission').objects.using(schema_editor.connection.alias).filter(feature='planos_cuidados').delete()


class Migration(migrations.Migration):
    dependencies = [('accounts', '0009_seed_need_authorization')]
    operations = [migrations.RunPython(seed, unseed)]
