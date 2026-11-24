from django.db import migrations


def seed(apps, schema_editor):
    Permission = apps.get_model("accounts", "GranularPermission")
    Category = apps.get_model("accounts", "Category")
    alias = schema_editor.connection.alias
    change_professional = Permission.objects.using(alias).get(
        codename="avaliacoes.change_professional"
    )
    Permission.objects.using(alias).get_or_create(
        feature="avaliacoes",
        action="manage_resources",
        defaults={
            "codename": "avaliacoes.manage_resources",
            "description": "Cadastrar e manter recursos da avaliação",
        },
    )
    for category in Category.objects.using(alias).all():
        if category.name == "Gerente":
            category.permissions.add(change_professional)
            category.permissions.add(
                Permission.objects.using(alias).get(codename="avaliacoes.manage_resources")
            )
        elif category.name in ("Médico", "Enfermeiro"):
            category.permissions.remove(change_professional)


def unseed(apps, schema_editor):
    Permission = apps.get_model("accounts", "GranularPermission")
    Category = apps.get_model("accounts", "Category")
    alias = schema_editor.connection.alias
    permission = Permission.objects.using(alias).filter(
        codename="avaliacoes.manage_resources"
    ).first()
    if permission:
        for category in Category.objects.using(alias).all():
            category.permissions.remove(permission)
        permission.delete()
    change_professional = Permission.objects.using(alias).filter(
        codename="avaliacoes.change_professional"
    ).first()
    if change_professional:
        for category in Category.objects.using(alias).filter(name__in=("Médico", "Enfermeiro")):
            category.permissions.add(change_professional)


class Migration(migrations.Migration):
    dependencies = [("accounts", "0011_seed_scale_permissions")]
    operations = [migrations.RunPython(seed, unseed)]
