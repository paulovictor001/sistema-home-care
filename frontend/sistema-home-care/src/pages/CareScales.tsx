import { useEffect, useState, type FormEvent } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import {
  canScale,
  listScales,
  scalePlans,
  createScale,
  scaleStatusLabels,
  type CareScale,
  type ScalePlanOption,
  type ScaleStatus,
} from "../lib/careScales";

const inputClass =
  "min-h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

const statusClasses: Record<ScaleStatus, string> = {
  DRAFT: "bg-background text-muted",
  ACTIVE: "bg-primary-light text-primary",
  SUSPENDED: "bg-amber-50 text-amber-700",
  CLOSED: "bg-slate-100 text-slate-600",
};

function formatDate(value: string) {
  if (!value) return "—";

  const parts = value.split("-");
  if (parts.length !== 3) return value;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function ScaleStatusBadge({ status }: { status: ScaleStatus }) {
  const active = status === "ACTIVE";

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${statusClasses[status]}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          active ? "bg-primary" : "bg-current"
        }`}
      />
      {scaleStatusLabels[status]}
    </span>
  );
}

function ScaleCard({ scale }: { scale: CareScale }) {
  return (
    <li className="rounded-xl border border-line bg-surface p-4 shadow-sm transition hover:border-primary/30 hover:shadow-md sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light text-sm font-bold text-primary">
            #{scale.id}
          </span>

          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">
              Escala de atendimento
            </p>
            <h3 className="mt-1 truncate text-base font-semibold text-ink">
              {scale.patient_name}
            </h3>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <ScaleStatusBadge status={scale.status} />

          <Link
            to={`/escalas/${scale.id}`}
            aria-label={`Ver detalhes da escala ${scale.id}`}
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-line px-3 text-sm font-semibold text-ink transition hover:border-primary/30 hover:bg-primary-light hover:text-primary"
          >
            Detalhes{" "}
            <span aria-hidden="true" className="ml-1">
              →
            </span>
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 border-t border-line pt-4">
        <div>
          <p className="text-xs font-medium text-muted">Início do período</p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {formatDate(scale.start_date)}
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted">Fim do período</p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {formatDate(scale.end_date)}
          </p>
        </div>
      </div>
    </li>
  );
}

function ScaleSkeleton() {
  return (
    <div className="space-y-3" aria-label="Carregando escalas" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-36 animate-pulse rounded-xl border border-line bg-background"
        />
      ))}
    </div>
  );
}

export function CareScales() {
  const { user } = useAuth();
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const page = Math.max(1, Number(params.get("page")) || 1);

  const [items, setItems] = useState<CareScale[]>([]);
  const [next, setNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState<ScalePlanOption[]>([]);
  const [planId, setPlanId] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [observation, setObservation] = useState("");

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return;

        setLoading(true);
        setError("");

        return listScales(page, patientId ? Number(patientId) : undefined);
      })
      .then((list) => {
        if (!cancelled && list) {
          setItems(list.results);
          setNext(!!list.next);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Falha ao carregar escalas.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [page, patientId, reload]);

  async function openCreate() {
    setBusy(true);
    setError("");

    try {
      const catalog = await scalePlans();

      setPlans(
        catalog.filter(
          (plan) => !patientId || plan.patient === Number(patientId),
        ),
      );

      setPlanId("");
      setStart("");
      setEnd("");
      setObservation("");
      setCreating(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao carregar planos.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    const plan = plans.find((value) => value.id === Number(planId));

    if (!plan) return;

    setBusy(true);
    setError("");

    try {
      const scale = await createScale({
        patient: plan.patient,
        care_plan: plan.id,
        start_date: start,
        end_date: end,
        observation,
      });

      navigate(`/escalas/${scale.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar escala.");
    } finally {
      setBusy(false);
    }
  }

  function changePage(newPage: number) {
    setParams((current) => {
      const updated = new URLSearchParams(current);
      updated.set("page", String(newPage));
      return updated;
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Cabeçalho */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">
            Gestão operacional
          </p>

          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            Escalas
          </h1>

          <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
            Gerencie as escalas de atendimento, consulte períodos e acompanhe a
            situação de cada paciente.
          </p>
        </div>

        {canScale(user, "create") && !creating && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void openCreate()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            {busy ? "Carregando..." : "Nova escala"}
          </button>
        )}
      </section>

      {/* Mensagem de erro */}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm font-semibold text-red-800">
            Não foi possível concluir a operação
          </p>
          <p className="mt-1 text-sm text-red-700">{error}</p>

          {!creating && (
            <button
              type="button"
              onClick={() => setReload((value) => value + 1)}
              className="mt-2 text-sm font-semibold text-red-800 underline underline-offset-2"
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      {/* Formulário de criação */}
      {creating && (
        <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
          <div className="border-b border-line bg-background/60 px-4 py-4 sm:px-5">
            <p className="text-xs font-medium text-primary">Nova escala</p>
            <h2 className="mt-1 text-lg font-semibold text-ink">
              Criar escala · Rascunho
            </h2>
            <p className="mt-1 text-sm text-muted">
              Selecione um plano de cuidados e informe o período de atendimento.
            </p>
          </div>

          <form onSubmit={submit} className="p-4 sm:p-5">
            <fieldset disabled={busy} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">
                  Paciente / Plano
                </span>

                <select
                  className={inputClass}
                  required
                  value={planId}
                  onChange={(event) => {
                    setPlanId(event.target.value);

                    const plan = plans.find(
                      (value) => value.id === Number(event.target.value),
                    );

                    setStart(plan?.start_date || "");
                    setEnd(plan?.end_date || "");
                  }}
                >
                  <option value="">Selecione um plano</option>

                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.patient_name} · Plano #{plan.id}
                    </option>
                  ))}
                </select>
              </label>

              {!plans.length && (
                <p className="rounded-lg bg-background p-3 text-sm text-muted">
                  Nenhum plano disponível. Registre o Plano de Cuidados
                  primeiro.
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Início
                  </span>
                  <input
                    className={inputClass}
                    type="date"
                    required
                    value={start}
                    onChange={(event) => setStart(event.target.value)}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-ink">
                    Fim
                  </span>
                  <input
                    className={inputClass}
                    type="date"
                    required
                    min={start}
                    value={end}
                    onChange={(event) => setEnd(event.target.value)}
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-1.5 block text-sm font-semibold text-ink">
                  Observação geral
                  <span className="ml-1 font-normal text-muted">
                    (opcional)
                  </span>
                </span>

                <textarea
                  className="min-h-24 w-full rounded-lg border border-line bg-white px-3.5 py-3 text-sm text-ink outline-none transition placeholder:text-muted/80 focus:border-primary focus:ring-2 focus:ring-primary/15"
                  value={observation}
                  onChange={(event) => setObservation(event.target.value)}
                  placeholder="Adicione uma observação, se necessário..."
                />
              </label>

              <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="min-h-11 rounded-lg border border-line px-5 text-sm font-semibold text-ink transition hover:bg-background"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={!plans.length || busy}
                  className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Salvando..." : "Criar escala"}
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}

      {/* Listagem */}
      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">
              Escalas cadastradas
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Consulte os registros e acesse os detalhes de cada escala.
            </p>
          </div>

          {!loading && (
            <p className="text-xs font-medium text-muted" aria-live="polite">
              {items.length} registro{items.length === 1 ? "" : "s"} nesta
              página
            </p>
          )}
        </div>

        {loading ? (
          <ScaleSkeleton />
        ) : items.length === 0 && !error ? (
          <div className="rounded-xl border border-dashed border-line bg-surface px-5 py-14 text-center">
            <span
              aria-hidden="true"
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-xl text-primary"
            >
              +
            </span>

            <h3 className="mt-4 font-semibold text-ink">
              Nenhuma escala encontrada
            </h3>

            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">
              Quando houver escalas cadastradas, elas aparecerão nesta área.
            </p>

            {canScale(user, "create") && !creating && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void openCreate()}
                className="mt-5 min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
              >
                Criar nova escala
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((scale) => (
              <ScaleCard key={scale.id} scale={scale} />
            ))}
          </ul>
        )}

        {/* Paginação */}
        <nav
          aria-label="Paginação de escalas"
          className="flex flex-col gap-3 rounded-xl border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <p className="text-xs font-medium text-muted" aria-live="polite">
            Página {page}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => changePage(page - 1)}
              className="min-h-10 flex-1 rounded-lg border border-line px-4 text-sm font-semibold text-ink transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              ← Anterior
            </button>

            <button
              type="button"
              disabled={loading || !next}
              onClick={() => changePage(page + 1)}
              className="min-h-10 flex-1 rounded-lg border border-line px-4 text-sm font-semibold text-ink transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              Próxima →
            </button>
          </div>
        </nav>
      </section>
    </div>
  );
}
