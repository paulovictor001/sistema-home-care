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
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm">{value || "—"}</dd>
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
    void load();
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
        <p className="text-sm text-gray-600">Carregando…</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error ?? "Paciente não encontrado."}
        </p>
        <Link to="/pacientes" className="text-sm text-blue-600 underline">
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
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{patient.full_name}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {active ? "Ativo" : "Inativo"} · CPF {formatCpf(patient.cpf)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            to="/pacientes"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            Voltar
          </Link>
          <Link
            to={`/pacientes/${patient.id}/editar`}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            Editar
          </Link>
        </div>
      </div>

      <section className="mb-4 rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-sm font-semibold">Dados pessoais</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nome completo" value={patient.full_name} />
          <Field label="Data de nascimento" value={patient.birth_date} />
          <Field label="CPF" value={formatCpf(patient.cpf)} />
          <Field label="RG" value={patient.rg} />
          <Field label="Idade" value={String(patient.age)} />
          <Field label="Telefone" value={patient.phone} />
          <Field label="Sexo" value={patient.gender} />
          <Field label="Status" value={active ? "Ativo" : "Inativo"} />
          <Field
            label="Médico responsável (id)"
            value={patient.responsible_doctor?.toString() ?? ""}
          />
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

      <section className="mb-4 rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-sm font-semibold">Endereço</h2>
        {address ? (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <p className="text-sm text-gray-600">Sem endereço cadastrado.</p>
        )}
      </section>

      {canViewAssessments(user) && (
        <section className="mb-4 rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-sm font-semibold">Avaliação inicial</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/pacientes/${patient.id}/avaliacoes`}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm"
            >
              Ver histórico
            </Link>
            {canCreateAssessment(user) && (
              <Link
                to={`/pacientes/${patient.id}/avaliacoes/nova`}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                Nova avaliação
              </Link>
            )}
          </div>
        </section>
      )}

      {canPlan(user, 'view') && <section className="mb-4 rounded-lg bg-white p-4 shadow"><h2 className="mb-3 text-sm font-semibold">Plano de cuidados</h2><Link className="rounded border px-3 py-2 text-sm" to={`/pacientes/${patient.id}/planos-cuidados`}>Ver planos de cuidados</Link></section>}

      {manager && (
        <section className="rounded-lg bg-white p-4 shadow">
          <h2 className="mb-3 text-sm font-semibold">Ações de status</h2>
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
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {acting ? "Inativando…" : "Inativar paciente"}
            </button>
          ) : (
            <button
              type="button"
              disabled={acting}
              onClick={() => void handleStatus("reativar")}
              className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {acting ? "Reativando…" : "Reativar paciente"}
            </button>
          )}
        </section>
      )}
    </div>
  );
}
