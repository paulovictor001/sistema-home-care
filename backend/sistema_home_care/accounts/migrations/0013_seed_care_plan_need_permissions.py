from django.db import migrations


def seed(apps, schema_editor):
    Permission = apps.get_model('accounts', 'GranularPermission')
    Category = apps.get_model('accounts', 'Category')
    alias = schema_editor.connection.alias
    permission, _ = Permission.objects.using(alias).get_or_create(
        feature='planos_cuidados', action='manage_needs',
        defaults={
            'codename': 'planos_cuidados.manage_needs',
            'description': 'Vincular, configurar e remover necessidades do plano',
        },
    )
    for category in Category.objects.using(alias).filter(name__in=('Médico', 'Enfermeiro')):
        category.permissions.add(permission)


def unseed(apps, schema_editor):
    apps.get_model('accounts', 'GranularPermission').objects.using(
        schema_editor.connection.alias
    ).filter(codename='planos_cuidados.manage_needs').delete()


class Migration(migrations.Migration):
    dependencies = [('accounts', '0012_seed_resource_management')]
    operations = [migrations.RunPython(seed, unseed)]
