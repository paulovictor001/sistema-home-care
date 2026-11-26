import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import {
  canScale,
  getScale,
  updateScale,
  scaleStatusLabels,
  scaleAuditActionLabels,
  type CareScale,
} from "../lib/careScales";
import { frequencyLabels } from "../lib/carePlans";
import {
  scalePlans,
  addScaleNeed,
  type ScalePlanOption,
} from "../lib/careScales";
import { ScaleNeedManagement } from "../components/ScaleNeedManagement";
import {
  scaleSubstitutions,
  scaleAudit,
  type ScaleSubstitution,
  type ScaleAudit,
} from "../lib/careScales";
import {
  changeScaleStatus,
  deleteScale,
  type ScaleStatus,
} from "../lib/careScales";

export function CareScaleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [targetStatus, setTargetStatus] = useState<ScaleStatus>("DRAFT");
  const [scale, setScale] = useState<CareScale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [observation, setObservation] = useState("");
  const [available, setAvailable] = useState<ScalePlanOption["needs"] | null>(
    null,
  );
  const [selectedNeed, setSelectedNeed] = useState("");
  const [substitutions, setSubstitutions] = useState<
    ScaleSubstitution[] | null
  >(null);
  const [events, setEvents] = useState<ScaleAudit[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve()
      .then(() => {
        if (cancelled) return;
        setScale(null);
        setLoading(true);
        setError("");
        setEditing(false);
        return getScale(Number(id));
      })
      .then((value) => {
        if (!cancelled && value) setScale(value);
      })
      .catch((err) => {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Falha ao carregar escala.";
          setError(message);
          toast.error(message);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  function changed(value: CareScale) {
    setScale(value);
    setSubstitutions(null);
    setEvents(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!scale) return;

    setBusy(true);
    setError("");

    try {
      changed(
        await updateScale(scale.id, {
          start_date: start,
          end_date: end,
          observation,
        }),
      );
      setEditing(false);
      toast.success("Escala atualizada.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao salvar escala.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function openNeeds() {
    if (!scale) return;

    setBusy(true);
    setError("");

    try {
      const plans = await scalePlans();
      setAvailable(
        plans
          .find((plan) => plan.id === scale.care_plan)
          ?.needs.filter(
            (need) =>
              !scale.items.some(
                (item) => !item.removed_at && item.plan_need === need.id,
              ),
          ) || [],
      );
      setSelectedNeed("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao carregar necessidades.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function attachNeed(event: FormEvent) {
    event.preventDefault();
    if (!scale || !selectedNeed) return;

    setBusy(true);
    setError("");

    try {
      changed(await addScaleNeed(scale.id, Number(selectedNeed)));
      setAvailable(null);
      toast.success("Necessidade adicionada à escala.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao incluir necessidade.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function history() {
    if (!scale) return;

    setBusy(true);
    setError("");

    try {
      const [substitutionList, auditList] = await Promise.all([
        scaleSubstitutions(scale.id),
        scaleAudit(scale.id),
      ]);
      setSubstitutions(substitutionList);
      setEvents(auditList);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao carregar histórico.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function status(event: FormEvent) {
    event.preventDefault();
    if (!scale) return;

    setBusy(true);
    setError("");

    try {
      changed(await changeScaleStatus(scale.id, targetStatus));
      toast.success("Status da escala atualizado.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao alterar status.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !scale ||
      !window.confirm(
        "Excluir esta escala? Ela será retirada da listagem e seus registros serão preservados.",
      )
    )
      return;

    setBusy(true);
    setError("");

    try {
      await deleteScale(scale.id);
      toast.success("Escala excluída.");
      navigate("/escalas");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao excluir escala.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl animate-pulse space-y-4">
        <div className="h-8 w-64 rounded-lg bg-primary-light" />
        <div className="h-32 rounded-2xl bg-surface" />
        <div className="h-48 rounded-2xl bg-surface" />
      </div>
    );
  }

  if (!scale) {
    return (
      <div className="mx-auto max-w-5xl rounded-2xl border border-line bg-surface p-8">
        <p role="alert" className="text-red-700">
          {error || "Escala não encontrada."}
        </p>
        <Link
          to="/escalas"
          className="mt-4 inline-block font-medium text-primary underline"
        >
          Voltar para escalas
        </Link>
      </div>
    );
  }

  const activeItems = scale.items.filter((item) => !item.removed_at);
  const activeProfessionals = activeItems.reduce(
    (total, item) =>
      total + item.assignments.filter((a) => !a.removed_at).length,
    0,
  );

  return (
    <main className="mx-auto max-w-5xl space-y-6 pb-10">
      {/* Cabeçalho */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <Link
            to="/escalas"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary"
          >
            ← Voltar para escalas
          </Link>
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-primary">
              Gerenciamento de atendimento
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              Escala #{scale.id}
            </h1>
            <p className="mt-1 text-sm text-muted">
              Gerencie necessidades, profissionais e informações da escala.
            </p>
          </div>
        </div>

        <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary-light px-4 py-2 text-sm font-semibold text-primary">
          {scaleStatusLabels[scale.status]}
        </span>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Resumo */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm text-muted">Paciente</p>
          <p className="mt-2 text-lg font-semibold text-ink">
            {scale.patient_name}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm text-muted">Plano de cuidado</p>
          <p className="mt-2 text-lg font-semibold text-ink">
            Plano #{scale.care_plan}
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <p className="text-sm text-muted">Profissionais ativos</p>
          <p className="mt-2 text-2xl font-bold text-primary">
            {activeProfessionals}
          </p>
        </div>
      </section>

      {/* Ações */}
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        {canScale(user, "change_status") && (
          <form onSubmit={status} className="flex flex-wrap items-center gap-2">
            <label
              className="text-sm font-medium text-ink"
              htmlFor="scale-status"
            >
              Alterar status
            </label>
            <select
              id="scale-status"
              className="rounded-lg border border-line bg-background px-3 py-2 text-sm"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as ScaleStatus)}
            >
              {Object.entries(scaleStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              disabled={busy}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
            >
              Atualizar status
            </button>
          </form>
        )}

        {canScale(user, "delete") && (
          <button
            disabled={busy}
            onClick={() => void remove()}
            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
          >
            Excluir escala
          </button>
        )}
      </section>

      {/* Dados da escala */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-ink">Dados da escala</h2>
            <p className="text-sm text-muted">
              Período e informações gerais do atendimento.
            </p>
          </div>
          {!editing && canScale(user, "update") && (
            <button
              onClick={() => {
                setStart(scale.start_date);
                setEnd(scale.end_date);
                setObservation(scale.observation);
                setEditing(true);
              }}
              className="rounded-lg border border-primary/30 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-light"
            >
              Editar informações
            </button>
          )}
        </div>

        <div className="p-5">
          {editing ? (
            <form onSubmit={save}>
              <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-ink">
                  Data de início
                  <input
                    className="w-full rounded-lg border border-line bg-background px-3 py-2.5"
                    type="date"
                    required
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-ink">
                  Data de término
                  <input
                    className="w-full rounded-lg border border-line bg-background px-3 py-2.5"
                    type="date"
                    required
                    min={start}
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-ink sm:col-span-2">
                  Observação geral
                  <textarea
                    className="min-h-24 w-full rounded-lg border border-line bg-background px-3 py-2.5"
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Adicione informações relevantes sobre a escala..."
                  />
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
                  >
                    {busy ? "Salvando..." : "Salvar alterações"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-muted hover:bg-background"
                  >
                    Cancelar
                  </button>
                </div>
              </fieldset>
            </form>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="rounded-xl bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Início
                </p>
                <p className="mt-2 text-lg font-semibold text-ink">
                  {scale.start_date}
                </p>
              </div>
              <div className="rounded-xl bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Término
                </p>
                <p className="mt-2 text-lg font-semibold text-ink">
                  {scale.end_date}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm font-semibold text-ink">
                  Observação geral
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  {scale.observation || "Nenhuma observação geral registrada."}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Necessidades */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-ink">
              Necessidades e profissionais
            </h2>
            <p className="mt-1 text-sm text-muted">
              Organize os serviços e os profissionais responsáveis pelo
              atendimento.
            </p>
          </div>
          {canScale(user, "update") && !available && (
            <button
              disabled={busy}
              onClick={() => void openNeeds()}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-50"
            >
              + Adicionar necessidade
            </button>
          )}
        </div>

        {available && (
          <form
            onSubmit={attachNeed}
            className="rounded-2xl border border-primary/20 bg-primary-light p-5"
          >
            <h3 className="font-semibold text-ink">
              Adicionar necessidade do plano
            </h3>
            <div className="mt-3 flex flex-wrap gap-3">
              <select
                className="min-w-56 flex-1 rounded-lg border border-line bg-surface px-3 py-2.5 text-sm"
                required
                value={selectedNeed}
                onChange={(e) => setSelectedNeed(e.target.value)}
              >
                <option value="">Selecione uma necessidade</option>
                {available.map((need) => (
                  <option key={need.id} value={need.id}>
                    {need.care_need__description}
                  </option>
                ))}
              </select>
              <button
                disabled={busy || !available.length}
                type="submit"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
              >
                Incluir
              </button>
              <button
                type="button"
                onClick={() => setAvailable(null)}
                className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-muted"
              >
                Cancelar
              </button>
            </div>
            {!available.length && (
              <p className="mt-3 text-sm text-muted">
                Todas as necessidades vigentes do plano já foram adicionadas a
                esta escala.
              </p>
            )}
          </form>
        )}

        {!activeItems.length ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
            <p className="font-semibold text-ink">
              Nenhuma necessidade adicionada
            </p>
            <p className="mt-2 text-sm text-muted">
              Adicione uma necessidade do plano para começar a organizar os
              atendimentos.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {scale.items.map((item) => (
              <article
                key={item.id}
                className={`overflow-hidden rounded-2xl border border-line bg-surface shadow-sm ${
                  item.removed_at ? "opacity-70" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                      {item.need_type}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-ink">
                      {item.description}
                    </h3>
                    {item.removed_at && (
                      <span className="mt-2 inline-block rounded-full bg-background px-3 py-1 text-xs text-muted">
                        Removida da escala
                      </span>
                    )}
                  </div>
                  {!item.removed_at && (
                    <span className="rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary">
                      Necessidade ativa
                    </span>
                  )}
                </div>

                <div className="grid gap-3 p-5 sm:grid-cols-2">
                  <div className="rounded-xl bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Frequência na escala
                    </p>
                    <p className="mt-2 font-semibold text-ink">
                      {item.frequency_quantity && item.frequency_period
                        ? `${item.frequency_quantity} por ${frequencyLabels[item.frequency_period].toLowerCase()}`
                        : "Não configurada"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                      Referência do plano
                    </p>
                    <p className="mt-2 font-semibold text-ink">
                      {item.planned_quantity && item.planned_period
                        ? `${item.planned_quantity} por ${frequencyLabels[item.planned_period].toLowerCase()}`
                        : "Não configurada"}
                    </p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm font-semibold text-ink">Observação</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                      {item.observation || "Nenhuma observação registrada."}
                    </p>
                    <p className="mt-3 text-sm font-semibold text-ink">
                      Motivo da frequência
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted">
                      {item.frequency_reason || "Não informado."}
                    </p>
                  </div>
                </div>

                <div className="border-t border-line px-5 py-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-semibold text-ink">
                      Profissionais vinculados
                    </h4>
                    <span className="text-xs text-muted">
                      {item.assignments.filter((a) => !a.removed_at).length}{" "}
                      ativo(s)
                    </span>
                  </div>

                  {!item.assignments.some((a) => !a.removed_at) && (
                    <p className="rounded-xl bg-background p-4 text-sm text-muted">
                      Nenhum profissional vigente vinculado a esta necessidade.
                    </p>
                  )}

                  <ul className="space-y-2">
                    {item.assignments
                      .filter((a) => !a.removed_at)
                      .map((assignment) => (
                        <li
                          key={assignment.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line p-3"
                        >
                          <div>
                            <p className="font-medium text-ink">
                              {assignment.full_name}
                            </p>
                            <p className="text-sm text-muted">
                              {assignment.profession_name}
                            </p>
                          </div>
                          <span className="rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary">
                            Ativo
                          </span>
                        </li>
                      ))}
                  </ul>

                  {item.assignments.some((a) => a.removed_at) && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-muted hover:text-primary">
                        Consultar vínculos encerrados (
                        {item.assignments.filter((a) => a.removed_at).length})
                      </summary>
                      <ul className="mt-2 space-y-2">
                        {item.assignments
                          .filter((a) => a.removed_at)
                          .map((assignment) => (
                            <li
                              key={assignment.id}
                              className="rounded-lg border border-line p-3 text-sm text-muted"
                            >
                              {assignment.full_name} ·{" "}
                              {assignment.profession_name} · Vínculo encerrado
                            </li>
                          ))}
                      </ul>
                    </details>
                  )}
                </div>

                {!item.removed_at && canScale(user, "update") && (
                  <div className="border-t border-line bg-background/60 p-5">
                    <ScaleNeedManagement
                      key={`${scale.id}-${item.id}`}
                      scale={scale}
                      item={item}
                      onChange={changed}
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Histórico */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-ink">Histórico da escala</h2>
            <p className="text-sm text-muted">
              Consulte alterações e substituições realizadas.
            </p>
          </div>
          <button
            disabled={busy}
            onClick={() => void history()}
            className="rounded-lg border border-line px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-light disabled:opacity-50"
          >
            Consultar histórico
          </button>
        </div>

        {(substitutions || events) && (
          <div className="space-y-5 border-t border-line p-5">
            {substitutions && (
              <div>
                <h3 className="font-semibold text-ink">
                  Substituições de profissionais
                </h3>
                {!substitutions.length ? (
                  <p className="mt-2 text-sm text-muted">
                    Nenhuma substituição registrada.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {substitutions.map((value) => (
                      <li
                        key={value.id}
                        className="rounded-xl border border-line p-3 text-sm"
                      >
                        <p className="font-medium text-ink">
                          {value.previous_name} → {value.new_name}
                        </p>
                        <p className="mt-1 text-muted">
                          Necessidade #{value.item || "Histórica"} ·{" "}
                          {value.actor_name} ·{" "}
                          {new Date(value.created_at).toLocaleString("pt-BR")}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {events && (
              <div>
                <h3 className="font-semibold text-ink">Auditoria</h3>
                {!events.length ? (
                  <p className="mt-2 text-sm text-muted">
                    Nenhuma alteração registrada.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-3">
                    {events.map((value) => (
                      <li
                        key={value.id}
                        className="rounded-xl border border-line p-4"
                      >
                        <p className="font-semibold text-ink">
                          {scaleAuditActionLabels[value.action] ?? value.action}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {value.actor_name} ·{" "}
                          {new Date(value.created_at).toLocaleString("pt-BR")}
                        </p>
                        <details className="mt-3">
                          <summary className="cursor-pointer text-sm font-medium text-primary">
                            Ver dados anteriores e novos
                          </summary>
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                              <h4 className="mb-2 text-sm font-semibold text-ink">
                                Antes
                              </h4>
                              <pre className="overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background p-3 text-xs">
                                {JSON.stringify(value.previous_data, null, 2) ??
                                  "—"}
                              </pre>
                            </div>
                            <div>
                              <h4 className="mb-2 text-sm font-semibold text-ink">
                                Depois
                              </h4>
                              <pre className="overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background p-3 text-xs">
                                {JSON.stringify(value.new_data, null, 2) ?? "—"}
                              </pre>
                            </div>
                          </div>
                        </details>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
