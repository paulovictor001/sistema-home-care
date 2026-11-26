import { apiJson } from "./api";

/** Espelha `patients.serializers.PatientSerializer` (read). */
export interface PatientAddress {
  zip_code: string;
  state: string;
  city: string;
  neighborhood: string;
  neighborhood_id?: number | null;
  region_id?: number | null;
  legacy_region?: string;
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
  responsible_doctor_name: string | null;
  responsible_team: number | null;
  responsible_team_name: string | null;
  health_condition: string;
  allergies: string;
  restrictions: string;
  special_needs: string;
  important_observations: string;
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
  neighborhood_id?: number | null;
  street: string;
  number: string;
  complement?: string;
  reference_point?: string;
}

export interface ManagedRegion { id: number; name: string; is_active: boolean; neighborhood_count?: number }
export interface ManagedNeighborhood { id: number; region: number; region_name: string; state: string; city: string; name: string; is_active: boolean }
export const listRegions = () => apiJson<ManagedRegion[]>('/api/regioes/');
export const listNeighborhoods = (state?: string, city?: string) => { const q = new URLSearchParams(); if (state) q.set('state', state); if (city) q.set('city', city); return apiJson<ManagedNeighborhood[]>(`/api/bairros/${q.size ? `?${q}` : ''}`); };

export interface PatientCreateInput {
  full_name: string;
  birth_date: string;
  cpf: string;
  rg: string;
  age: number;
  phone: string;
  gender: string;
  responsible_doctor: number;
  responsible_team?: number | null;
  health_condition: string;
  allergies?: string;
  restrictions?: string;
  special_needs?: string;
  important_observations?: string;
  address: PatientAddressInput;
}

export function createPatient(input: PatientCreateInput): Promise<Patient> {
  return apiJson<Patient>("/api/pacientes/", { method: "POST", json: input });
}

export type PatientUpdateInput = Partial<
  Omit<
    PatientCreateInput,
    "address" | "responsible_doctor"
  > & {
    address: Partial<PatientAddressInput>;
    responsible_doctor?: number | null;
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

export interface Team { id: number; name: string; is_active: boolean; professionals: number[]; members: {id:number; name:string; profession:string}[] }
export function listTeams(): Promise<Team[]> { return apiJson<Team[]>('/api/equipes/'); }

export function isGerente(groups: string[] | undefined): boolean {
  return groups?.includes("GERENTE") ?? false;
}

export interface PatientAccessUser {
  groups: string[];
  permissions: string[];
}

export function canViewPatients(user: PatientAccessUser | null | undefined): boolean {
  return !!user && user.groups.some((group) => ["GERENTE", "MEDICO", "ENFERMEIRO"].includes(group))
    && user.permissions.includes("pacientes.view");
}

export function canUpdatePatientClinically(user: PatientAccessUser | null | undefined): boolean {
  return !!user && user.groups.some((group) => ["GERENTE", "MEDICO", "ENFERMEIRO"].includes(group))
    && user.permissions.includes("pacientes.update_clinical");
}

export function canManagePatientAssignments(user: PatientAccessUser | null | undefined): boolean {
  return isGerente(user?.groups) && !!user?.permissions.includes("pacientes.update_manager");
}

/** Erros 400 por campo vindos do DRF (`{campo: [msgs]}` ou `{detail}`). */
export function parseFieldErrors(message: string): Record<string, string[]> {
  function extractMessages(value: unknown): string[] {
    if (typeof value === "string" || typeof value === "number") {
      return [String(value)];
    }

    if (Array.isArray(value)) {
      return value.flatMap(extractMessages);
    }

    if (value && typeof value === "object") {
      return Object.values(value).flatMap(extractMessages);
    }

    return [];
  }

  try {
    const body = JSON.parse(message) as unknown;

    if (body && typeof body === "object" && !Array.isArray(body)) {
      const out: Record<string, string[]> = {};

      for (const [key, value] of Object.entries(
        body as Record<string, unknown>,
      )) {
        out[key] = extractMessages(value);
      }

      return out;
    }
  } catch {
    // Retorna a mensagem genérica abaixo.
  }

  return { detail: [message] };
}
