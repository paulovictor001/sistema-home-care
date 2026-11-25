import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { ApiError } from "../lib/api";
import {
  createAttendance,
  finishVisit,
  getAttendance,
  updateAttendance,
  type Attendance,
} from "../lib/attendance";
import { listScales, type CareScale } from "../lib/careScales";
import {
  canVisit,
  createVisit,
  editVisit,
  getAvailability,
  getVisit,
  listVisits,
  saveAvailability,
  statusLabels,
  transitionVisit,
  type Availability,
  type Visit,
  type VisitStatus,
} from "../lib/visits";

const weekdays = [
  "Segunda-feira",
  "Ter├ºa-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "S├íbado",
  "Domingo",
];
const inputClass = "rounded border border-line p-2";

export function Visits() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<Visit[]>([]);
  const [visit, setVisit] = useState<Visit | null>(null);
  const [scales, setScales] = useState<CareScale[]>([]);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [attendanceSuccess, setAttendanceSuccess] = useState("");
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [careDescription, setCareDescription] = useState("");
  const [attendanceNotes, setAttendanceNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [series, setSeries] = useState(false);
  const [patientFilter, setPatientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scaleId, setScaleId] = useState("");
  const [itemId, setItemId] = useState("");
  const [professionalId, setProfessionalId] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [dates, setDates] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [observation, setObservation] = useState("");
  const [reason, setReason] = useState("");
  const [windows, setWindows] = useState<Availability[]>([]);
  const [showAgenda, setShowAgenda] = useState(false);
  const selectedScale = scales.find((value) => value.id === Number(scaleId));
  const selectedItem = selectedScale?.items.find(
    (value) => value.id === Number(itemId),
  );
  const professionals =
    selectedItem?.assignments.filter((a) => !a.removed_at) ?? [];
  const refreshList = useCallback(
    () =>
      listVisits({ patient: patientFilter, status: statusFilter })
        .then((data) => setItems(data.results))
        .catch((err) => setError(err.message)),
    [patientFilter, statusFilter],
  );
  useEffect(() => {
    if (id)
      void getVisit(Number(id))
        .then((value) => setVisit(value))
        .catch((err) => setError(err.message));
    else if (canVisit(user, "view")) void refreshList();
  }, [id, user, refreshList]);
  useEffect(() => {
    if (
      !id ||
      !canVisit(user, "view") ||
      !user?.permissions.includes("atendimentos.view")
    )
      return;
    setAttendanceLoading(true);
    void getAttendance(Number(id))
      .then((value) => {
        setAttendance(value);
        setCareDescription(value.care_description);
        setAttendanceNotes(value.notes);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setAttendance(null);
          return;
        }
        setError(
          err instanceof Error ? err.message : "Falha ao carregar Atendimento.",
        );
      })
      .finally(() => setAttendanceLoading(false));
  }, [id, user]);
  useEffect(() => {
    if (canVisit(user, "create"))
      void listScales(1)
        .then((data) =>
          setScales(data.results.filter((s) => s.status === "ACTIVE")),
        )
        .catch(() => {});
  }, [user]);
  useEffect(() => {
    if (professionalId)
      void getAvailability(Number(professionalId))
        .then(setWindows)
        .catch(() => setWindows([]));
  }, [professionalId]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await createVisit({
        care_scale: Number(scaleId),
        scale_need: Number(itemId),
        professional: Number(professionalId),
        ...(series
          ? {
              visit_dates: dates
                .split(/[\n,;]+/)
                .map((v) => v.trim())
                .filter(Boolean),
            }
          : { visit_date: visitDate }),
        start_time: start,
        end_time: end,
        observation,
        visit_type: "Atendimento domiciliar",
      });
      if ("created" in result) {
        const failed = result.rejected
          .map((row) => `${row.visit_date}: ${JSON.stringify(row.errors)}`)
          .join("\n");
        if (result.created.length)
          toast.success(`${result.created.length} visita(s) criada(s).`);
        if (failed) toast.error(`Ocorr├¬ncias rejeitadas: ${failed}`);
        setError(
          `${result.created.length} visita(s) criada(s).${failed ? `\nOcorr├¬ncias rejeitadas:\n${failed}` : ""}`,
        );
        if (result.created.length) {
          setCreating(false);
          void refreshList();
        }
      } else {
        toast.success("Visita criada com sucesso.");
        navigate(`/agendamentos/${result.id}`);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao criar visita.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }
  async function action(status: VisitStatus) {
    if (!visit) return;
    const prompts: Partial<Record<VisitStatus, string>> = {
      CONFIRMADA: "Confirma esta visita?",
      CANCELADA: "Confirma o cancelamento desta visita?",
      NAO_REALIZADA: "Confirma que esta visita n├úo foi realizada?",
      EM_ATENDIMENTO: "Iniciar esta visita agora?",
    };
    if (prompts[status] && !window.confirm(prompts[status])) return;
    setBusy(true);
    setError("");
    try {
      const updated = await transitionVisit(visit.id, status, reason);
      setVisit(updated);
      setReason("");
      toast.success("Status da visita atualizado.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao atualizar estado.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }
  async function saveAttendance(event: FormEvent) {
    event.preventDefault();
    if (!visit) return;
    setAttendanceBusy(true);
    setError("");
    setAttendanceSuccess("");
    try {
      const saved = attendance
        ? await updateAttendance(visit.id, {
            care_description: careDescription,
            notes: attendanceNotes,
          })
        : await createAttendance(visit.id, {
            care_description: careDescription,
            notes: attendanceNotes,
          });
      setAttendance(saved);
      setCareDescription(saved.care_description);
      setAttendanceNotes(saved.notes);
      setAttendanceSuccess("Atendimento salvo com sucesso.");
      toast.success("Atendimento salvo com sucesso.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao salvar Atendimento.";
      setError(message);
      toast.error(message);
    } finally {
      setAttendanceBusy(false);
    }
  }
  async function completeVisit() {
    if (!visit) return;
    setAttendanceBusy(true);
    setError("");
    setAttendanceSuccess("");
    try {
      await finishVisit(visit.id);
      setVisit(await getVisit(visit.id));
      setAttendance(await getAttendance(visit.id));
      setAttendanceSuccess("Visita conclu├¡da com sucesso.");
      toast.success("Visita conclu├¡da com sucesso.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao concluir visita.";
      setError(message);
      toast.error(message);
    } finally {
      setAttendanceBusy(false);
    }
  }
  async function openAgenda() {
    if (!professionalId) return;
    try {
      setWindows(await getAvailability(Number(professionalId)));
      setShowAgenda(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Falha ao carregar agenda.",
      );
    }
  }
  async function submitAgenda(event: FormEvent) {
    event.preventDefault();
    try {
      setWindows(await saveAvailability(Number(professionalId), windows));
      setShowAgenda(false);
      setError("");
      toast.success("Agenda semanal salva.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao salvar agenda.";
      setError(message);
      toast.error(message);
    }
  }
  if (id)
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <Link className="text-primary underline" to="/agendamentos">
          ÔåÉ Agendamentos
        </Link>
        {error && (
          <p role="alert" className="whitespace-pre-wrap text-red-700">
            {error}
          </p>
        )}
        {!visit ? (
          <p>Carregando visitaÔÇª</p>
        ) : (
          <section className="space-y-4 rounded bg-surface p-5 shadow">
            <div>
              <h2 className="text-xl font-semibold">
                Visita #{visit.id} ┬À {visit.patient_name}
              </h2>
              <p>
                {visit.visit_date} ┬À {visit.start_time}ÔÇô{visit.end_time} ┬À{" "}
                {statusLabels[visit.status]}
              </p>
              <p>
                {visit.professional_name} ┬À Escala #{visit.care_scale} ┬À{" "}
                {visit.plan_need_description}
              </p>
            </div>
            <div className="grid gap-2 rounded border border-line p-3 sm:grid-cols-2">
              <p>
                Confirmada em:{" "}
                {visit.confirmed_at
                  ? new Date(visit.confirmed_at).toLocaleString("pt-BR")
                  : "Ainda n├úo confirmada"}
              </p>
              <p>
                Iniciada em:{" "}
                {visit.started_at
                  ? `${new Date(visit.started_at).toLocaleString("pt-BR")} ┬À ${visit.professional_name}`
                  : "Ainda n├úo iniciada"}
              </p>
              <p>
                Conclu├¡da em:{" "}
                {visit.finished_at
                  ? `${new Date(visit.finished_at).toLocaleString("pt-BR")} ┬À ${visit.professional_name}`
                  : "Ainda n├úo conclu├¡da"}
              </p>
              {visit.status === "CANCELADA" && (
                <p>Motivo do cancelamento: {visit.cancellation_reason}</p>
              )}
              {visit.status === "NAO_REALIZADA" && (
                <p>Justificativa: {visit.not_realized_reason}</p>
              )}
            </div>
            <div>
              <h3 className="font-semibold">Endere├ºo registrado</h3>
              <p>
                {visit.address.street}, {visit.address.number} ┬À{" "}
                {visit.address.neighborhood}, {visit.address.city} -{" "}
                {visit.address.state}, {visit.address.zip_code}
              </p>
              {visit.address.complement && (
                <p>Complemento: {visit.address.complement}</p>
              )}
              {visit.address.reference_point && (
                <p>Refer├¬ncia: {visit.address.reference_point}</p>
              )}
            </div>
            <p>{visit.observation || "Sem observa├º├Áes."}</p>
            {canVisit(user, "confirm") && visit.status === "AGENDADA" && (
              <button
                disabled={busy}
                className="rounded border p-2"
                onClick={() => void action("CONFIRMADA")}
              >
                Confirmar
              </button>
            )}
            {canVisit(user, "start") && visit.status === "CONFIRMADA" && (
              <button
                disabled={busy}
                className="rounded border p-2"
                onClick={() => void action("EM_ATENDIMENTO")}
              >
                Iniciar atendimento
              </button>
            )}
            {["AGENDADA", "CONFIRMADA"].includes(visit.status) && (
              <div className="space-y-2 rounded border border-line p-3">
                <label className="block">
                  Motivo{" "}
                  <textarea
                    required
                    className="mt-1 block w-full rounded border p-2"
                    rows={2}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {canVisit(user, "cancel") && (
                    <button
                      disabled={busy || !reason.trim()}
                      className="rounded border p-2"
                      onClick={() => void action("CANCELADA")}
                    >
                      Cancelar visita
                    </button>
                  )}
                  {canVisit(user, "not_realized") && (
                    <button
                      disabled={busy || !reason.trim()}
                      className="rounded border p-2"
                      onClick={() => void action("NAO_REALIZADA")}
                    >
                      Marcar n├úo realizada
                    </button>
                  )}
                </div>
              </div>
            )}
            {canVisit(user, "update") && visit.status === "AGENDADA" && (
              <EditVisit visit={visit} onSaved={setVisit} onError={setError} />
            )}
            {canVisit(user, "view") &&
              user?.permissions.some((permission) =>
                [
                  "atendimentos.view",
                  "atendimentos.create",
                  "atendimentos.update",
                  "visitas.finish",
                ].includes(permission),
              ) && (
                <section className="space-y-3 rounded border border-line p-4">
                  <h3 className="text-lg font-semibold">Atendimento</h3>
                  {attendanceSuccess && (
                    <p role="status" className="text-green-700">
                      {attendanceSuccess}
                    </p>
                  )}
                  {attendanceLoading ? (
                    <p>Carregando AtendimentoÔÇª</p>
                  ) : attendance ? (
                    <>
                      <p>
                        ├Ültima atualiza├º├úo:{" "}
                        {new Date(attendance.updated_at).toLocaleString(
                          "pt-BR",
                        )}
                      </p>
                      {visit.status === "EM_ATENDIMENTO" &&
                      user?.permissions.includes("atendimentos.update") ? (
                        <form onSubmit={saveAttendance} className="space-y-3">
                          <label className="block">
                            Cuidados e procedimentos realizados *
                            <textarea
                              required
                              minLength={1}
                              className="mt-1 block w-full rounded border p-2"
                              rows={4}
                              value={careDescription}
                              onChange={(e) =>
                                setCareDescription(e.target.value)
                              }
                            />
                          </label>
                          <label className="block">
                            Observa├º├Áes
                            <textarea
                              className="mt-1 block w-full rounded border p-2"
                              rows={3}
                              value={attendanceNotes}
                              onChange={(e) =>
                                setAttendanceNotes(e.target.value)
                              }
                            />
                          </label>
                          <button
                            disabled={attendanceBusy || !careDescription.trim()}
                            className="rounded bg-primary px-3 py-2 text-white"
                          >
                            {attendanceBusy ? "SalvandoÔÇª" : "Salvar altera├º├Áes"}
                          </button>
                        </form>
                      ) : (
                        <>
                          <h4 className="font-medium">Cuidados registrados</h4>
                          <p className="whitespace-pre-wrap">
                            {attendance.care_description}
                          </p>
                          <h4 className="font-medium">Observa├º├Áes</h4>
                          <p className="whitespace-pre-wrap">
                            {attendance.notes || "Sem observa├º├Áes."}
                          </p>
                        </>
                      )}
                      {attendance.history.length > 0 && (
                        <div>
                          <h4 className="font-medium">
                            Hist├│rico do Atendimento
                          </h4>
                          <ul className="space-y-1">
                            {attendance.history.map((event) => (
                              <li key={event.id} className="text-sm">
                                {new Date(event.changed_at).toLocaleString(
                                  "pt-BR",
                                )}{" "}
                                ┬À {event.actor_name} ┬À {event.event_type}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {visit.status === "EM_ATENDIMENTO" &&
                        canVisit(user, "finish") && (
                          <button
                            disabled={attendanceBusy}
                            className="rounded bg-primary px-3 py-2 text-white"
                            onClick={() => void completeVisit()}
                          >
                            {attendanceBusy ? "ConcluindoÔÇª" : "Concluir visita"}
                          </button>
                        )}
                    </>
                  ) : visit.status === "EM_ATENDIMENTO" &&
                    user?.permissions.includes("atendimentos.create") ? (
                    <form onSubmit={saveAttendance} className="space-y-3">
                      <label className="block">
                        Cuidados e procedimentos realizados *
                        <textarea
                          required
                          minLength={1}
                          className="mt-1 block w-full rounded border p-2"
                          rows={4}
                          value={careDescription}
                          onChange={(e) => setCareDescription(e.target.value)}
                        />
                      </label>
                      <label className="block">
                        Observa├º├Áes
                        <textarea
                          className="mt-1 block w-full rounded border p-2"
                          rows={3}
                          value={attendanceNotes}
                          onChange={(e) => setAttendanceNotes(e.target.value)}
                        />
                      </label>
                      <button
                        disabled={attendanceBusy || !careDescription.trim()}
                        className="rounded bg-primary px-3 py-2 text-white"
                      >
                        {attendanceBusy ? "SalvandoÔÇª" : "Registrar Atendimento"}
                      </button>
                    </form>
                  ) : (
                    <p>Nenhum Atendimento registrado.</p>
                  )}
                </section>
              )}
            <div>
              <h3 className="font-semibold">Hist├│rico da visita</h3>
              {visit.history.length ? (
                <ul className="space-y-1">
                  {visit.history.map((event) => (
                    <li key={event.id} className="text-sm">
                      {new Date(event.changed_at).toLocaleString("pt-BR")} ┬À{" "}
                      {event.actor_name} ┬À {event.event_type}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhum evento registrado.</p>
              )}
            </div>
          </section>
        )}
      </div>
    );
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Agendamentos</h2>
        {canVisit(user, "create") && (
          <button
            className="rounded bg-primary px-3 py-2 text-white"
            onClick={() => setCreating((v) => !v)}
          >
            {creating ? "Fechar formul├írio" : "Nova visita"}
          </button>
        )}
      </div>
      {error && (
        <p role="alert" className="whitespace-pre-wrap text-red-700">
          {error}
        </p>
      )}

      {creating && (
        <form
          onSubmit={submit}
          className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm"
        >
          <div className="border-b border-line px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M16 3v4M8 3v4M3 11h18" />
                  <path d="M12 15v4M10 17h4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-ink">
                  Novo agendamento
                </h3>
                <p className="text-sm text-muted">
                  Preencha os dados para programar uma visita domiciliar.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <section className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-ink">
                  Informa├º├Áes do atendimento
                </h4>
                <p className="mt-1 text-sm text-muted">
                  Selecione a escala, a necessidade e o profissional
                  respons├ível.
                </p>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-background p-4">
                <input
                  type="checkbox"
                  checked={series}
                  onChange={(e) => setSeries(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">
                    Agendamento recorrente
                  </span>
                  <span className="block text-xs text-muted">
                    Cadastrar v├írias visitas informando as datas manualmente.
                  </span>
                </span>
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-ink">
                    Escala ativa *
                  </span>
                  <select
                    className={`${inputClass} w-full bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15`}
                    required
                    value={scaleId}
                    onChange={(e) => {
                      setScaleId(e.target.value);
                      setItemId("");
                      setProfessionalId("");
                    }}
                  >
                    <option value="">Selecione uma escala</option>
                    {scales.map((s) => (
                      <option value={s.id} key={s.id}>
                        #{s.id} ┬À {s.patient_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-ink">
                    Necessidade da escala *
                  </span>
                  <select
                    className={`${inputClass} w-full bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15`}
                    required
                    value={itemId}
                    onChange={(e) => {
                      setItemId(e.target.value);
                      setProfessionalId("");
                    }}
                  >
                    <option value="">Selecione uma necessidade</option>
                    {selectedScale?.items
                      .filter((i) => !i.removed_at)
                      .map((i) => (
                        <option value={i.id} key={i.id}>
                          {i.description} ┬À frequ├¬ncia {i.frequency_quantity} /{" "}
                          {i.frequency_period === "WEEK" ? "semana" : "m├¬s"}
                        </option>
                      ))}
                  </select>
                </label>

                <label className="block space-y-1.5 md:col-span-2">
                  <span className="text-sm font-medium text-ink">
                    Profissional respons├ível *
                  </span>
                  <select
                    className={`${inputClass} w-full bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15`}
                    required
                    value={professionalId}
                    onChange={(e) => setProfessionalId(e.target.value)}
                  >
                    <option value="">Selecione um profissional</option>
                    {professionals.map((p) => (
                      <option value={p.professional} key={p.id}>
                        {p.full_name} ┬À {p.profession_name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {canVisit(user, "update") && professionalId && (
                <button
                  type="button"
                  className="rounded-xl border border-primary/30 px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/5"
                  onClick={() => void openAgenda()}
                >
                  Configurar agenda semanal
                </button>
              )}

              {professionals.length > 0 && professionalId && (
                <div className="rounded-xl bg-background p-3 text-sm text-muted">
                  {windows.length
                    ? "Agenda semanal configurada; hor├írios ser├úo validados ao salvar."
                    : "Configure a agenda semanal do profissional antes de agendar. Sem janelas configuradas, ele ├® considerado indispon├¡vel."}
                </div>
              )}
            </section>

            <div className="border-t border-line" />

            <section className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-ink">
                  Data e hor├írio
                </h4>
                <p className="mt-1 text-sm text-muted">
                  Defina quando a visita dever├í acontecer.
                </p>
              </div>

              {series ? (
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-ink">
                    Datas das visitas *
                  </span>
                  <textarea
                    required
                    className={`${inputClass} w-full bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15`}
                    rows={4}
                    placeholder={"2026-12-01\n2026-12-08\n2026-12-15"}
                    value={dates}
                    onChange={(e) => setDates(e.target.value)}
                  />
                  <span className="text-xs text-muted">
                    Informe uma data por linha ou separe as datas por v├¡rgula.
                  </span>
                </label>
              ) : (
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-ink">
                    Data da visita *
                  </span>
                  <input
                    className={`${inputClass} w-full bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15`}
                    type="date"
                    required
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                  />
                </label>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-ink">
                    Hor├írio de in├¡cio *
                  </span>
                  <input
                    className={`${inputClass} w-full bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15`}
                    type="time"
                    required
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                  />
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium text-ink">
                    Hor├írio de t├®rmino *
                  </span>
                  <input
                    className={`${inputClass} w-full bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15`}
                    type="time"
                    required
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                  />
                </label>
              </div>
            </section>

            <div className="border-t border-line" />

            <section className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-ink">
                  Observa├º├Áes adicionais
                </h4>
                <p className="mt-1 text-sm text-muted">
                  Informa├º├Áes importantes sobre a visita.
                </p>
              </div>

              <textarea
                className={`${inputClass} w-full bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15`}
                rows={3}
                placeholder="Adicione observa├º├Áes sobre o agendamento..."
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
              />
            </section>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-line bg-background px-6 py-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => setCreating(false)}
              className="rounded-xl border border-line px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-surface"
            >
              Fechar
            </button>
            <button
              disabled={busy}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "SalvandoÔÇª" : "Salvar agendamento"}
            </button>
          </div>
        </form>
      )}
      {showAgenda && (
        <form
          onSubmit={submitAgenda}
          className="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-sm"
        >
          <div>
            <h3 className="font-semibold text-heading">Agenda semanal</h3>
            <p className="text-sm text-muted">
              Configure os dias e hor├írios dispon├¡veis do profissional.
            </p>
          </div>

          {windows.map((window, index) => (
            <div
              key={`${window.id ?? "new"}-${index}`}
              className="flex flex-wrap items-center gap-2"
            >
              <select
                aria-label="Dia da semana"
                className={inputClass}
                value={window.weekday}
                onChange={(e) =>
                  setWindows((old) =>
                    old.map((v, i) =>
                      i === index
                        ? { ...v, weekday: Number(e.target.value) }
                        : v,
                    ),
                  )
                }
              >
                {weekdays.map((day, key) => (
                  <option value={key} key={day}>
                    {day}
                  </option>
                ))}
              </select>

              <input
                className={inputClass}
                type="time"
                value={window.start_time.slice(0, 5)}
                onChange={(e) =>
                  setWindows((old) =>
                    old.map((v, i) =>
                      i === index ? { ...v, start_time: e.target.value } : v,
                    ),
                  )
                }
              />

              <span className="text-sm text-muted">at├®</span>

              <input
                className={inputClass}
                type="time"
                value={window.end_time.slice(0, 5)}
                onChange={(e) =>
                  setWindows((old) =>
                    old.map((v, i) =>
                      i === index ? { ...v, end_time: e.target.value } : v,
                    ),
                  )
                }
              />

              <button
                type="button"
                className="rounded-lg border border-line px-3 py-2 text-sm"
                onClick={() =>
                  setWindows((old) => old.filter((_, i) => i !== index))
                }
              >
                Remover
              </button>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-line px-3 py-2 text-sm"
              onClick={() =>
                setWindows((old) => [
                  ...old,
                  { weekday: 0, start_time: "08:00", end_time: "17:00" },
                ])
              }
            >
              Adicionar hor├írio
            </button>

            <button className="rounded-lg bg-primary px-4 py-2 text-sm text-white">
              Salvar agenda
            </button>
          </div>
        </form>
      )}
      <div className="flex flex-wrap gap-3">
        <input
          className={inputClass}
          placeholder="Filtrar por ID do paciente"
          value={patientFilter}
          onChange={(e) => setPatientFilter(e.target.value)}
        />

        <select
          className={inputClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos os estados</option>
          {Object.entries(statusLabels).map(([key, value]) => (
            <option key={key} value={key}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <Link
              key={item.id}
              to={`/agendamentos/${item.id}`}
              className="block rounded-xl border border-line bg-surface p-4 shadow-sm transition hover:border-primary"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-heading">
                  {item.visit_date} ┬À {item.start_time}ÔÇô{item.end_time}
                </strong>
                <span className="text-sm text-muted">
                  {statusLabels[item.status]}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted">
                {item.patient_name} ┬À {item.professional_name}
              </p>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <span className="text-2xl">Ôûª</span>
            </div>
            <h3 className="font-semibold text-heading">
              Nenhum agendamento encontrado
            </h3>
            <p className="mt-1 text-sm text-muted">
              N├úo h├í agendamentos correspondentes aos filtros selecionados.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EditVisit({
  visit,
  onSaved,
  onError,
}: {
  visit: Visit;
  onSaved: (value: Visit) => void;
  onError: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(visit.visit_date);
  const [start, setStart] = useState(visit.start_time);
  const [end, setEnd] = useState(visit.end_time);
  const [observation, setObservation] = useState(visit.observation);

  async function save(event: FormEvent) {
    event.preventDefault();
    try {
      onSaved(
        await editVisit(visit.id, {
          visit_date: date,
          start_time: start,
          end_time: end,
          observation,
        }),
      );
      setEditing(false);
      toast.success("Visita atualizada.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha ao editar.";
      onError(message);
      toast.error(message);
    }
  }

  return editing ? (
    <form onSubmit={save} className="flex flex-wrap items-center gap-2">
      <label>
        Data
        <input
          className={inputClass}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </label>
      <label>
        In├¡cio
        <input
          className={inputClass}
          type="time"
          value={start.slice(0, 5)}
          onChange={(e) => setStart(e.target.value)}
        />
      </label>
      <label>
        Fim
        <input
          className={inputClass}
          type="time"
          value={end.slice(0, 5)}
          onChange={(e) => setEnd(e.target.value)}
        />
      </label>
      <label>
        Observa├º├úo
        <input
          className={inputClass}
          value={observation}
          onChange={(e) => setObservation(e.target.value)}
        />
      </label>
      <button className="rounded border p-2">Salvar edi├º├úo</button>
      <button
        type="button"
        className="rounded border p-2"
        onClick={() => setEditing(false)}
      >
        Fechar
      </button>
    </form>
  ) : (
    <button className="rounded border p-2" onClick={() => setEditing(true)}>
      Editar visita
    </button>
  );
}
