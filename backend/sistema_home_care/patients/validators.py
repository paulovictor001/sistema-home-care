"""Validadores do app patients (TASK-CAD-PAC-029).

Reutiliza o algoritmo oficial de CPF de `accounts.validators`
(sem duplicar regra). A unicidade e feita no banco (`unique=True`)
e na aplicacao via `full_clean()` (TASK-CAD-PAC-006).
"""

from django.core.exceptions import ValidationError

from accounts.validators import is_valid_cpf


def validate_patient_cpf(value: str) -> None:
    """Validator de model field: aceita mascara, exige digitos validos."""
    if not is_valid_cpf(value or ""):
        raise ValidationError("CPF invalido.")
