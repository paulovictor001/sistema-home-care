import { apiJson } from "./api";

/** Espelha `patients.serializers.PatientSerializer` (read). */
export interface PatientAddress {
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

export type PatientStatus = "ACTIVE" | "INACTIVE";

export interface Patient {
  id: number;
  full_name: string;
  birth_date: string;
  cpf: string;
  rg: string;
  age: number;
  phone: string;
  gender: string;
  status: PatientStatus;
  responsible_doctor: number | null;
  responsible_team: unknown;
  health_condition: number | null;
  address: PatientAddress | null;
  created_at: string;
  updated_at: string;
}

/** Item de `GET /api/medicos/` (somente gerente). */
export interface Medico {
  id: number;
  first_name: string;
  last_name: string;
  cpf: string;
}

export function medicoDisplayName(medico: Medico): string {
  const name = `${medico.first_name} ${medico.last_name}`.trim();
  return name || `Médico #${medico.id}`;
}

/** Resposta paginada padrão do DRF (`PageNumberPagination`). */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Filtro `status` aceito por `GET /api/pacientes/` (default do backend: ativo). */
export type PatientStatusFilter = "ativo" | "inativo" | "todos";

export interface PatientListParams {
  nome?: string;
  cpf?: string;
  status?: PatientStatusFilter;
  regiao?: string;
  page?: number;
}

export function listPatients(
  params: PatientListParams = {},
): Promise<Paginated<Patient>> {
  const search = new URLSearchParams();
  if (params.nome) search.set("nome", params.nome);
  if (params.cpf) search.set("cpf", params.cpf);
  if (params.status) search.set("status", params.status);
  if (params.regiao) search.set("regiao", params.regiao);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return apiJson<Paginated<Patient>>(
    `/api/pacientes/${query ? `?${query}` : ""}`,
  );
}

export function getPatient(id: number): Promise<Patient> {
  return apiJson<Patient>(`/api/pacientes/${id}/`);
}

/** Endereço aninhado obrigatório no cadastro. */
export interface PatientAddressInput {
  zip_code: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement?: string;
  reference_point?: string;
  region?: string;
}

export interface PatientCreateInput {
  full_name: string;
  birth_date: string;
  cpf: string;
  rg: string;
  age: number;
  phone: string;
  gender: string;
  responsible_doctor: number;
  /** JSON provisório até o módulo de profissionais (TASK-CAD-PAC-005). */
  responsible_team?: unknown;
  health_condition: number;
  address: PatientAddressInput;
}

export function createPatient(input: PatientCreateInput): Promise<Patient> {
  return apiJson<Patient>("/api/pacientes/", { method: "POST", json: input });
}

export type PatientUpdateInput = Partial<
  Omit<
    PatientCreateInput,
    "address" | "responsible_doctor" | "health_condition"
  > & {
    address: Partial<PatientAddressInput>;
    responsible_doctor?: number | null;
    health_condition?: number | null;
  }
>;

export function updatePatient(
  id: number,
  input: PatientUpdateInput,
): Promise<Patient> {
  return apiJson<Patient>(`/api/pacientes/${id}/`, {
    method: "PATCH",
    json: input,
  });
}

/** Ações idempotentes de status (somente gerente). */
export function inativarPaciente(id: number): Promise<Patient> {
  return apiJson<Patient>(`/api/pacientes/${id}/inativar/`, { method: "POST" });
}

export function reativarPaciente(id: number): Promise<Patient> {
  return apiJson<Patient>(`/api/pacientes/${id}/reativar/`, { method: "POST" });
}

export function listMedicos(): Promise<Medico[]> {
  return apiJson<Medico[]>("/api/medicos/");
}

export function isGerente(groups: string[] | undefined): boolean {
  return groups?.includes("GERENTE") ?? false;
}

/** Erros 400 por campo vindos do DRF (`{campo: [msgs]}` ou `{detail}`). */
export function parseFieldErrors(message: string): Record<string, string[]> {
  try {
    const body = JSON.parse(message) as unknown;
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const out: Record<string, string[]> = {};
      for (const [key, value] of Object.entries(
        body as Record<string, unknown>,
      )) {
        out[key] = Array.isArray(value) ? value.map(String) : [String(value)];
      }
      return out;
    }
  } catch {
    // Cai no retorno abaixo: mensagem genérica.
  }
  return { detail: [message] };
}
