import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { ApiError } from "../lib/api";
import { formatCpf, stripCpf } from "../lib/cpf";
import {
  createPatient,
  createHealthCondition,
  listHealthConditions,
  type HealthCondition,
  getPatient,
  isGerente,
  listMedicos,
  medicoDisplayName,
  parseFieldErrors,
  updatePatient,
  type Medico,
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
        <span key={msg} className="mt-0.5 block text-xs text-red-600">
          {msg}
        </span>
      ))}
    </label>
  );
}

const inputClass = "w-full rounded border border-gray-300 px-3 py-2";
const genderOptions = ["Masculino", "Feminino", "Prefiro não dizer"];

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
  zip_code: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string;
  reference_point: string;
  region: string;
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
  zip_code: "",
  state: "",
  city: "",
  neighborhood: "",
  street: "",
  number: "",
  complement: "",
  reference_point: "",
  region: "",
};

export function PatientForm({ mode }: { mode: "create" | "edit" }) {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const manager = isGerente(user?.groups);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [medicos, setMedicos] = useState<Medico[]>([]);
  const [conditions, setConditions] = useState<HealthCondition[]>([]);
  const [conditionsLoading, setConditionsLoading] = useState(true);
  const [conditionsError, setConditionsError] = useState<string | null>(null);
  const [newCondition, setNewCondition] = useState("");
  const [addingCondition, setAddingCondition] = useState(false);
  const [loading, setLoading] = useState(mode === "edit");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setConditions(await listHealthConditions());
      } catch {
        setConditionsError("Falha ao carregar condições de saúde. Recarregue a página para tentar novamente.");
      } finally {
        setConditionsLoading(false);
      }
      // O select de médicos só é acessível ao gerente (GET /api/medicos/).
      if (manager) {
        try {
          setMedicos(await listMedicos());
        } catch {
          setMedicos([]);
        }
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
            phone: patient.phone,
            gender: patient.gender,
            responsible_doctor: patient.responsible_doctor?.toString() ?? "",
            responsible_team:
              typeof patient.responsible_team === "string"
                ? patient.responsible_team
                : (patient.responsible_team
                    ? JSON.stringify(patient.responsible_team)
                    : ""),
            health_condition: patient.health_condition?.toString() ?? "",
            zip_code: address?.zip_code ?? "",
            state: address?.state ?? "",
            city: address?.city ?? "",
            neighborhood: address?.neighborhood ?? "",
            street: address?.street ?? "",
            number: address?.number ?? "",
            complement: address?.complement ?? "",
            reference_point: address?.reference_point ?? "",
            region: address?.region ?? "",
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

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function addCondition() {
    if (!newCondition.trim()) return;
    setAddingCondition(true);
    setConditionsError(null);
    try {
      const created = await createHealthCondition(newCondition.trim());
      setConditions((previous) => [...previous, created].sort((a, b) => a.name.localeCompare(b.name)));
      set("health_condition", String(created.id));
      setNewCondition("");
    } catch {
      setConditionsError("Não foi possível cadastrar a condição de saúde. Tente novamente.");
    } finally {
      setAddingCondition(false);
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
        street: form.street.trim(),
        number: form.number.trim(),
        complement: form.complement.trim(),
        reference_point: form.reference_point.trim(),
        region: form.region.trim(),
      };
      if (mode === "create") {
        const created = await createPatient({
          full_name: form.full_name.trim(),
          birth_date: form.birth_date,
          cpf: stripCpf(form.cpf),
          rg: form.rg.trim(),
          age: Number(form.age),
          phone: form.phone.trim(),
          gender: form.gender.trim(),
          responsible_doctor: Number(form.responsible_doctor),
          responsible_team: form.responsible_team.trim() || undefined,
          health_condition: Number(form.health_condition),
          address,
        });
        navigate(`/pacientes/${created.id}`);
      } else {
        // Médico/enfermeiro não envia médico/equipe (backend responde 403).
        const payload = {
          full_name: form.full_name.trim(),
          birth_date: form.birth_date,
          cpf: stripCpf(form.cpf),
          rg: form.rg.trim(),
          age: Number(form.age),
          phone: form.phone.trim(),
          gender: form.gender.trim(),
          health_condition: form.health_condition
            ? Number(form.health_condition)
            : null,
          address,
          ...(manager
            ? {
                responsible_doctor: form.responsible_doctor
                  ? Number(form.responsible_doctor)
                  : null,
                responsible_team: form.responsible_team.trim() || null,
              }
            : {}),
        };
        const updated = await updatePatient(Number(id), payload);
        navigate(`/pacientes/${updated.id}`);
      }
    } catch (err) {
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
      <div className="mx-auto max-w-3xl p-6">
        <p className="text-sm text-gray-600">Carregando…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p role="alert" className="mb-3 text-sm text-red-600">
          {loadError}
        </p>
        <Link to="/pacientes" className="text-sm text-blue-600 underline">
          Voltar para a listagem
        </Link>
      </div>
    );
  }

  const detail = (msg?: string[]) =>
    msg?.length ? msg : fieldErrors.detail;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-2xl font-semibold">
        {mode === "create" ? "Novo paciente" : "Editar paciente"}
      </h1>

      {fieldErrors.detail && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {fieldErrors.detail.join(" ")}
        </p>
      )}

      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="grid grid-cols-1 gap-3 rounded-lg bg-white p-4 shadow sm:grid-cols-2"
      >
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
            onChange={(e) => set("phone", e.target.value)}
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
        <Field
          label="Condição de saúde"
          error={detail(fieldErrors.health_condition)}
        >
          <select
            value={form.health_condition}
            onChange={(e) => set("health_condition", e.target.value)}
            required={mode === "create"}
            disabled={conditionsLoading || addingCondition}
            className={inputClass}
          >
            <option value="">{conditionsLoading ? "Carregando…" : "Selecione…"}</option>
            {form.health_condition && !conditions.some((condition) => String(condition.id) === form.health_condition) && (
              <option value={form.health_condition}>Condição atual (cadastro sem nome)</option>
            )}
            {conditions.map((condition) => (
              <option key={condition.id} value={condition.id}>
                {condition.name || `Condição sem nome — registro ${condition.id}`}
              </option>
            ))}
          </select>
        </Field>
        {manager && (
          <div className="sm:col-span-2">
            <label htmlFor="new-condition" className="mb-1 block text-sm font-medium">Cadastrar nova condição de saúde</label>
            <div className="flex gap-2">
              <input id="new-condition" value={newCondition} onChange={(event) => setNewCondition(event.target.value)}
                maxLength={255} placeholder="Nome da condição de saúde" className={inputClass} />
              <button type="button" onClick={() => void addCondition()} disabled={addingCondition || !newCondition.trim() || conditionsLoading}
                className="shrink-0 rounded border border-blue-600 px-3 py-2 text-sm text-blue-600 disabled:opacity-50">
                {addingCondition ? "Cadastrando…" : "Adicionar"}
              </button>
            </div>
            {!conditionsLoading && conditions.length === 0 && !conditionsError && <p className="mt-1 text-sm text-gray-600">Cadastre uma condição para selecioná-la no paciente.</p>}
          </div>
        )}
        {conditionsError && <p role="alert" className="text-sm text-red-600 sm:col-span-2">{conditionsError}</p>}
        <Field
          label="Médico responsável"
          error={detail(fieldErrors.responsible_doctor)}
        >
          <select
            value={form.responsible_doctor}
            onChange={(e) => set("responsible_doctor", e.target.value)}
            required={mode === "create"}
            disabled={!manager}
            title={!manager ? "Somente gerente pode alterar" : undefined}
            className={`${inputClass} disabled:bg-gray-100`}
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
          <input
            value={form.responsible_team}
            onChange={(e) => set("responsible_team", e.target.value)}
            placeholder="Texto livre (provisório)"
            disabled={!manager}
            title={!manager ? "Somente gerente pode alterar" : undefined}
            className={`${inputClass} disabled:bg-gray-100`}
          />
        </Field>

        <h2 className="mt-2 text-sm font-semibold sm:col-span-2">Endereço</h2>
        <Field label="CEP" error={detail(fieldErrors.address)}>
          <input
            value={form.zip_code}
            onChange={(e) => set("zip_code", e.target.value)}
            required={mode === "create"}
            inputMode="numeric"
            className={inputClass}
          />
        </Field>
        <Field label="Estado (UF)">
          <input
            value={form.state}
            onChange={(e) => set("state", e.target.value.toUpperCase())}
            required={mode === "create"}
            maxLength={2}
            placeholder="PA"
            className={inputClass}
          />
        </Field>
        <Field label="Cidade">
          <input
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            required={mode === "create"}
            className={inputClass}
          />
        </Field>
        <Field label="Bairro">
          <input
            value={form.neighborhood}
            onChange={(e) => set("neighborhood", e.target.value)}
            required={mode === "create"}
            className={inputClass}
          />
        </Field>
        <Field label="Rua">
          <input
            value={form.street}
            onChange={(e) => set("street", e.target.value)}
            required={mode === "create"}
            className={inputClass}
          />
        </Field>
        <Field label="Número">
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
        <Field label="Região">
          <input
            value={form.region}
            onChange={(e) => set("region", e.target.value)}
            placeholder="Usada no filtro por região"
            className={inputClass}
          />
        </Field>

        <div className="flex gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting
              ? "Salvando…"
              : mode === "create"
                ? "Cadastrar"
                : "Salvar alterações"}
          </button>
          <Link
            to={mode === "create" ? "/pacientes" : `/pacientes/${id}`}
            className="rounded border border-gray-300 px-4 py-2 text-sm"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
