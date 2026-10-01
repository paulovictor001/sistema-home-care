"""Modelos da Avaliação Inicial.

Cobre TASK-AVL-MOD-001 (PatientAssessment), 002 (CareNeed), 003
(AssessmentResource + stub Resource), 004 (AssessmentType restrito a
"Avaliação inicial"), 006 (NeedPriority) e 007 (NeedStatus default
Identificada).

Pendencias registradas (nao implementar por inferencia):
- Obrigatoriedade dos campos (RN-AVL-003): validada no endpoint
  (TASK-AVL-BE-002); aqui os campos seguem permissivos como em Patient
  (nullable/blank), exceto os com default.
- Estrutura detalhada de `Resource`: pendente (RN-AVL-016/017 cobrem so
  o vinculo); stub minimo como HealthCondition, sem inventar atributos
  de estoque/farmacia/logistica.
- Status da avaliacao: nao possui (RN-AVL-010). Transicoes de status da
  necessidade ficam para o Plano de Cuidados.
"""

from django.core.exceptions import ValidationError
from django.db import models


class AssessmentType(models.TextChoices):
    """Tipo de avaliacao (TA-43/TASK-AVL-MOD-004, RN-AVL-001)."""

    INITIAL = "INITIAL", "Avaliação inicial"


class NeedPriority(models.TextChoices):
    """Prioridade da necessidade (TA-45/TASK-AVL-MOD-006, RN-AVL-013)."""

    LOW = "LOW", "Baixa"
    MEDIUM = "MEDIUM", "Média"
    HIGH = "HIGH", "Alta"
    URGENT = "URGENT", "Urgente"


class NeedStatus(models.TextChoices):
    """Status da necessidade (TA-46/TASK-AVL-MOD-007, RN-AVL-014)."""

    IDENTIFIED = "IDENTIFIED", "Identificada"


class RequestOrigin(models.TextChoices):
    """Origem da solicitacao (TA-41/TASK-AVL-MOD-005, RN-AVL-004).

    Valores armazenados sao os proprios rotulos (sem codigo separado),
    preservando os registros criados quando o campo era livre e o
    contrato com o frontend (`REQUEST_ORIGINS`).
    """

    FAMILIA = "Família", "Família"
    MEDICO = "Médico", "Médico"
    HOSPITAL = "Hospital", "Hospital"
    CLINICA = "Clínica", "Clínica"
    OUTRO = "Outro", "Outro"


class Resource(models.Model):
    """Recurso cadastrável (stub minimo, TA-44/TASK-AVL-MOD-003).

    Estrutura detalhada pendente: propositadamente so possui nome +
    timestamps para permitir o vinculo com a avaliacao (RN-AVL-016/017)
    sem inventar atributos de estoque, farmacia ou logistica.
    """

    name = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "resources"
        ordering = ["name"]

    def clean(self):
        super().clean()
        self.name = (self.name or "").strip()
        if not self.name:
            raise ValidationError({"name": "Nome é obrigatório."})

    def save(self, *args, **kwargs):
        self.name = (self.name or "").strip()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class PatientAssessment(models.Model):
    """Avaliacao inicial do paciente (TA-40/TASK-AVL-MOD-001).

    Registro próprio: nunca sobrescreve o cadastro permanente nem
    avaliacoes anteriores (RN-AVL-006). Um paciente pode ter varias
    avaliacoes.
    """

    # TODO(TASK-AVL-BE-002): tornar obrigatorios no endpoint de criacao
    # (paciente, profissional, data, hora, tipo, motivo, queixa).
    # A checagem "e medico/enfermeiro" e de auth, fora do model.
    patient = models.ForeignKey(
        "patients.Patient",
        on_delete=models.PROTECT,
        related_name="assessments",
    )
    professional = models.ForeignKey(
        "accounts.User",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="assessments",
    )
    assessment_type = models.CharField(
        max_length=10,
        choices=AssessmentType.choices,
        default=AssessmentType.INITIAL,
    )
    assessment_date = models.DateField(null=True, blank=True)
    assessment_time = models.TimeField(null=True, blank=True)
    # Origem padronizada (TA-41/TASK-AVL-MOD-005, RN-AVL-004).
    # Opcional: nao consta entre os obrigatorios (RN-AVL-003).
    request_origin = models.CharField(
        max_length=50, choices=RequestOrigin.choices, blank=True
    )
    administrative_observations = models.TextField(blank=True)
    request_reason = models.TextField(blank=True)
    chief_complaint = models.TextField(blank=True)
    initial_need_description = models.TextField(blank=True)
    need_start_date = models.DateField(null=True, blank=True)
    anamnesis = models.TextField(blank=True)
    hda = models.TextField(blank=True)
    current_condition = models.TextField(blank=True)
    observations = models.TextField(blank=True)
    relevant_information = models.TextField(blank=True)
    conclusion = models.TextField(blank=True)
    recommendation = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "patient_assessments"
        ordering = ["-assessment_date", "-created_at"]

    def __str__(self):
        return f"Avaliação #{self.pk} de {self.patient_id}"


class CareNeed(models.Model):
    """Necessidade identificada na avaliacao (TA-42/TASK-AVL-MOD-002).

    Uma avaliacao possui multiplas necessidades (RN-AVL-011); cada
    necessidade e um registro independente e fara a ligacao com o
    futuro Plano de Cuidados.
    """

    assessment = models.ForeignKey(
        PatientAssessment,
        on_delete=models.CASCADE,
        related_name="care_needs",
    )
    need_type = models.ForeignKey(
        "patients.NeedType",
        on_delete=models.PROTECT,
        related_name="care_needs",
    )
    description = models.TextField()
    priority = models.CharField(max_length=10, choices=NeedPriority.choices)
    status = models.CharField(
        max_length=10,
        choices=NeedStatus.choices,
        default=NeedStatus.IDENTIFIED,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "care_needs"
        ordering = ["-created_at"]

    def clean(self):
        super().clean()
        self.description = (self.description or "").strip()
        if not self.description:
            raise ValidationError({"description": "Descrição é obrigatória."})
        if not self.priority:
            raise ValidationError({"priority": "Prioridade é obrigatória."})

    def save(self, *args, **kwargs):
        self.description = (self.description or "").strip()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"CareNeed #{self.pk} ({self.get_priority_display()})"


class AssessmentResource(models.Model):
    """Recurso associado a avaliacao (TA-44/TASK-AVL-MOD-003, RN-AVL-017)."""

    assessment = models.ForeignKey(
        PatientAssessment,
        on_delete=models.CASCADE,
        related_name="assessment_resources",
    )
    resource = models.ForeignKey(
        Resource,
        on_delete=models.PROTECT,
        related_name="assessment_resources",
    )
    quantity = models.PositiveIntegerField()
    observation = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "assessment_resources"
        ordering = ["-created_at"]

    def clean(self):
        super().clean()
        self.observation = (self.observation or "").strip()
        if self.quantity is not None and self.quantity < 1:
            raise ValidationError({"quantity": "Quantidade deve ser ao menos 1."})

    def save(self, *args, **kwargs):
        self.observation = (self.observation or "").strip()
        return super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.resource_id} x{self.quantity} na avaliação {self.assessment_id}"
