"""Modelos do Cadastro do Paciente.

Cobre TASK-CAD-PAC-001 (Patient), 002 (PatientAddress), 004
(FK do medico responsavel; checagem "e
medico" no serializer), 005 (`responsible_team` como JSON provisorio ate
o modulo de profissionais), 006 (unicidade do CPF no banco +
normalizacao na aplicacao) e 028-031 em nivel de model (obrigatoriedade,
formato do CPF, endereco, relacionamentos).

Pendencias registradas (nao implementar por inferencia):
- `responsible_team`: JSON provisorio; estrutura real fica para
  TASK-CAD-PAC-005 (modulo de profissionais).
- Obrigatoriedade de `responsible_doctor`/`health_condition` no endpoint:
  TASK-CAD-PAC-008/031 (aqui sao nullable para a fase de modelagem).
- Atualizacao automatica de `age` e regra bairro->`region`.
"""

from django.core.exceptions import ValidationError
from django.db import models

from accounts.validators import normalize_cpf

from .validators import validate_patient_cpf


class PatientStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Ativo"
    INACTIVE = "INACTIVE", "Inativo"


class PatientAuditAction(models.TextChoices):
    """Acoes auditadas do cadastro (TA-37, log minimo).

    Auditoria completa (retencao, formato, UI) permanece pendente; este
    log registra apenas quem/quando/o que mudou nas operacoes relevantes:
    criacao, edicao, inativacao/reativacao e troca de medico/equipe.
    """

    CREATE = "CREATE", "Criação"
    UPDATE = "UPDATE", "Edição"
    INACTIVATE = "INACTIVATE", "Inativação"
    REACTIVATE = "REACTIVATE", "Reativação"
    DOCTOR_TEAM_CHANGE = "DOCTOR_TEAM_CHANGE", "Troca de médico/equipe"


class PatientAuditLog(models.Model):
    """Trilha minima de auditoria do paciente (TA-37)."""

    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.CASCADE,
        related_name="audit_logs",
    )
    actor = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="patient_audit_logs",
    )
    action = models.CharField(max_length=20, choices=PatientAuditAction.choices)
    changes = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "patient_audit_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"PatientAuditLog #{self.pk} {self.action}"


class Patient(models.Model):
    """Cadastro principal e permanente do paciente (TASK-CAD-PAC-001)."""

    full_name = models.CharField(max_length=255)
    birth_date = models.DateField()
    cpf = models.CharField(
        max_length=11,
        unique=True,
        db_index=True,
        validators=[validate_patient_cpf],
        help_text="CPF do paciente, somente digitos (mascara aceita na entrada).",
    )
    rg = models.CharField(max_length=20)
    age = models.PositiveIntegerField()
    phone = models.CharField(max_length=20)
    gender = models.CharField(
        max_length=50,
        choices=[
            ("Masculino", "Masculino"),
            ("Feminino", "Feminino"),
            ("Prefiro não dizer", "Prefiro não dizer"),
        ],
    )
    status = models.CharField(
        max_length=10,
        choices=PatientStatus.choices,
        default=PatientStatus.ACTIVE,
    )
    # TODO(TASK-CAD-PAC-008/031): tornar obrigatorio no endpoint de cadastro.
    # A checagem "e medico" (grupo MEDICO) e feita no serializer, pois
    # grupo e dado de auth (TASK-CAD-PAC-004/031).
    responsible_doctor = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="patients",
    )
    responsible_team = models.ForeignKey(
        "professionals.Team",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="patients",
        help_text="Equipe atual responsavel pelo paciente.",
    )
    # TODO(TASK-CAD-PAC-008/031): tornar obrigatorio no endpoint de cadastro.
    health_condition = models.TextField(blank=True, default="", max_length=2000)
    allergies = models.TextField(blank=True, default="")
    restrictions = models.TextField(blank=True, default="")
    special_needs = models.TextField(blank=True, default="")
    important_observations = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "patients"
        ordering = ["full_name"]

    def clean(self):
        super().clean()
        normalized = normalize_cpf(self.cpf or "")
        if normalized:
            self.cpf = normalized

    def save(self, *args, **kwargs):
        self.cpf = normalize_cpf(self.cpf or "")
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.full_name


class PatientAddress(models.Model):
    """Endereco unico do paciente (TASK-CAD-PAC-002, RN-CAD-PAC-006)."""

    patient = models.OneToOneField(
        Patient,
        on_delete=models.CASCADE,
        related_name="address",
    )
    zip_code = models.CharField(max_length=20)
    state = models.CharField(max_length=2)
    city = models.CharField(max_length=100)
    neighborhood = models.CharField(max_length=100)
    street = models.CharField(max_length=255)
    number = models.CharField(max_length=20)
    complement = models.CharField(max_length=255, blank=True)
    reference_point = models.CharField(max_length=255, blank=True)
    region = models.CharField(max_length=100, blank=True)
    neighborhood_record = models.ForeignKey('geography.Neighborhood', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='patient_addresses')

    class Meta:
        db_table = "patient_addresses"

    def clean(self):
        super().clean()
        if self.patient_id is None:
            raise ValidationError({"patient": "Paciente e obrigatorio."})

    def __str__(self):
        return f"{self.street}, {self.number} - {self.city}"
