from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("assessments", "0003_careneed_inactivated_at_careneed_is_active_and_more"),
        ("patients", "0005_alter_needtype_status"),
    ]

    # NeedType already lives in `need_types`; keep that table and its rows.
    # Updating only migration state avoids a destructive drop/recreate.
    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.CreateModel(
                    name="NeedType",
                    fields=[
                        (
                            "id",
                            models.BigAutoField(
                                auto_created=True,
                                primary_key=True,
                                serialize=False,
                                verbose_name="ID",
                            ),
                        ),
                        ("name", models.CharField(max_length=100, unique=True)),
                        ("description", models.CharField(blank=True, max_length=255)),
                        (
                            "status",
                            models.CharField(
                                choices=[("ACTIVE", "Ativo"), ("INACTIVE", "Inativo")],
                                default="ACTIVE",
                                max_length=10,
                            ),
                        ),
                        ("created_at", models.DateTimeField(auto_now_add=True)),
                        ("updated_at", models.DateTimeField(auto_now=True)),
                    ],
                    options={"db_table": "need_types", "ordering": ["name"]},
                ),
                migrations.AlterField(
                    model_name="careneed",
                    name="need_type",
                    field=models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="care_needs",
                        to="assessments.needtype",
                    ),
                ),
            ],
        ),
    ]
