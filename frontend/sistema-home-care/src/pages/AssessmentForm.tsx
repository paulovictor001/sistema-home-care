import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { ApiError } from "../lib/api";
import {
  addNeed,
  addResource,
  canCreateAssessment,
  canEditAssessment,
  canCreateNeed,
  canAddAssessmentResource,
  canChangeProfessional,
  canViewAssessments,
  clinicoDisplayName,
  createAssessment,
  getAssessment,
  isClinical,
  listClinicos,
  listNeedTypes,
  listResources,
  NEED_PRIORITIES,
  REQUEST_ORIGINS,
  updateAssessment,
  type Clinico,
  type NeedType,
  type PatientAssessment,
  type ResourceCatalog,
} from "../lib/assessments";
import {
  getPatient,
  isGerente,
  parseFieldErrors,
  type Patient,
} from "../lib/patients";
import { BackLink, controlClass, ErrorState, LoadingState, PageHeader } from "../components/ui";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string[];
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-care-ink">{label}</span>
      {children}
      {error?.map((msg) => (
        <span key={msg} role="alert" className="mt-0.5 block text-xs text-red-700">
          {msg}
        </span>
      ))}
    </label>
  );
}

const inputClass = controlClass;
const textClass = `${inputClass} min-h-24 resize-y`;

interface MainForm {
  professional: string;
  assessment_date: string;
  assessment_time: string;
  request_origin: string;
  administrative_observations: string;
  request_reason: string;
  chief_complaint: string;
  initial_need_description: string;
  need_start_date: string;
  anamnesis: string;
  hda: string;
  current_condition: string;
  observations: string;
  relevant_information: string;
  conclusion: string;
  recommendation: string;
}

const EMPTY_MAIN: MainForm = {
  professional: "",
  assessment_date: "",
  assessment_time: "",
  request_origin: "",
  administrative_observations: "",
  request_reason: "",
  chief_complaint: "",
  initial_need_description: "",
  need_start_date: "",
  anamnesis: "",
  hda: "",
  current_condition: "",
  observations: "",
  relevant_information: "",
  conclusion: "",
  recommendation: "",
};

function toMain(a: PatientAssessment): MainForm {
  return {
    professional: a.professional?.toString() ?? "",
    assessment_date: a.assessment_date ?? "",
    assessment_time: (a.assessment_time ?? "").slice(0, 5),
    request_origin: a.request_origin ?? "",
    administrative_observations: a.administrative_observations ?? "",
    request_reason: a.request_reason ?? "",
    chief_complaint: a.chief_complaint ?? "",
    initial_need_description: a.initial_need_description ?? "",
    need_start_date: a.need_start_date ?? "",
    anamnesis: a.anamnesis ?? "",
    hda: a.hda ?? "",
    current_condition: a.current_condition ?? "",
    observations: a.observations ?? "",
    relevant_information: a.relevant_information ?? "",
    conclusion: a.conclusion ?? "",
    recommendation: a.recommendation ?? "",
  };
}

export function AssessmentForm({ mode }: { mode: "create" | "edit" }) {
  const { patientId, id } = useParams<{ patientId: string; id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const manager = isGerente(user?.groups);
  const clinical = isClinical(user?.groups);
  const canAddNeeds = canCreateNeed(user);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [assessment, setAssessment] = useState<PatientAssessment | null>(null);
  const [form, setForm] = useState<MainForm>(EMPTY_MAIN);
  const [clinicos, setClinicos] = useState<Clinico[]>([]);
  const [needTypes, setNeedTypes] = useState<NeedType[]>([]);
  const [resources, setResources] = useState<ResourceCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "backward">("forward");

  // Sub-form necessidade (TA-61 + TA-64).
  const [needType, setNeedType] = useState("");
  const [needDesc, setNeedDesc] = useState("");
  const [needPriority, setNeedPriority] = useState("MEDIUM");
  const [addingNeed, setAddingNeed] = useState(false);
  const [needError, setNeedError] = useState<string | null>(null);
  const [needCatalogError, setNeedCatalogError] = useState(false);
  // Sub-form recurso (TA-63).
  const [resourceId, setResourceId] = useState("");
  const [resourceQty, setResourceQty] = useState("1");
  const [resourceObs, setResourceObs] = useState("");
  const [addingResource, setAddingResource] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Select de responsável: equipe clínica (todos os perfis que
        // visualizam avaliação têm `avaliacoes.view`).
        if (canViewAssessments(user)) {
          try {
            setClinicos(await listClinicos());
          } catch {
            setClinicos([]);
          }
        }
        // Catálogos aparecem vazios (não bloqueiam o formulário) se 403.
        try {
          setNeedTypes(await listNeedTypes());
        } catch {
          setNeedTypes([]);
          setNeedCatalogError(true);
        }
        try {
          setResources(await listResources());
        } catch {
          setResources([]);
        }
        if (mode === "create" && patientId) {
          const p = await getPatient(Number(patientId));
          setPatient(p);
          // Profissional padrão: o próprio usuário clínico.
          if (user?.id && (clinical || manager)) {
            setForm((prev) => ({ ...prev, professional: String(user.id) }));
          }
        } else if (mode === "edit" && id) {
          const a = await getAssessment(Number(id));
          setAssessment(a);
          setForm(toMain(a));
          const p = await getPatient(a.patient);
          setPatient(p);
        }
      } catch (err) {
        setLoadError(
          err instanceof ApiError ? err.message : "Falha ao carregar dados.",
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, patientId, id]);

  function set<K extends keyof MainForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: [] }));
  }

  const steps = [
    { title: "Dados da avaliação", description: "Identifique o atendimento e o profissional responsável." },
    { title: "Solicitação", description: "Registre o motivo, a queixa e o contexto inicial." },
    { title: "Avaliação clínica", description: "Descreva o histórico e a situação clínica atual." },
    { title: "Conclusão", description: "Registre a conclusão e a conduta recomendada." },
    { title: "Necessidades e recursos", description: "Administre os registros vinculados à avaliação." },
  ];

  function moveToStep(next: number) {
    setDirection(next > step ? "forward" : "backward");
    setStep(next);
  }

  function validateCurrentStep() {
    const requiredByStep: Record<number, (keyof MainForm)[]> = {
      1: ["professional", "assessment_date", "assessment_time"],
      2: ["request_reason", "chief_complaint"],
    };
    const missing = (requiredByStep[step] ?? []).filter((key) => !form[key].trim());
    if (missing.length) {
      setFieldErrors((prev) => ({
        ...prev,
        ...Object.fromEntries(missing.map((key) => [key, ["Este campo é obrigatório."]])),
      }));
      return false;
    }
    return true;
  }

  // Gerente no edit: só troca o profissional (backend dá 403 no resto).
  const readOnlyMain = mode === "edit" && manager;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setActionError(null);
    setSuccessMessage(null);
    setSubmitting(true);
    try {
      if (mode === "create" && !assessment) {
        if (!patient) throw new Error("Paciente não carregado.");
        const created = await createAssessment({
          patient: patient.id,
          professional: Number(form.professional),
          assessment_date: form.assessment_date,
          assessment_time:
            form.assessment_time.length === 5
              ? `${form.assessment_time}:00`
              : form.assessment_time,
          request_reason: form.request_reason.trim(),
          chief_complaint: form.chief_complaint.trim(),
          request_origin: form.request_origin || undefined,
          administrative_observations:
            form.administrative_observations.trim() || undefined,
          initial_need_description:
            form.initial_need_description.trim() || undefined,
          need_start_date: form.need_start_date || null,
          anamnesis: form.anamnesis.trim() || undefined,
          hda: form.hda.trim() || undefined,
          current_condition: form.current_condition.trim() || undefined,
          observations: form.observations.trim() || undefined,
          relevant_information:
            form.relevant_information.trim() || undefined,
          conclusion: form.conclusion.trim() || undefined,
          recommendation: form.recommendation.trim() || undefined,
        });
        toast.success("Avaliação inicial cadastrada com sucesso.");
        setAssessment(created);
        setSuccessMessage("Avaliação criada com sucesso.");
        moveToStep(5);
      } else if (assessment) {
        const payload = manager
          ? { professional: Number(form.professional) }
          : {
              professional: form.professional
                ? Number(form.professional)
                : undefined,
              assessment_date: form.assessment_date || undefined,
              assessment_time:
                form.assessment_time.length === 5
                  ? `${form.assessment_time}:00`
                  : form.assessment_time || undefined,
              request_origin: form.request_origin || undefined,
              administrative_observations: form.administrative_observations,
              request_reason: form.request_reason,
              chief_complaint: form.chief_complaint,
              initial_need_description: form.initial_need_description,
              need_start_date: form.need_start_date || null,
              anamnesis: form.anamnesis,
              hda: form.hda,
              current_condition: form.current_condition,
              observations: form.observations,
              relevant_information: form.relevant_information,
              conclusion: form.conclusion,
              recommendation: form.recommendation,
            };
        const updated = await updateAssessment(assessment.id, payload);
        toast.success("Avaliação atualizada com sucesso.");
        setAssessment(updated);
        setForm(toMain(updated));
        setSuccessMessage("Alterações salvas com sucesso.");
        if (step === 4) navigate(`/avaliacoes/${updated.id}`);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao salvar avaliação.");
      if (err instanceof ApiError && err.status === 403) {
        setActionError(err.message);
      } else {
        setFieldErrors(
          parseFieldErrors(
            err instanceof ApiError ? err.message : "Falha ao salvar.",
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddNeed() {
    if (!canAddNeeds || !assessment || !needType || !needDesc.trim()) return;
    setAddingNeed(true);
    setNeedError(null);
    try {
      const need = await addNeed(assessment.id, {
        need_type: Number(needType),
        description: needDesc.trim(),
        priority: needPriority,
      });
      setAssessment((prev) =>
        prev ? { ...prev, care_needs: [...prev.care_needs, need] } : prev,
      );
      setNeedType("");
      setNeedDesc("");
      setNeedPriority("MEDIUM");
      toast.success("Necessidade adicionada à avaliação.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao adicionar necessidade.");
      setNeedError(
        err instanceof ApiError ? err.message : "Falha ao adicionar necessidade.",
      );
    } finally {
      setAddingNeed(false);
    }
  }

  async function handleAddResource() {
    if (!assessment || !resourceId) return;
    setAddingResource(true);
    setActionError(null);
    try {
      const link = await addResource(assessment.id, {
        resource: Number(resourceId),
        quantity: Number(resourceQty) || 1,
        observation: resourceObs.trim() || undefined,
      });
      setAssessment((prev) =>
        prev
          ? { ...prev, assessment_resources: [...prev.assessment_resources, link] }
          : prev,
      );
      setResourceId("");
      setResourceQty("1");
      setResourceObs("");
      toast.success("Recurso associado à avaliação.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao associar recurso.");
      setActionError(
        err instanceof ApiError ? err.message : "Falha ao associar recurso.",
      );
    } finally {
      setAddingResource(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl"><LoadingState label="Carregando dados da avaliação…" /></div>
    );
  }

  if (mode === "edit" && !canEditAssessment(user)) {
    return <div className="mx-auto max-w-5xl"><ErrorState>Você não tem permissão para editar esta avaliação.</ErrorState></div>;
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl space-y-3"><ErrorState>{loadError}</ErrorState><BackLink to="/pacientes">Voltar para pacientes</BackLink></div>
    );
  }

  if (mode === "create" && !canCreateAssessment(user)) {
    return (
      <div className="mx-auto max-w-5xl"><ErrorState>Somente Médico ou Enfermeiro pode criar avaliações.</ErrorState></div>
    );
  }

  const detail = (msg?: string[]) =>
    msg?.length ? msg : fieldErrors.detail;

  return (
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:py-10">
      <PageHeader
        eyebrow="Cuidado clínico"
        title={mode === "create" ? "Nova avaliação inicial" : "Editar avaliação"}
        description={patient ? <>Paciente: <strong className="font-semibold text-care-ink">{patient.full_name}</strong>. Registre as informações desta avaliação; os registros anteriores permanecem preservados.</> : "Registre as informações clínicas desta avaliação. Os registros anteriores permanecem preservados."}
        actions={patient ? <BackLink to={`/pacientes/${patient.id}/avaliacoes`}>Voltar ao histórico</BackLink> : undefined}
      />
      {mode === "edit" && manager && (
        <p className="mb-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Como gerente, você pode alterar apenas o profissional responsável.
        </p>
      )}
      {actionError && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {actionError}
        </p>
      )}
      {successMessage && (
        <p role="status" className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </p>
      )}
      {fieldErrors.detail && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {fieldErrors.detail.join(" ")}
        </p>
      )}

      <div className="mb-6 rounded-2xl border border-care-line bg-white p-5 shadow-sm sm:p-6" aria-label="Progresso da avaliação">
        <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-care-action">Etapa {step} <span className="text-care-muted">de 5</span></p><h2 className="mt-1 text-xl font-bold tracking-tight">{steps[step - 1].title}</h2><p className="mt-1 text-sm text-care-muted">{steps[step - 1].description}</p></div><span className="rounded-full bg-care-soft px-3 py-1.5 text-sm font-bold text-care-action">{Math.round(step / 5 * 100)}%</span></div>
        <div className="relative flex items-start justify-between" aria-label="Etapas">
          <div className="absolute left-3 right-3 top-4 h-0.5 bg-care-canvas sm:left-5 sm:right-5"><div className="h-full bg-care-action transition-all duration-300" style={{ width: `${((step - 1) / 4) * 100}%` }} /></div>
          {steps.map((item, index) => <div key={item.title} className="relative z-10 flex w-12 flex-col items-center gap-2 text-center sm:w-28"><span className={`grid size-8 place-items-center rounded-full border-2 text-xs font-bold transition-colors sm:size-10 ${index + 1 === step ? "border-care-action bg-care-action text-white shadow-md shadow-care-action/20" : index + 1 < step ? "border-care-action bg-care-soft text-care-action" : "border-care-line bg-white text-care-muted"}`}>{index + 1 < step ? "✓" : index + 1}</span><span className={`hidden text-xs font-semibold leading-tight sm:block ${index + 1 === step ? "text-care-action" : "text-care-muted"}`}>{item.title}</span></div>)}
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (step < 4) { if (validateCurrentStep()) moveToStep(step + 1); } else void handleSubmit(e); }} className="overflow-hidden rounded-2xl border border-care-line bg-white shadow-sm">
        <div key={step} className="grid grid-cols-1 gap-x-5 gap-y-5 p-5 sm:grid-cols-2 sm:p-8" style={{ animation: `assessment-slide-${direction} 220ms ease-out both` }}>
        {step === 1 && <>
        <Field label="Tipo da avaliação">
          <input
            value="Avaliação inicial"
            disabled
            title="Tipo único neste momento (RN-AVL-001)"
            className={`${inputClass} bg-care-canvas`}
          />
        </Field>
        <Field
          label="Profissional responsável *"
          error={detail(fieldErrors.professional)}
        >
          <select
            value={form.professional}
            onChange={(e) => set("professional", e.target.value)}
            required
            disabled={readOnlyMain && !canChangeProfessional(user)}
            title={
              readOnlyMain
                ? "Gerente altera apenas este campo"
                : "Deve ser Médico ou Enfermeiro"
            }
            className={`${inputClass} disabled:bg-care-canvas`}
          >
            <option value="">Selecione…</option>
            {clinicos.map((c) => (
              <option key={c.id} value={c.id}>
                {clinicoDisplayName(c)}
              </option>
            ))}
            {user &&
              form.professional &&
              !clinicos.some((c) => c.id === Number(form.professional)) && (
                <option value={form.professional}>
                  Profissional #{form.professional}
                </option>
              )}
          </select>
        </Field>
        <Field label="Data da avaliação *" error={detail(fieldErrors.assessment_date)}>
          <input
            type="date"
            value={form.assessment_date}
            onChange={(e) => set("assessment_date", e.target.value)}
            required
            disabled={readOnlyMain}
            className={`${inputClass} disabled:bg-care-canvas`}
          />
        </Field>
        <Field label="Hora da avaliação *" error={detail(fieldErrors.assessment_time)}>
          <input
            type="time"
            value={form.assessment_time}
            onChange={(e) => set("assessment_time", e.target.value)}
            required
            disabled={readOnlyMain}
            className={`${inputClass} disabled:bg-care-canvas`}
          />
        </Field>
        <Field label="Origem da solicitação" error={detail(fieldErrors.request_origin)}>
          <select
            value={form.request_origin}
            onChange={(e) => set("request_origin", e.target.value)}
            disabled={readOnlyMain}
            className={`${inputClass} disabled:bg-care-canvas`}
          >
            <option value="">Selecione…</option>
            {REQUEST_ORIGINS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Início da necessidade">
          <input
            type="date"
            value={form.need_start_date}
            onChange={(e) => set("need_start_date", e.target.value)}
            disabled={readOnlyMain}
            className={`${inputClass} disabled:bg-care-canvas`}
          />
        </Field>
        </>}
        {step === 2 && <>
        <div className="sm:col-span-2">
          <Field
            label="Motivo da solicitação *"
            error={detail(fieldErrors.request_reason)}
          >
            <textarea
              value={form.request_reason}
              onChange={(e) => set("request_reason", e.target.value)}
              required
              disabled={readOnlyMain}
              className={`${textClass} disabled:bg-care-canvas`}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Queixa principal *"
            error={detail(fieldErrors.chief_complaint)}
          >
            <textarea
              value={form.chief_complaint}
              onChange={(e) => set("chief_complaint", e.target.value)}
              required
              disabled={readOnlyMain}
              className={`${textClass} disabled:bg-care-canvas`}
            />
          </Field>
        </div>
        {([ ["administrative_observations", "Observações administrativas"], ["initial_need_description", "Descrição inicial da necessidade"] ] as [keyof MainForm, string][]).map(([key, label]) => <div key={key} className="sm:col-span-2"><Field label={label}><textarea value={form[key]} onChange={(e) => set(key, e.target.value)} disabled={readOnlyMain} className={`${textClass} disabled:bg-care-canvas`} /></Field></div>)}
        </>}
        {step === 3 && <>
        {(
          [
            ["anamnesis", "Anamnese"],
            ["hda", "HDA"],
            ["current_condition", "Situação atual"],
            ["observations", "Observações"],
            ["relevant_information", "Informações relevantes"],
          ] as [keyof MainForm, string][]
        ).map(([key, label]) => (
          <div key={key} className="sm:col-span-2">
            <Field label={label}>
              <textarea
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                disabled={readOnlyMain}
                className={`${textClass} disabled:bg-care-canvas`}
              />
            </Field>
          </div>
        ))}
        </>}
        {step === 4 && <>
          {([ ["conclusion", "Conclusão"], ["recommendation", "Recomendação / Conduta"] ] as [keyof MainForm, string][]).map(([key, label]) => <div key={key} className="sm:col-span-2"><Field label={label}><textarea value={form[key]} onChange={(e) => set(key, e.target.value)} disabled={readOnlyMain} className={`${textClass} disabled:bg-care-canvas`} /></Field></div>)}
        </>}

        {step === 5 && <div className="sm:col-span-2 text-sm text-care-ink">A avaliação foi salva. Registre abaixo as necessidades identificadas e os recursos associados.</div>}

        <div className="-mx-5 -mb-5 mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-care-line bg-care-canvas/70 px-5 py-4 sm:-mx-8 sm:-mb-8 sm:px-8 sm:col-span-2">
          <button type="button" onClick={() => moveToStep(step - 1)} disabled={step === 1} className="rounded-xl border border-care-line bg-white px-4 py-2.5 text-sm font-semibold text-care-ink transition hover:border-care-action/40 hover:bg-care-soft disabled:cursor-not-allowed disabled:opacity-40">← Voltar</button>
          {step < 4 ? <button type="button" onClick={() => { if (validateCurrentStep()) moveToStep(step + 1); }} className="rounded-xl bg-care-action px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-care-forest">Próxima etapa <span aria-hidden="true">→</span></button> : step === 4 ? <button type="submit" disabled={submitting} className="rounded-xl bg-care-action px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-care-forest disabled:opacity-50">{submitting ? "Salvando…" : mode === "create" && !assessment ? "Criar avaliação e continuar →" : "Salvar e concluir →"}</button> : <button type="button" onClick={() => navigate(`/avaliacoes/${assessment?.id}`)} className="rounded-xl bg-care-action px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-care-forest">Concluir e ver avaliação →</button>}
          {assessment && step < 5 && <button type="button" onClick={() => moveToStep(5)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-care-action transition hover:bg-care-soft">Necessidades e recursos</button>}
        </div>
        </div>
      </form>

      {assessment && step === 5 && <>
      <section aria-labelledby="assessment-needs-heading" className="mt-6 rounded-2xl border border-care-line bg-white p-5 shadow-sm sm:p-7">
            <h2 id="assessment-needs-heading" className="mb-2 text-lg font-semibold">
              Necessidades identificadas ({assessment?.care_needs.length ?? 0})
            </h2>
            <p className="mb-3 text-sm text-care-ink">Registre os cuidados identificados nesta avaliação, como acompanhamento de enfermagem ou fisioterapia. Cada necessidade tem tipo, descrição e prioridade.</p>
            {!assessment && <p className="mb-3 rounded bg-care-soft p-3 text-sm text-care-ink">Salve a avaliação para adicionar necessidades. Elas ficarão vinculadas a esta avaliação.</p>}
            {assessment && assessment.care_needs.length === 0 && <p className="mb-3 text-sm text-care-ink">Nenhuma necessidade registrada nesta avaliação.</p>}
            {assessment && assessment.care_needs.length > 0 && (
              <ul className="mb-3 space-y-2">
                {assessment.care_needs.map((n) => (
                  <li key={n.id} className="rounded border px-3 py-2 text-sm">
                    <span className="font-medium">
                      {n.need_type_name ?? `Tipo #${n.need_type}`}
                    </span>{" "}
                    · {n.description} ·{" "}
                    {NEED_PRIORITIES.find((p) => p.value === n.priority)?.label ??
                      n.priority}{" "}
                    · {n.status === "IDENTIFIED" ? "Identificada" : n.status}
                    <span className={`ml-2 rounded px-2 py-0.5 ${n.is_active ? "bg-green-100" : "bg-care-canvas"}`}>{n.is_active ? "Ativa" : "Inativa"}</span>
                  </li>
                ))}
              </ul>
            )}
            {needError && <p role="alert" className="mb-3 text-sm text-red-600">{needError}</p>}
            {canAddNeeds ? <fieldset disabled={!assessment || addingNeed}>
            <legend className="mb-2 text-sm font-semibold">Adicionar necessidade</legend>
            {needCatalogError && <p role="alert" className="mb-2 text-sm text-red-600">Não foi possível carregar os tipos. Recarregue a página para tentar novamente.</p>}
            {!needCatalogError && needTypes.length === 0 && <p className="mb-2 text-sm text-care-ink">Nenhum tipo ativo disponível para seleção.</p>}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Tipo *</span>
                <select
                  value={needType}
                  onChange={(e) => setNeedType(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecione…</option>
                  {needTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Prioridade *</span>
                <select
                  value={needPriority}
                  onChange={(e) => setNeedPriority(e.target.value)}
                  className={inputClass}
                >
                  {NEED_PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium">Descrição *</span>
                <textarea
                  value={needDesc}
                  onChange={(e) => setNeedDesc(e.target.value)}
                  className={textClass}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Status inicial</span>
                <input value="Identificada" readOnly className={`${inputClass} bg-care-canvas`} />
              </label>
            </div>
            <button
              type="button"
              disabled={addingNeed || !needType || !needDesc.trim()}
              onClick={() => void handleAddNeed()}
              className="mt-2 rounded border border-care-line px-4 py-2 text-sm disabled:opacity-50"
            >
              {addingNeed ? "Adicionando…" : "Adicionar necessidade"}
            </button>
            </fieldset> : <p className="text-sm text-care-ink">Seu perfil não tem permissão para adicionar necessidades.</p>}
            {assessment && <Link to={`/avaliacoes/${assessment.id}`} className="mt-3 inline-block text-sm text-care-action underline">Ver necessidades e histórico da avaliação</Link>}
      </section>

      {assessment && canAddAssessmentResource(user) && (
          <section className="mt-5 rounded-2xl border border-care-line bg-white p-5 shadow-sm sm:p-7">
            <h2 className="mb-3 text-sm font-semibold">
              Recursos ({assessment.assessment_resources.length})
            </h2>
            {assessment.assessment_resources.length > 0 && (
              <ul className="mb-3 space-y-2">
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium">Recurso *</span>
                <select
                  value={resourceId}
                  onChange={(e) => setResourceId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Selecione…</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">Quantidade *</span>
                <input
                  type="number"
                  min={1}
                  value={resourceQty}
                  onChange={(e) => setResourceQty(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block sm:col-span-3">
                <span className="mb-1 block text-sm font-medium">Observação</span>
                <input
                  value={resourceObs}
                  onChange={(e) => setResourceObs(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            <button
              type="button"
              disabled={addingResource || !resourceId}
              onClick={() => void handleAddResource()}
              className="mt-2 rounded border border-care-line px-4 py-2 text-sm disabled:opacity-50"
            >
              {addingResource ? "Associando…" : "Associar recurso"}
            </button>
          </section>
      )}
      </>}
      <style>{`@keyframes assessment-slide-forward { from { opacity: 0; transform: translateX(1.25rem); } to { opacity: 1; transform: translateX(0); } } @keyframes assessment-slide-backward { from { opacity: 0; transform: translateX(-1.25rem); } to { opacity: 1; transform: translateX(0); } } @media (prefers-reduced-motion: reduce) { [style*="assessment-slide-"] { animation: none !important; } }`}</style>
    </div>
  );
}
