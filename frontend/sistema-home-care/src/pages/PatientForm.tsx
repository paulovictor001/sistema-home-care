import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { ApiError } from "../lib/api";
import { formatCpf, stripCpf } from "../lib/cpf";
import { formatPhone, stripPhone } from "../lib/phone";
import {
  createPatient,
  getPatient,
  isGerente,
  canManagePatientAssignments,
  listMedicos,
  listTeams,
  medicoDisplayName,
  parseFieldErrors,
  updatePatient,
  listNeighborhoods,
  type ManagedNeighborhood,
  type Medico,
  type Team,
} from "../lib/patients";

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
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {error?.map((msg) => (
        <span key={msg} role="alert" className="mt-1 block text-xs font-medium text-red-700">
          {msg}
        </span>
      ))}
    </label>
  );
}

const inputClass = "min-h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink outline-none transition placeholder:text-muted/80 focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-background disabled:text-muted";
const genderOptions = ["Masculino", "Feminino", "Prefiro não dizer"];

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function FormSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-4 border-b border-line pb-6 last:border-0 last:pb-0 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

interface FormState {
  full_name: string;
  birth_date: string;
  cpf: string;
  rg: string;
  age: string;
  phone: string;
  gender: string;
  responsible_doctor: string;
  responsible_team: string;
  health_condition: string;
  allergies: string;
  restrictions: string;
  special_needs: string;
  important_observations: string;
  zip_code: string;
  state: string;
  city: string;
  neighborhood: string;
  neighborhood_id: string;
  street: string;
  number: string;
  complement: string;
  reference_point: string;
}

const EMPTY: FormState = {
  full_name: "",
  birth_date: "",
  cpf: "",
  rg: "",
  age: "",
  phone: "",
  gender: "",
  responsible_doctor: "",
  responsible_team: "",
  health_condition: "",
  allergies: "",
  restrictions: "",
  special_needs: "",
  important_observations: "",
  zip_code: "",
  state: "",
  city: "",
  neighborhood: "",
  neighborhood_id: "",
  street: "",
  number: "",
  complement: "",
  reference_point: "",
};

export function PatientForm({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const manager = isGerente(user?.groups);
  const canManageAssignments = canManagePatientAssignments(user);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [managedNeighborhoods, setManagedNeighborhoods] = useState<ManagedNeighborhood[]>([]);
  const [loading, setLoading] = useState(mode === "edit");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepMessage, setCepMessage] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [stepDirection, setStepDirection] = useState<"forward" | "backward">("forward");

  useEffect(() => {
    async function load() {
      // O select de médicos só é acessível ao gerente (GET /api/medicos/).
      if (manager) {
        try {
          setMedicos(await listMedicos());
        } catch {
          setMedicos([]);
        }
        try { setTeams(await listTeams()); } catch { setTeams([]); }
      }
      if (mode === "edit" && id) {
        try {
          const patient = await getPatient(Number(id));
          const address = patient.address;
          setForm({
            full_name: patient.full_name,
            birth_date: patient.birth_date,
            cpf: formatCpf(patient.cpf),
            rg: patient.rg,
            age: String(patient.age),
            phone: formatPhone(patient.phone),
            gender: patient.gender,
            responsible_doctor: patient.responsible_doctor?.toString() ?? "",
            responsible_team: patient.responsible_team?.toString() ?? "",
            health_condition: patient.health_condition ?? "",
            allergies: patient.allergies ?? "",
            restrictions: patient.restrictions ?? "",
            special_needs: patient.special_needs ?? "",
            important_observations: patient.important_observations ?? "",
            zip_code: address?.zip_code ?? "",
            state: address?.state ?? "",
            city: address?.city ?? "",
            neighborhood: address?.neighborhood ?? "",
            neighborhood_id: address?.neighborhood_id?.toString() ?? "",
            street: address?.street ?? "",
            number: address?.number ?? "",
            complement: address?.complement ?? "",
            reference_point: address?.reference_point ?? "",
          });
        } catch (err) {
          setLoadError(
            err instanceof ApiError
              ? err.message
              : "Falha ao carregar paciente.",
          );
        } finally {
          setLoading(false);
        }
      }
    }
    void load();
  }, [mode, id, manager]);

  useEffect(() => {
    if (!form.state || !form.city) { setManagedNeighborhoods([]); return; }
    void listNeighborhoods(form.state, form.city).then(setManagedNeighborhoods).catch(() => setManagedNeighborhoods([]));
  }, [form.state, form.city]);

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((previous) => {
      if (!previous[key]) return previous;
      const next = { ...previous };
      delete next[key];
      return next;
    });
  }

  function moveToStep(next: number) {
    setStepDirection(next > step ? "forward" : "backward");
    setStep(next);
  }

  function validateCurrentStep() {
    const requiredByStep: Record<number, (keyof FormState)[]> = {
      1: ["full_name", "birth_date", "cpf", "rg", "age", "phone", "gender"],
      2: mode === "create" ? ["health_condition", "responsible_doctor"] : [],
      3: mode === "create" ? ["zip_code", "state", "city", "neighborhood", "street", "number"] : [],
    };
    const errors: Record<string, string[]> = {};
    for (const key of requiredByStep[step]) {
      if (!String(form[key]).trim()) errors[key] = ["Este campo é obrigatório."];
    }
    setFieldErrors((previous) => {
      const next = { ...previous };
      for (const key of requiredByStep[step]) delete next[key];
      return { ...next, ...errors };
    });
    return Object.keys(errors).length === 0;
  }

  async function lookupCep(value: string) {
    const cep = value.replace(/\D/g, "");
    setCepMessage(null);
    if (cep.length !== 8) return;
    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error("Consulta indisponível");
      const data: { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string } = await response.json();
      if (data.erro) {
        setCepMessage("CEP não encontrado. Confira o número ou preencha o endereço manualmente.");
        return;
      }
      setForm((previous) => ({
        ...previous,
        street: data.logradouro ?? "",
        neighborhood: data.bairro ?? "",
        neighborhood_id: "",
        city: data.localidade ?? "",
        state: data.uf ?? "",
      }));
      setCepMessage("Endereço preenchido pelo CEP. Confira os dados e informe o número.");
    } catch {
      setCepMessage("Não foi possível consultar o CEP. Preencha o endereço manualmente.");
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFieldErrors({});
    setSubmitting(true);
    try {
      const address = {
        zip_code: form.zip_code.trim(),
        state: form.state.trim(),
        city: form.city.trim(),
        neighborhood: form.neighborhood.trim(),
        neighborhood_id: form.neighborhood_id ? Number(form.neighborhood_id) : null,
        street: form.street.trim(),
        number: form.number.trim(),
        complement: form.complement.trim(),
        reference_point: form.reference_point.trim(),
      };
      if (mode === "create") {
        const created = await createPatient({
          full_name: form.full_name.trim(),
          birth_date: form.birth_date,
          cpf: stripCpf(form.cpf),
          rg: form.rg.trim(),
          age: Number(form.age),
          phone: stripPhone(form.phone),
          gender: form.gender.trim(),
          responsible_doctor: Number(form.responsible_doctor),
          responsible_team: form.responsible_team ? Number(form.responsible_team) : null,
          health_condition: form.health_condition.trim(),
          allergies: form.allergies.trim(),
          restrictions: form.restrictions.trim(),
          special_needs: form.special_needs.trim(),
          important_observations: form.important_observations.trim(),
          address,
        });
        toast.success("Paciente cadastrado com sucesso.");
        navigate(`/pacientes/${created.id}`);
      } else {
        // Médico/enfermeiro não envia médico/equipe (backend responde 403).
        const payload = {
          full_name: form.full_name.trim(),
          birth_date: form.birth_date,
          cpf: stripCpf(form.cpf),
          rg: form.rg.trim(),
          age: Number(form.age),
          phone: stripPhone(form.phone),
          gender: form.gender.trim(),
          health_condition: form.health_condition.trim(),
          allergies: form.allergies.trim(),
          restrictions: form.restrictions.trim(),
          special_needs: form.special_needs.trim(),
          important_observations: form.important_observations.trim(),
          address,
          ...(canManageAssignments
            ? {
                responsible_doctor: form.responsible_doctor
                  ? Number(form.responsible_doctor)
                  : null,
                responsible_team: form.responsible_team ? Number(form.responsible_team) : null,
              }
            : {}),
        };
        const updated = await updatePatient(Number(id), payload);
        toast.success("Cadastro do paciente atualizado.");
        navigate(`/pacientes/${updated.id}`);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao salvar o paciente.");
      setFieldErrors(
        parseFieldErrors(
          err instanceof ApiError ? err.message : "Falha ao salvar.",
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <p className="text-sm text-ink">Carregando…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <p role="alert" className="mb-3 text-sm text-red-600">
          {loadError}
        </p>
        <Link to="/pacientes" className="text-sm text-primary underline">
          Voltar para a listagem
        </Link>
      </div>
    );
  }

  const detail = (msg?: string[]) =>
    msg?.length ? msg : fieldErrors.detail;

  return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Cadastro de pacientes</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
          {mode === "create" ? "Novo paciente" : "Editar paciente"}
        </h1>
        <p className="mt-1 text-sm text-muted">Organize os dados pessoais, clínicos e de endereço.</p>
      </header>

      {fieldErrors.detail && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {fieldErrors.detail.join(" ")}
        </p>
      )}

      <div className="mb-5 rounded-2xl border border-line bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between text-sm"><span className="font-semibold text-ink">Etapa {step} de 3</span><span className="text-muted">{Math.round((step / 3) * 100)}% concluído</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-background"><div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(step / 3) * 100}%` }} /></div>
        <div className="mt-4 grid grid-cols-3 gap-2">{["Dados pessoais", "Informações clínicas e responsáveis", "Endereço"].map((title, index) => <div key={title} className={`text-xs sm:text-sm ${step === index + 1 ? "font-semibold text-primary" : "text-muted"}`}><span className={`mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full ${step >= index + 1 ? "bg-primary text-white" : "bg-background text-muted"}`}>{index + 1}</span><span className="hidden sm:inline">{title}</span></div>)}</div>
      </div>
      <form noValidate onSubmit={(e) => { e.preventDefault(); if (step < 3) { if (validateCurrentStep()) moveToStep(step + 1); } else if (validateCurrentStep()) void handleSubmit(e); }} className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div key={step} className={`space-y-6 p-4 sm:p-6 ${stepDirection === "forward" ? "patient-slide-forward" : "patient-slide-backward"}`}>
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Etapa {step}</p><h2 className="mt-1 text-xl font-semibold text-ink">{["Dados pessoais", "Informações clínicas e responsáveis", "Endereço"][step - 1]}</h2><p className="mt-1 text-sm text-muted">{["Identificação e formas de contato do paciente.", "Condição de saúde e equipe responsável pelo acompanhamento.", "Localização e referências para atendimento domiciliar."][step - 1]}</p></div>
        {step === 1 && <FormSection title="Dados pessoais" description="Identificação e formas de contato do paciente.">
        <Field label="Nome completo" error={detail(fieldErrors.full_name)}>
          <input
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field
          label="Data de nascimento"
          error={detail(fieldErrors.birth_date)}
        >
          <input
            type="date"
            value={form.birth_date}
            onChange={(e) => set("birth_date", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="CPF" error={detail(fieldErrors.cpf)}>
          <input
            value={form.cpf}
            onChange={(e) => set("cpf", formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            required
            className={inputClass}
          />
        </Field>
        <Field label="RG" error={detail(fieldErrors.rg)}>
          <input
            value={form.rg}
            onChange={(e) => set("rg", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Idade" error={detail(fieldErrors.age)}>
          <input
            type="number"
            min={0}
            value={form.age}
            onChange={(e) => set("age", e.target.value)}
            required
            className={inputClass}
          />
        </Field>
        <Field label="Telefone" error={detail(fieldErrors.phone)}>
          <input
            value={form.phone}
            onChange={(e) => set("phone", formatPhone(e.target.value))}
            placeholder="(11) 91234-5678"
            inputMode="tel"
            required
            className={inputClass}
          />
        </Field>
        <Field label="Sexo" error={detail(fieldErrors.gender)}>
          <select
            value={form.gender}
            onChange={(e) => set("gender", e.target.value)}
            required
            className={inputClass}
          >
            <option value="">Selecione…</option>
            {form.gender && !genderOptions.includes(form.gender) && (
              <option value={form.gender}>{form.gender}</option>
            )}
            {genderOptions.map((gender) => <option key={gender} value={gender}>{gender}</option>)}
          </select>
        </Field>
        </FormSection>}

        {step === 2 && <FormSection title="Informações clínicas e responsáveis" description="Condição de saúde e equipe responsável pelo acompanhamento.">
        <Field
          label="Condição de saúde"
          error={detail(fieldErrors.health_condition)}
        >
          <textarea
            value={form.health_condition}
            onChange={(e) => set("health_condition", e.target.value)}
            maxLength={2000}
            rows={3}
            required={mode === "create"}
            className={inputClass}
            placeholder="Ex.: hipertensão, diabetes"
          />
        </Field>
        <Field label="Alergias" error={detail(fieldErrors.allergies)}>
          <textarea value={form.allergies} onChange={(e) => set("allergies", e.target.value)} rows={3} className={inputClass} />
        </Field>
        <Field label="Restrições" error={detail(fieldErrors.restrictions)}>
          <textarea value={form.restrictions} onChange={(e) => set("restrictions", e.target.value)} rows={3} className={inputClass} />
        </Field>
        <Field label="Necessidades especiais" error={detail(fieldErrors.special_needs)}>
          <textarea value={form.special_needs} onChange={(e) => set("special_needs", e.target.value)} rows={3} className={inputClass} />
        </Field>
        <Field label="Observações importantes" error={detail(fieldErrors.important_observations)}>
          <textarea value={form.important_observations} onChange={(e) => set("important_observations", e.target.value)} rows={3} className={inputClass} />
        </Field>
        <Field
          label="Médico responsável"
          error={detail(fieldErrors.responsible_doctor)}
        >
          <select
            value={form.responsible_doctor}
            onChange={(e) => set("responsible_doctor", e.target.value)}
            required={mode === "create"}
            disabled={mode === "edit" ? !canManageAssignments : !manager}
            title={mode === "edit" && !canManageAssignments ? "Somente gerente com permissão para alterar responsáveis" : undefined}
            className={`${inputClass} disabled:bg-line`}
          >
            <option value="">Selecione…</option>
            {medicos.map((medico) => (
              <option key={medico.id} value={medico.id}>
                {medicoDisplayName(medico)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Equipe responsável"
          error={detail(fieldErrors.responsible_team)}
        >
          <select
            value={form.responsible_team}
            onChange={(e) => set("responsible_team", e.target.value)}
            disabled={mode === "edit" ? !canManageAssignments : !manager}
            title={mode === "edit" && !canManageAssignments ? "Somente gerente com permissão para alterar responsáveis" : undefined}
            className={`${inputClass} disabled:bg-line`}
          >
            <option value="">Sem equipe</option>
            {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
          </select>
        </Field>
        </FormSection>}

        {step === 3 && <FormSection title="Endereço" description="Localização e referências para atendimento domiciliar.">
        <Field label="CEP" error={detail(fieldErrors.address)}>
          <input
            value={form.zip_code}
            onChange={(e) => {
              set("zip_code", formatCep(e.target.value));
              setCepMessage(null);
            }}
            onBlur={(e) => void lookupCep(e.target.value)}
            required={mode === "create"}
            inputMode="numeric"
            placeholder="00000-000"
            className={inputClass}
          />
        </Field>
        {cepLoading && <p role="status" className="text-sm text-muted">Consultando CEP…</p>}
        {cepMessage && <p role="status" className="text-sm text-muted sm:col-span-2">{cepMessage}</p>}
        <Field label="Estado (UF)" error={detail(fieldErrors.state)}>
          <input
            value={form.state}
            onChange={(e) => set("state", e.target.value.toUpperCase())}
            required={mode === "create"}
            maxLength={2}
            placeholder="PA"
            className={inputClass}
          />
        </Field>
        <Field label="Cidade" error={detail(fieldErrors.city)}>
          <input
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            required={mode === "create"}
            className={inputClass}
          />
        </Field>
        <Field label="Bairro cadastrado (opcional)">
          <select value={form.neighborhood_id} onChange={(e) => { set("neighborhood_id", e.target.value); const item = managedNeighborhoods.find((n) => String(n.id) === e.target.value); if (item) set("neighborhood", item.name); }} className={inputClass}><option value="">Sem mapeamento cadastrado</option>{managedNeighborhoods.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.region_name}</option>)}</select>
        </Field>
        <Field label="Bairro do endereço" error={detail(fieldErrors.neighborhood)}>
          <input
            value={form.neighborhood}
            onChange={(e) => { set("neighborhood", e.target.value); set("neighborhood_id", ""); }}
            required={mode === "create"}
            className={inputClass}
          />
        </Field>
        <Field label="Rua" error={detail(fieldErrors.street)}>
          <input
            value={form.street}
            onChange={(e) => set("street", e.target.value)}
            required={mode === "create"}
            className={inputClass}
          />
        </Field>
        <Field label="Número" error={detail(fieldErrors.number)}>
          <input
            value={form.number}
            onChange={(e) => set("number", e.target.value)}
            required={mode === "create"}
            className={inputClass}
          />
        </Field>
        <Field label="Complemento">
          <input
            value={form.complement}
            onChange={(e) => set("complement", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Ponto de referência">
          <input
            value={form.reference_point}
            onChange={(e) => set("reference_point", e.target.value)}
            className={inputClass}
          />
        </Field>
        <p className="text-sm text-muted sm:col-span-2">A região vem do bairro cadastrado. Endereços sem mapeamento podem ser salvos e ficam sem região.</p>
        </FormSection>}

        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-line bg-background/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <button type="button" onClick={() => moveToStep(step - 1)} disabled={step === 1} className="min-h-11 rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40">← Voltar</button>
          {step < 3 ? <button type="button" onClick={() => { if (validateCurrentStep()) moveToStep(step + 1); }} className="min-h-11 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark">Próxima etapa →</button> : <button type="submit" disabled={submitting} className="min-h-11 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-50">{submitting ? "Salvando…" : mode === "create" ? "Cadastrar" : "Salvar alterações"}</button>}
          <Link
            to={mode === "create" ? "/pacientes" : `/pacientes/${id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-background"
          >
            Cancelar
          </Link>
        </div>
      </form>
      <style>{`@keyframes patient-slide-forward { from { opacity: 0; transform: translateX(1rem); } to { opacity: 1; transform: translateX(0); } } @keyframes patient-slide-backward { from { opacity: 0; transform: translateX(-1rem); } to { opacity: 1; transform: translateX(0); } } .patient-slide-forward { animation: patient-slide-forward 220ms ease-out; } .patient-slide-backward { animation: patient-slide-backward 220ms ease-out; } @media (prefers-reduced-motion: reduce) { .patient-slide-forward, .patient-slide-backward { animation: none; } }`}</style>
    </div>
  );
}
