"""Camada de servico do gerenciamento de usuarios.

Centraliza as regras que envolvem mais de um modelo (usuario +
profissional + categoria + grupos legados) para que views, admin e
shell compartilhem o mesmo comportamento transacional.
"""

import unicodedata

from django.contrib.auth.models import Group
from django.db import transaction

from professionals.models import Professional

from .audit import log_user_event
from .models import Category, Profession, UserAuditAction


def normalize_token(value: str) -> str:
    """MAIUSCULO sem acentos para comparar categoria <-> grupo legado."""
    text = unicodedata.normalize("NFD", value or "")
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text.upper().strip()


#: Categorias que possuem grupo Django legado homonimo.
LEGACY_GROUP_NAMES = ("GERENTE", "MEDICO", "ENFERMEIRO")


def sync_legacy_groups(user) -> None:
    """Espelha a categoria nos Groups legados (GERENTE/MEDICO/ENFERMEIRO).

    Transitorio: os endpoints clinicos ainda autorizam por Groups. Quando
    migrarem para permissao granular, este espelho deixa de ser necessario.
    """
    user.groups.remove(*Group.objects.filter(name__in=LEGACY_GROUP_NAMES))
    target = normalize_token(user.category.name if user.category_id else "")
    if target in LEGACY_GROUP_NAMES:
        group, _ = Group.objects.get_or_create(name=target)
        user.groups.add(group)


def category_for_profession(profession: Profession) -> Category:
    """Categoria espelho da profissao (criada sob demanda, sem permissoes)."""
    category, _ = Category.objects.get_or_create(name=profession.name)
    return category


@transaction.atomic
def create_managed_user(
    *,
    cpf,
    password,
    email,
    category,
    first_name="",
    last_name="",
    professional_id=None,
    professional_data=None,
    actor=None,
):
    """Cria usuario + vinculo com profissional (transacional).

    - `professional_id`: vincula profissional existente sem usuario.
    - `professional_data`: cria o profissional ({full_name, profession}).
    - Exatamente uma das duas formas e obrigatoria; a categoria deve
      corresponder a profissao do profissional.
    """
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User(
        cpf=cpf,
        email=email,
        category=category,
        first_name=first_name or "",
        last_name=last_name or "",
    )
    user.set_password(password)
    user.full_clean(exclude=("password",))
    user.save()

    if professional_id is not None and professional_data is not None:
        raise ValueError(
            "Informe professional_id ou professional, nunca ambos."
        )
    if professional_id is not None:
        try:
            professional = Professional.objects.select_related("profession").get(
                pk=professional_id
            )
        except Professional.DoesNotExist:
            raise ValueError("Profissional nao encontrado.")
        if professional.user_id is not None:
            raise ValueError("Profissional ja vinculado a outro usuario.")
        expected = category_for_profession(professional.profession)
        if expected.pk != category.pk:
            raise ValueError(
                "Categoria deve corresponder a profissao do profissional."
            )
        professional.user = user
        professional.is_active = user.is_active
        professional.save(update_fields=["user", "is_active", "updated_at"])
    elif professional_data is not None:
        profession = professional_data.get("profession")
        if profession is None:
            raise ValueError("Profissao do profissional e obrigatoria.")
        expected = category_for_profession(profession)
        if expected.pk != category.pk:
            raise ValueError(
                "Categoria deve corresponder a profissao do profissional."
            )
        professional = Professional.objects.create(
            user=user,
            full_name=professional_data.get("full_name") or "",
            profession=profession,
            is_active=user.is_active,
        )
    else:
        raise ValueError("Profissional vinculado e obrigatorio.")

    sync_legacy_groups(user)
    log_user_event(
        user=user, actor=actor, action=UserAuditAction.CREATE, changes={"id": user.pk}
    )
    return user, professional


@transaction.atomic
def set_user_status(*, user, is_active: bool, actor=None):
    """Inativa/reativa usuario + profissional vinculado (sincronizado)."""
    old = user.is_active
    user.is_active = is_active
    user.save(update_fields=["is_active"])
    try:
        professional = user.professional
    except Professional.DoesNotExist:
        professional = None
    if professional is not None and professional.is_active != is_active:
        professional.is_active = is_active
        professional.save(update_fields=["is_active", "updated_at"])
    action = (
        UserAuditAction.REACTIVATE if is_active else UserAuditAction.INACTIVATE
    )
    log_user_event(
        user=user,
        actor=actor,
        action=action,
        changes={"is_active": [old, is_active]},
    )
    return user


@transaction.atomic
def change_professional_profession(
    *, professional, new_profession, actor=None
):
    """Troca a profissao do profissional e atualiza a categoria do usuario.

    O usuario passa a utilizar as permissoes da categoria correspondente a
    nova profissao. O vinculo usuario-profissional e preservado.
    """
    old_profession_id = professional.profession_id
    if old_profession_id == new_profession.pk:
        return professional
    professional.profession = new_profession
    professional.save(update_fields=["profession", "updated_at"])
    log_user_event(
        user=professional.user,
        actor=actor,
        action=UserAuditAction.PROFESSION_CHANGE,
        changes={
            "professional": professional.pk,
            "profession": [old_profession_id, new_profession.pk],
        },
    )
    user = professional.user
    if user is not None:
        new_category = category_for_profession(new_profession)
        if user.category_id != new_category.pk:
            old_category_id = user.category_id
            user.category = new_category
            user.save(update_fields=["category"])
            sync_legacy_groups(user)
            log_user_event(
                user=user,
                actor=actor,
                action=UserAuditAction.CATEGORY_CHANGE,
                changes={"category": [old_category_id, new_category.pk]},
            )
    return professional


@transaction.atomic
def transfer_profession_professionals(
    *, profession, to_profession, actor=None
):
    """Transfere todos os profissionais para outra profissao."""
    if profession.pk == to_profession.pk:
        raise ValueError("Profissao de destino deve ser diferente.")
    moved = 0
    for professional in Professional.objects.filter(profession=profession):
        change_professional_profession(
            professional=professional, new_profession=to_profession, actor=actor
        )
        moved += 1
    return moved
