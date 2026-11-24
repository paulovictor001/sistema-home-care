from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("assessments", "0004_move_needtype_from_patients"),
        ("patients", "0006_healthcondition_name"),
    ]

    # The model state moved to assessments. The `need_types` table is retained.
    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[migrations.DeleteModel(name="NeedType")],
        ),
    ]
