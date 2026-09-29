"""Log minimo de auditoria do paciente (TA-37).

Um unico ponto de escrita, chamado pelas views (create/update/status).
Sem signals para evitar duplo log via admin/shell. Auditoria completa
(retencao, formato, UI) permanece pendente.
"""

from .models import PatientAuditLog


def log_patient_event(*, patient, actor, action, changes=None):
    user = actor if actor is not None and actor.is_authenticated else None
    return PatientAuditLog.objects.create(
        patient=patient,
        actor=user,
        action=action,
        changes=changes or {},
    )
