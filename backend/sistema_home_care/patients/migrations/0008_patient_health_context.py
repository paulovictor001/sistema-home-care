from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0007_patient_gender_choices"),
    ]

    operations = [
        migrations.AddField(
            model_name="patient",
            name="allergies",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="patient",
            name="restrictions",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="patient",
            name="special_needs",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="patient",
            name="important_observations",
            field=models.TextField(blank=True, default=""),
        ),
    ]
