from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("patients", "0005_alter_needtype_status")]
    operations = [migrations.AddField(
        model_name="healthcondition", name="name",
        field=models.CharField(blank=True, default="", max_length=255),
    )]
