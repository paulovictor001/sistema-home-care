
from django.db import migrations


def grant_permission(apps, schema_editor):
    Permission = apps.get_model('accounts', 'GranularPermission')
    Category = apps.get_model('accounts', 'Category')
    alias = schema_editor.connection.alias

    permission = Permission.objects.using(alias).get(
        codename='planos_cuidados.create'
    )

    gerente = Category.objects.using(alias).get(name='Gerente')
    gerente.permissions.add(permission)


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0011_seed_scale_permissions'),
    ]

    operations = [
        migrations.RunPython(grant_permission, migrations.RunPython.noop),
    ]
