import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { ApiError } from "../lib/api";
import { canPlan } from '../lib/carePlans';
import {
  canCreateAssessment,
  canViewAssessments,
} from "../lib/assessments";
import { formatCpf } from "../lib/cpf";
import {
  getPatient,
  inativarPaciente,
  isGerente,
  reativarPaciente,
  type Patient,
} from "../lib/patients";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-ink">{value || "—"}</dd>
    </div>
  );
}

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setPatient(await getPatient(Number(id)));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Falha ao carregar paciente.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  async function handleStatus(action: "inativar" | "reativar") {
    if (!patient) return;
    const confirmar = window.confirm(
      action === "inativar"
        ? `Inativar ${patient.full_name}?`
        : `Reativar ${patient.full_name}?`,
    );
    if (!confirmar) return;
    setActing(true);
    setActionError(null);
    try {
      setPatient(
        action === "inativar"
          ? await inativarPaciente(patient.id)
          : await reativarPaciente(patient.id),
      );
    } catch (err) {
      setActionError(
        err instanceof ApiError ? err.message : "Falha ao alterar status.",
      );
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-ink">Carregando…</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error ?? "Paciente não encontrado."}
        </p>
        <Link to="/pacientes" className="text-sm text-primary underline">
          Voltar para a listagem
        </Link>
      </div>
    );
  }

  const manager = isGerente(user?.groups);
  const active = patient.status === "ACTIVE";
  const address = patient.address;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Prontuário cadastral</p>
          <h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{patient.full_name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-primary-light text-primary" : "bg-background text-muted"}`}><span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${active ? "bg-primary" : "bg-muted"}`} />{active ? "Ativo" : "Inativo"}</span>
            <span>CPF {formatCpf(patient.cpf)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/pacientes"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line px-4 text-sm font-medium text-ink transition hover:bg-background"
          >
            Voltar
          </Link>
          <Link
            to={`/pacientes/${patient.id}/editar`}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line px-4 text-sm font-medium text-primary transition hover:bg-primary-light"
          >
            Editar
          </Link>
        </div>
      </div>

      <section className="mb-4 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-5"><h2 className="text-base font-semibold text-ink">Dados pessoais</h2><p className="mt-1 text-sm text-muted">Identificação e contato do paciente.</p></div>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Nome completo" value={patient.full_name} />
          <Field label="Data de nascimento" value={patient.birth_date} />
          <Field label="CPF" value={formatCpf(patient.cpf)} />
          <Field label="RG" value={patient.rg} />
          <Field label="Idade" value={String(patient.age)} />
          <Field label="Telefone" value={patient.phone} />
          <Field label="Sexo" value={patient.gender} />
          <Field label="Status" value={active ? "Ativo" : "Inativo"} />
        </dl>
      </section>

      <section className="mb-4 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-5"><h2 className="text-base font-semibold text-ink">Informações clínicas e responsáveis</h2><p className="mt-1 text-sm text-muted">Referências atuais do acompanhamento do paciente.</p></div>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
          <Field label="Médico responsável (id)" value={patient.responsible_doctor?.toString() ?? ""} />
          <Field
            label="Equipe responsável"
            value={
              typeof patient.responsible_team === "string"
                ? patient.responsible_team
                : patient.responsible_team
                  ? JSON.stringify(patient.responsible_team)
                  : ""
            }
          />
          <Field
            label="Condição de saúde (id)"
            value={patient.health_condition?.toString() ?? ""}
          />
        </dl>
      </section>

      <section className="mb-4 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-5"><h2 className="text-base font-semibold text-ink">Endereço</h2><p className="mt-1 text-sm text-muted">Localização e referências para atendimento domiciliar.</p></div>
        {address ? (
          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <Field label="CEP" value={address.zip_code} />
            <Field
              label="Estado / Cidade"
              value={`${address.state} / ${address.city}`}
            />
            <Field label="Bairro" value={address.neighborhood} />
            <Field
              label="Rua / Número"
              value={`${address.street}, ${address.number}`}
            />
            <Field label="Complemento" value={address.complement} />
            <Field label="Ponto de referência" value={address.reference_point} />
            <Field label="Região" value={address.region} />
          </dl>
        ) : (
          <p className="text-sm text-ink">Sem endereço cadastrado.</p>
        )}
      </section>

      {canViewAssessments(user) && (
        <section className="mb-4 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-ink">Avaliação inicial</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/pacientes/${patient.id}/avaliacoes`}
              className="inline-flex min-h-10 items-center rounded-lg border border-line px-4 text-sm font-medium text-ink transition hover:bg-background"
            >
              Ver histórico
            </Link>
            {canCreateAssessment(user) && (
              <Link
                to={`/pacientes/${patient.id}/avaliacoes/nova`}
              className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark"
              >
                Nova avaliação
              </Link>
            )}
          </div>
        </section>
      )}

      {canPlan(user, 'view') && <section className="mb-4 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6"><h2 className="mb-4 text-base font-semibold text-ink">Plano de cuidados</h2><Link className="inline-flex min-h-10 items-center rounded-lg border border-line px-4 text-sm font-medium text-ink transition hover:bg-background" to={`/pacientes/${patient.id}/planos-cuidados`}>Ver planos de cuidados</Link></section>}

      {manager && (
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-base font-semibold text-ink">Ações de status</h2>
          {actionError && (
            <p role="alert" className="mb-3 text-sm text-red-600">
              {actionError}
            </p>
          )}
          {active ? (
            <button
              type="button"
              disabled={acting}
              onClick={() => void handleStatus("inativar")}
              className="min-h-11 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-50"
            >
              {acting ? "Inativando…" : "Inativar paciente"}
            </button>
          ) : (
            <button
              type="button"
              disabled={acting}
              onClick={() => void handleStatus("reativar")}
              className="min-h-11 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
            >
              {acting ? "Reativando…" : "Reativar paciente"}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
