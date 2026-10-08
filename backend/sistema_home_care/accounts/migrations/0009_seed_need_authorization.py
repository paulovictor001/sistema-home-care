from django.db import migrations


def seed(apps, schema_editor):
    Permission = apps.get_model('accounts', 'GranularPermission')
    Category = apps.get_model('accounts', 'Category')
    alias = schema_editor.connection.alias
    create, _ = Permission.objects.using(alias).get_or_create(
        feature='necessidades', action='create', defaults={
            'codename': 'necessidades.create', 'description': 'Criar necessidades'},
    )
    manage, _ = Permission.objects.using(alias).get_or_create(
        feature='tipos_necessidade', action='manage', defaults={
            'codename': 'tipos_necessidade.manage', 'description': 'Administrar tipos de necessidade'},
    )
    for category in Category.objects.using(alias).filter(name__in=('Gerente', 'Médico', 'Enfermeiro')):
        category.permissions.add(manage)
        # Preserva revogações anteriores da criação, sem ampliar o perfil Gerente.
        if category.name != 'Gerente' and category.permissions.filter(codename='avaliacoes.add_need').exists():
            category.permissions.add(create)


def unseed(apps, schema_editor):
    apps.get_model('accounts', 'GranularPermission').objects.using(schema_editor.connection.alias).filter(
        codename__in=('necessidades.create', 'tipos_necessidade.manage'),
    ).delete()


class Migration(migrations.Migration):
    dependencies = [('accounts', '0008_seed_need_reactivate_permission')]
    operations = [migrations.RunPython(seed, unseed)]
