from django.db import migrations


def seed(apps, schema_editor):
    Permission = apps.get_model('accounts', 'GranularPermission')
    Category = apps.get_model('accounts', 'Category')
    alias = schema_editor.connection.alias
    permission, _ = Permission.objects.using(alias).get_or_create(
        feature='necessidades', action='reactivate',
        defaults={'codename': 'necessidades.reactivate', 'description': 'Reativar necessidades'},
    )
    for category in Category.objects.using(alias).filter(name__in=('Gerente', 'Médico', 'Enfermeiro')):
        category.permissions.add(permission)


def unseed(apps, schema_editor):
    apps.get_model('accounts', 'GranularPermission').objects.using(schema_editor.connection.alias).filter(codename='necessidades.reactivate').delete()


class Migration(migrations.Migration):
    dependencies = [('accounts', '0007_seed_need_inactivate_permission')]
    operations = [migrations.RunPython(seed, unseed)]
