from django.db import migrations, models
import django.db.models.deletion


def link_profession_categories(apps, schema_editor):
    Profession = apps.get_model("accounts", "Profession")
    Category = apps.get_model("accounts", "Category")
    alias = schema_editor.connection.alias

    for profession in Profession.objects.using(alias).order_by("pk").iterator():
        matches = list(
            Category.objects.using(alias).filter(name=profession.name)[:2]
        )
        if len(matches) > 1:
            raise RuntimeError(
                f"Migração interrompida: mais de uma categoria corresponde à "
                f"profissão {profession.pk} ({profession.name!r})."
            )
        category = matches[0] if matches else Category.objects.using(alias).create(
            name=profession.name
        )
        already_linked = Profession.objects.using(alias).filter(
            category_id=category.pk
        ).exclude(pk=profession.pk)
        if already_linked.exists():
            raise RuntimeError(
                f"Migração interrompida: categoria {category.pk} ({category.name!r}) "
                "já está associada a outra profissão."
            )
        profession.category_id = category.pk
        profession.save(update_fields=["category"])


class Migration(migrations.Migration):
    dependencies = [("accounts", "0013_seed_care_plan_need_permissions")]

    operations = [
        migrations.AddField(
            model_name="profession",
            name="category",
            field=models.OneToOneField(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="profession",
                to="accounts.category",
            ),
        ),
        migrations.RunPython(link_profession_categories, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="profession",
            name="category",
            field=models.OneToOneField(
                help_text="Categoria vinculada exclusivamente a esta profissão.",
                on_delete=django.db.models.deletion.PROTECT,
                related_name="profession",
                to="accounts.category",
            ),
        ),
    ]
