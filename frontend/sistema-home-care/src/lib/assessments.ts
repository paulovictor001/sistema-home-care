import { apiJson } from "./api";
import type { SessionUser } from "../contexts/auth-state";

/** Espelha `assessments.serializers` (read) + catálogos. */
export interface CareNeed {
  id: number;
  need_type: number;
  need_type_name?: string;
  description: string;
  priority: string;
  status: string;
  is_active: boolean;
  inactivated_at: string | null;
  created_at: string;
}

export interface AssessmentResource {
  id: number;
  resource: number;
  resource_name?: string;
  quantity: number;
  observation: string;
  created_at: string;
}

export interface PatientAssessment {
  id: number;
  patient: number;
  professional: number | null;
  assessment_type: string;
  assessment_date: string | null;
  assessment_time: string | null;
  request_origin: string;
  administrative_observations: string;
  request_reason: string;
  chief_complaint: string;
  initial_need_description: string;
  need_start_date: string | null;
  anamnesis: string;
  hda: string;
  current_condition: string;
  observations: string;
  relevant_information: string;
  conclusion: string;
  recommendation: string;
  care_needs: CareNeed[];
  assessment_resources: AssessmentResource[];
  created_at: string;
  updated_at: string;
}

export interface NeedType {
  id: number;
  name: string;
  description: string;
  status: string;
}

export interface ResourceCatalog {
  id: number;
  name: string;
}

/** Item de `GET /api/clinicos/` (equipe clínica ativa). */
export interface Clinico {
  id: number;
  first_name: string;
  last_name: string;
  cpf: string;
}

export function clinicoDisplayName(clinico: Clinico): string {
  const name = `${clinico.first_name} ${clinico.last_name}`.trim();
  return name || `Profissional #${clinico.id}`;
}

/** Resposta paginada padrão do DRF (`PageNumberPagination`). */
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Origem da solicitação (RN-AVL-004, TA-62/TASK-AVL-FE-003, TA-41/MOD-005).
 * Espelha `assessments.models.RequestOrigin` (valores = rótulos, validados
 * no backend); manter sincronizado se o domínio mudar.
 */
export const REQUEST_ORIGINS = [
  "Família",
  "Médico",
  "Hospital",
  "Clínica",
  "Outro",
] as const;

export type RequestOrigin = (typeof REQUEST_ORIGINS)[number];

/** Prioridade da necessidade (RN-AVL-013, TA-64/TASK-AVL-FE-005). */
export const NEED_PRIORITIES = [
  { value: "LOW", label: "Baixa" },
  { value: "MEDIUM", label: "Média" },
  { value: "HIGH", label: "Alta" },
  { value: "URGENT", label: "Urgente" },
] as const;

/** Status inicial exibido como readonly (RN-AVL-014). */
export const NEED_INITIAL_STATUS_LABEL = "Identificada";

/* ---------- Gating defensivo (TA-55 pendente, backend é a verdade) ---------- */

function inGroups(groups: string[] | undefined, ...names: string[]): boolean {
  return groups?.some((g) => names.includes(g)) ?? false;
}

function hasPerm(user: SessionUser | null | undefined, codename: string): boolean {
  return user?.permissions?.includes(codename) ?? false;
}

export function isClinical(groups: string[] | undefined): boolean {
  return inGroups(groups, "MEDICO", "ENFERMEIRO");
}

export function isCareTeam(groups: string[] | undefined): boolean {
  return inGroups(groups, "GERENTE", "MEDICO", "ENFERMEIRO");
}

/** Criação: só Médico/Enfermeiro (RN-AVL-002). Checa grupo OU granular. */
export function canCreateAssessment(user: SessionUser | null | undefined): boolean {
  if (!user) return false;
  return isClinical(user.groups) || hasPerm(user, "avaliacoes.create");
}

/** Edição clínica: Médico/Enfermeiro (RN-AVL-007). Gerente edita só responsável. */
export function canEditAssessment(user: SessionUser | null | undefined): boolean {
  if (!user) return false;
  return (
    isClinical(user.groups) ||
    inGroups(user.groups, "GERENTE") ||
    hasPerm(user, "avaliacoes.update") ||
    hasPerm(user, "avaliacoes.change_professional")
  );
}

/** Visualização: Gerente+Médico+Enfermeiro (RN-AVL-009). */
export function canViewAssessments(user: SessionUser | null | undefined): boolean {
  if (!user) return false;
  return isCareTeam(user.groups) || hasPerm(user, "avaliacoes.view");
}

export function canChangeProfessional(
  user: SessionUser | null | undefined,
): boolean {
  if (!user) return false;
  return (
    isCareTeam(user.groups) || hasPerm(user, "avaliacoes.change_professional")
  );
}

/* ------------------------------- API calls ------------------------------- */

export function listAssessmentsByPatient(
  patientId: number,
  page = 1,
): Promise<Paginated<PatientAssessment>> {
  const search = new URLSearchParams({ patient: String(patientId) });
  if (page > 1) search.set("page", String(page));
  return apiJson<Paginated<PatientAssessment>>(
    `/api/avaliacoes/?${search.toString()}`,
  );
}

export function getAssessment(id: number): Promise<PatientAssessment> {
  return apiJson<PatientAssessment>(`/api/avaliacoes/${id}/`);
}

export interface AssessmentCreateInput {
  patient: number;
  professional: number;
  assessment_date: string;
  assessment_time: string;
  request_reason: string;
  chief_complaint: string;
  request_origin?: string;
  administrative_observations?: string;
  initial_need_description?: string;
  need_start_date?: string | null;
  anamnesis?: string;
  hda?: string;
  current_condition?: string;
  observations?: string;
  relevant_information?: string;
  conclusion?: string;
  recommendation?: string;
}

export function createAssessment(
  input: AssessmentCreateInput,
): Promise<PatientAssessment> {
  return apiJson<PatientAssessment>("/api/avaliacoes/", {
    method: "POST",
    json: input,
  });
}

export type AssessmentUpdateInput = Partial<
  Omit<AssessmentCreateInput, "patient">
>;

export function updateAssessment(
  id: number,
  input: AssessmentUpdateInput,
): Promise<PatientAssessment> {
  return apiJson<PatientAssessment>(`/api/avaliacoes/${id}/`, {
    method: "PATCH",
    json: input,
  });
}

export interface NeedCreateInput {
  need_type: number;
  description: string;
  priority: string;
}

export function addNeed(
  assessmentId: number,
  input: NeedCreateInput,
): Promise<CareNeed> {
  return apiJson<CareNeed>(`/api/avaliacoes/${assessmentId}/necessidades/`, {
    method: "POST",
    json: input,
  });
}

export function inactivateNeed(id: number): Promise<{ id: number; is_active: boolean; inactivated_at: string | null }> {
  return apiJson(`/api/necessidades/${id}/inativar/`, { method: "POST" });
}

export function reactivateNeed(id: number): Promise<{ id: number; is_active: boolean; inactivated_at: string | null }> {
  return apiJson(`/api/necessidades/${id}/reativar/`, { method: "POST" });
}

export interface NeedHistoryEvent {
  id: number;
  action: "INACTIVATE" | "REACTIVATE";
  actor_name: string;
  created_at: string;
  snapshot: CareNeed;
}

export function getNeedHistory(id: number): Promise<NeedHistoryEvent[]> {
  return apiJson(`/api/necessidades/${id}/historico/`);
}

export interface ResourceLinkInput {
  resource: number;
  quantity: number;
  observation?: string;
}

export function addResource(
  assessmentId: number,
  input: ResourceLinkInput,
): Promise<AssessmentResource> {
  return apiJson<AssessmentResource>(
    `/api/avaliacoes/${assessmentId}/recursos/`,
    { method: "POST", json: input },
  );
}

/** Catálogo p/ o select de necessidades (TA-61). Sem paginação. */
export function listNeedTypes(): Promise<NeedType[]> {
  return apiJson<NeedType[]>("/api/tipos-necessidade/");
}

/** Catálogo p/ o select de recursos (TA-63). Sem paginação. */
export function listResources(): Promise<ResourceCatalog[]> {
  return apiJson<ResourceCatalog[]>("/api/recursos/");
}

/** Equipe clínica ativa p/ o select de responsável (completa TA-62/UX). */
export function listClinicos(): Promise<Clinico[]> {
  return apiJson<Clinico[]>("/api/clinicos/");
}
