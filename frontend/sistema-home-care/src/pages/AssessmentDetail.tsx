import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { ApiError } from "../lib/api";
import {
  canEditAssessment,
  getAssessment,
  NEED_PRIORITIES,
  type PatientAssessment,
} from "../lib/assessments";
import { getPatient } from "../lib/patients";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm whitespace-pre-wrap">{value || "—"}</dd>
    </div>
  );
}

export function AssessmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<PatientAssessment | null>(null);
  const [patientName, setPatientName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const a = await getAssessment(Number(id));
      setAssessment(a);
      try {
        const p = await getPatient(a.patient);
        setPatientName(p.full_name);
      } catch {
        setPatientName(`Paciente #${a.patient}`);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Falha ao carregar avaliação.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-gray-600">Carregando…</p>
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error ?? "Avaliação não encontrada."}
        </p>
        <Link to="/pacientes" className="text-sm text-blue-600 underline">
          Voltar para pacientes
        </Link>
      </div>
    );
  }

  const editable = canEditAssessment(user);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Avaliação #{assessment.id}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {patientName} · {assessment.assessment_date ?? "—"} ·{" "}
            {(assessment.assessment_time ?? "").slice(0, 5)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            to={`/pacientes/${assessment.patient}/avaliacoes`}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            Histórico
          </Link>
          {editable && (
            <Link
              to={`/avaliacoes/${assessment.id}/editar`}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm"
            >
              Editar
            </Link>
          )}
        </div>
      </div>

      <section className="mb-4 rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-sm font-semibold">Dados da avaliação</h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Tipo" value={assessment.assessment_type} />
          <Field label="Origem da solicitação" value={assessment.request_origin} />
          <Field label="Motivo da solicitação" value={assessment.request_reason} />
          <Field label="Queixa principal" value={assessment.chief_complaint} />
          <Field
            label="Descrição inicial da necessidade"
            value={assessment.initial_need_description}
          />
          <Field label="Início da necessidade" value={assessment.need_start_date ?? ""} />
          <Field label="Anamnese" value={assessment.anamnesis} />
          <Field label="HDA" value={assessment.hda} />
          <Field label="Situação atual" value={assessment.current_condition} />
          <Field label="Observações" value={assessment.observations} />
          <Field
            label="Observações administrativas"
            value={assessment.administrative_observations}
          />
          <Field
            label="Informações relevantes"
            value={assessment.relevant_information}
          />
          <Field label="Conclusão" value={assessment.conclusion} />
          <Field label="Recomendação / Conduta" value={assessment.recommendation} />
        </dl>
      </section>

      <section className="mb-4 rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-sm font-semibold">
          Necessidades ({assessment.care_needs.length})
        </h2>
        {assessment.care_needs.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhuma necessidade registrada.</p>
        ) : (
          <ul className="space-y-2">
            {assessment.care_needs.map((n) => (
              <li key={n.id} className="rounded border px-3 py-2 text-sm">
                <span className="font-medium">
                  {n.need_type_name ?? `Tipo #${n.need_type}`}
                </span>{" "}
                · {n.description} ·{" "}
                {NEED_PRIORITIES.find((p) => p.value === n.priority)?.label ??
                  n.priority}{" "}
                · {n.status === "IDENTIFIED" ? "Identificada" : n.status}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg bg-white p-4 shadow">
        <h2 className="mb-3 text-sm font-semibold">
          Recursos ({assessment.assessment_resources.length})
        </h2>
        {assessment.assessment_resources.length === 0 ? (
          <p className="text-sm text-gray-600">Nenhum recurso associado.</p>
        ) : (
          <ul className="space-y-2">
            {assessment.assessment_resources.map((r) => (
              <li key={r.id} className="rounded border px-3 py-2 text-sm">
                <span className="font-medium">
                  {r.resource_name ?? `Recurso #${r.resource}`}
                </span>{" "}
                · qtd {r.quantity}
                {r.observation ? ` · ${r.observation}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
