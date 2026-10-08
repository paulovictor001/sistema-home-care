from django.db import migrations


def seed(apps, schema_editor):
    Permission = apps.get_model('accounts', 'GranularPermission')
    Category = apps.get_model('accounts', 'Category')
    alias = schema_editor.connection.alias
    permission, _ = Permission.objects.using(alias).get_or_create(
        feature='necessidades', action='inactivate',
        defaults={'codename': 'necessidades.inactivate', 'description': 'Inativar necessidades'},
    )
    for category in Category.objects.using(alias).filter(name__in=('Gerente', 'Médico', 'Enfermeiro')):
        category.permissions.add(permission)


def unseed(apps, schema_editor):
    apps.get_model('accounts', 'GranularPermission').objects.using(schema_editor.connection.alias).filter(codename='necessidades.inactivate').delete()


class Migration(migrations.Migration):
    dependencies = [('accounts', '0006_seed_necessidades_permissions')]
    operations = [migrations.RunPython(seed, unseed)]
