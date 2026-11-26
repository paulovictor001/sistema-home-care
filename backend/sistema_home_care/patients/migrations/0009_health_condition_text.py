from django.db import migrations, models


def copy_condition_names(apps, schema_editor):
    Patient = apps.get_model("patients", "Patient")
    database = schema_editor.connection.alias
    patients = Patient.objects.using(database).select_related("health_condition")
    for patient in patients.iterator():
        condition = patient.health_condition
        patient.health_condition_text = (condition.name or "") if condition else ""
        patient.save(update_fields=["health_condition_text"], using=database)


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0008_patient_health_context"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="health_condition_text",
            field=models.TextField(blank=True, default="", max_length=2000),
        ),
        migrations.RunPython(copy_condition_names, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="patient",
            name="health_condition",
        ),
        migrations.RenameField(
            model_name="patient",
            old_name="health_condition_text",
            new_name="health_condition",
        ),
        migrations.AlterField(
            model_name="patient",
            name="health_condition",
            field=models.TextField(blank=True, default="", max_length=2000),
        ),
        migrations.DeleteModel(name="HealthCondition"),
    ]
