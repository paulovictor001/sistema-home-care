import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { ApiError } from "../lib/api";
import {
  canCreateAssessment,
  canViewAssessments,
  listAssessmentsByPatient,
  type PatientAssessment,
} from "../lib/assessments";
import { getPatient, type Patient } from "../lib/patients";

export function AssessmentsHistory() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [items, setItems] = useState<PatientAssessment[]>([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Number(searchParams.get("page") ?? "1") || 1;

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const [p, list] = await Promise.all([
        getPatient(Number(patientId)),
        listAssessmentsByPatient(Number(patientId), page),
      ]);
      setPatient(p);
      setItems(list.results);
      setCount(list.count);
      setHasNext(!!list.next);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Falha ao carregar histórico.",
      );
    } finally {
      setLoading(false);
    }
  }, [patientId, page]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  if (!canViewAssessments(user)) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p role="alert" className="text-sm text-red-600">
          Você não tem permissão para visualizar avaliações.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Histórico de avaliações</h1>
          <p className="mt-1 text-sm text-ink">
            {patient ? patient.full_name : "Carregando…"} · {count} registro(s).
            Novas avaliações não sobrescrevem as anteriores.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {patient && (
            <Link
              to={`/pacientes/${patient.id}`}
              className="rounded border border-line px-3 py-1.5 text-sm"
            >
              Paciente
            </Link>
          )}
          {patient && canCreateAssessment(user) && (
            <Link
              to={`/pacientes/${patient.id}/avaliacoes/nova`}
              className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-white"
            >
              Nova avaliação
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-ink">Carregando…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-ink">Nenhuma avaliação registrada.</p>
      ) : (
        <>
          <ul className="space-y-2">
            {items.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-surface px-4 py-3 shadow"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    Avaliação #{a.id} · {a.assessment_date ?? "—"} ·{" "}
                    {(a.assessment_time ?? "").slice(0, 5)}
                  </p>
                  <p className="truncate text-xs text-ink">
                    {a.professional_name || (a.professional ? `Profissional #${a.professional}` : "Sem profissional responsável")} · {a.request_reason || "—"} · {a.care_needs.length}{" "}
                    necessidade(s) · {a.assessment_resources.length} recurso(s)
                  </p>
                </div>
                <Link
                  to={`/avaliacoes/${a.id}`}
                  className="shrink-0 rounded border border-line px-3 py-1.5 text-sm"
                >
                  Abrir
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() =>
                setSearchParams(page > 2 ? { page: String(page - 1) } : {})
              }
              className="rounded border border-line px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-ink">Página {page}</span>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => setSearchParams({ page: String(page + 1) })}
              className="rounded border border-line px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  );
}
