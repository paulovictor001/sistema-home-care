import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { ApiError } from "../lib/api";
import { canCreateAssessment, canViewAssessments, listAssessmentsByPatient, type PatientAssessment } from "../lib/assessments";
import { getPatient, type Patient } from "../lib/patients";
import { BackLink, Button, Card, EmptyState, ErrorState, LoadingState, PageHeader } from "../components/ui";

function dateLabel(value: string | null) {
  if (!value) return "Data não informada";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function AssessmentsHistory() {
  const { patientId } = useParams<{ patientId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [items, setItems] = useState<PatientAssessment[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const pageCount = Math.max(1, Math.ceil(count / 20));

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const [p, list] = await Promise.all([getPatient(Number(patientId)), listAssessmentsByPatient(Number(patientId), page)]);
      setPatient(p);
      setItems(list.results);
      setCount(list.count);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao carregar histórico.");
    } finally {
      setLoading(false);
    }
  }, [patientId, page]);

  useEffect(() => { void load(); }, [load]);

  if (!canViewAssessments(user)) return <div className="mx-auto max-w-4xl"><ErrorState>Você não tem permissão para visualizar avaliações.</ErrorState></div>;

  const goToPage = (next: number) => setSearchParams(next > 1 ? { page: String(next) } : {});

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader eyebrow="Cuidado clínico" title="Histórico de avaliações" description={<>{patient ? <>Paciente: <strong className="font-semibold text-care-ink">{patient.full_name}</strong></> : "Consulte os registros deste paciente."} <span aria-hidden="true">·</span> {count} registro(s). Novas avaliações preservam as anteriores.</>} actions={<>
        {patient && <BackLink to={`/pacientes/${patient.id}`}>Ver paciente</BackLink>}
        {patient && canCreateAssessment(user) && <Link to={`/pacientes/${patient.id}/avaliacoes/nova`} className="inline-flex min-h-10 items-center justify-center rounded-xl bg-care-action px-4 py-2 text-sm font-semibold text-white transition hover:bg-care-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care-action">Nova avaliação</Link>}
      </>} />

      {loading ? <LoadingState label="Carregando avaliações…" /> : error ? <div className="space-y-3"><ErrorState>{error}</ErrorState><Button variant="secondary" onClick={() => void load()}>Tentar novamente</Button></div> : items.length === 0 ? <EmptyState title="Nenhuma avaliação registrada">Quando houver avaliações deste paciente, elas aparecerão aqui.</EmptyState> : <>
        <div className="mb-3 flex items-center justify-between text-sm text-care-muted"><span>Registros mais recentes</span><span>Página {page} de {pageCount}</span></div>
        <ul className="space-y-3">
          {items.map((a: PatientAssessment) => <li key={a.id}><Card className="p-0 transition hover:border-[#B9C9C0]">
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="min-w-0">
                <h2 className="mb-2 font-semibold text-care-forest">Avaliação #{a.id}</h2>
                <p className="text-sm text-care-ink">{dateLabel(a.assessment_date)}{a.assessment_time ? ` · ${a.assessment_time.slice(0, 5)}` : ""}</p>
                <p className="mt-1 truncate text-sm text-care-muted">{a.request_reason || "Motivo não informado"}</p>
                <p className="mt-2 text-xs text-care-muted">{a.care_needs.length} necessidade(s) <span aria-hidden="true">·</span> {a.assessment_resources.length} recurso(s)</p>
              </div>
              <Link to={`/avaliacoes/${a.id}`} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-care-line bg-white px-4 py-2 text-sm font-semibold text-care-action transition hover:bg-care-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care-action">Abrir avaliação <span aria-hidden="true" className="ml-1">→</span></Link>
            </div>
          </Card></li>)}
        </ul>
        <nav aria-label="Paginação do histórico" className="mt-5 flex flex-col gap-3 rounded-2xl border border-care-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-care-muted">Exibindo {items.length} de {count} avaliação(ões)</p>
          <div className="flex items-center gap-2"><Button variant="secondary" disabled={page <= 1} onClick={() => goToPage(page - 1)}>Anterior</Button><span aria-current="page" className="px-2 text-sm font-medium text-care-ink">{page} / {pageCount}</span><Button variant="secondary" disabled={page >= pageCount} onClick={() => goToPage(page + 1)}>Próxima</Button></div>
        </nav>
      </>}
    </div>
  );
}
