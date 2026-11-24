from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("patients", "0006_remove_needtype")]

    operations = [
        migrations.AlterField(
            model_name="patient",
            name="gender",
            field=models.CharField(
                choices=[
                    ("Masculino", "Masculino"),
                    ("Feminino", "Feminino"),
                    ("Prefiro não dizer", "Prefiro não dizer"),
                ],
                max_length=50,
            ),
        ),
    ]
