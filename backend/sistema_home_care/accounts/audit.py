"""Log minimo de auditoria do usuario.

Mesmo padrao de `patients/audit.py`: um unico ponto de escrita chamado
pelos services/views. Sem signals para evitar duplo log via admin/shell.
"""

from .models import UserAuditLog


def log_user_event(*, user, actor, action, changes=None):
    subject = user if user is not None and getattr(user, "pk", None) else None
    writer = actor if actor is not None and actor.is_authenticated else None
    return UserAuditLog.objects.create(
        user=subject,
        actor=writer,
        action=action,
        changes=changes or {},
    )
