"""Validadores de CPF compartilhados.

O login usa o CPF como `USERNAME_FIELD` do modelo customizado
`accounts.User` (somente digitos).
A mesma rotina sera reutilizada no cadastro de paciente (TASK-CAD-PAC-029).
"""

import re

CPF_LENGTH = 11


def normalize_cpf(value: str) -> str:
    """Remove mascara e espacos, retornando so digitos."""
    if value is None:
        return ""
    return re.sub(r"\D", "", str(value))


def is_valid_cpf(value: str) -> bool:
    """Valida CPF pelos digitos verificadores (algoritmo oficial)."""
    cpf = normalize_cpf(value)
    if len(cpf) != CPF_LENGTH or not cpf.isdigit():
        return False
    if len(set(cpf)) == 1:
        return False
    for size in (9, 10):
        total = sum(int(cpf[i]) * (size + 1 - i) for i in range(size))
        digit = (total * 10) % 11 % 10
        if int(cpf[size]) != digit:
            return False
    return True


def validate_cpf(value: str) -> str:
    """Normaliza e valida; levanta ValueError se invalido. Retorna so digitos."""
    cpf = normalize_cpf(value)
    if not is_valid_cpf(cpf):
        raise ValueError("CPF invalido.")
    return cpf


def mask_cpf(cpf: str) -> str:
    """Formata 11 digitos como 000.000.000-00 (para exibicao)."""
    digits = normalize_cpf(cpf)
    if len(digits) != CPF_LENGTH:
        return cpf
    return f"{digits[:3]}.{digits[3:6]}.{digits[6:9]}-{digits[9:]}"
