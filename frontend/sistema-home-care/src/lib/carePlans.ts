import type { SessionUser } from '../contexts/auth-state';
import { apiJson } from './api';

export type PlanStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type FrequencyPeriod = 'DAY' | 'WEEK' | 'MONTH';
export const planStatusLabels = { DRAFT: 'Rascunho', ACTIVE: 'Ativo', CLOSED: 'Encerrado' };
export const frequencyLabels = { DAY: 'Dia', WEEK: 'Semana', MONTH: 'Mês' };
export interface PlanResource { id: number; resource: number; resource_name: string; quantity: number; observation: string }
export interface PlanNeed {
  id: number; care_need: number; description: string; priority: string; need_type_name: string;
  required_professional: number | null; professional_name: string | null;
  frequency_quantity: number | null; frequency_period: FrequencyPeriod | null;
  resources: PlanResource[]; removed_at: string | null; removal_reason: string; removed_by: number | null;
}
export interface CarePlan {
  id: number; patient: number; patient_name: string; status: PlanStatus;
  start_date: string; end_date: string | null; objective: string;
  created_at: string; updated_at: string; need_links: PlanNeed[];
}
export interface AvailableNeed { id: number; description: string; priority: string; assessment_id: number; need_type__name: string }
export interface PlanHistory { id: number; changed_by: number | null; changed_at: string; description: string }
export function canPlan(user: SessionUser | null, action: string): boolean {
  if (!['view', 'create', 'update', 'activate', 'close', 'reactivate'].includes(action)) return false;
  const roles = action === 'view' ? ['GERENTE', 'MEDICO', 'ENFERMEIRO']
    : ['close', 'reactivate'].includes(action) ? ['MEDICO', 'ENFERMEIRO'] : ['MEDICO'];
  return !!user && user.groups.some(group => roles.includes(group)) && user.permissions.includes(`planos_cuidados.${action}`);
}
const base = '/api/planos-cuidados/';
export const getPlan = (id: number) => apiJson<CarePlan>(`${base}${id}/`);
export const listPlans = (patient: number, page = 1) => apiJson<{ count: number; next: string | null; results: CarePlan[] }>(`${base}?patient=${patient}&page=${page}`);
export const availableNeeds = (patient: number) => apiJson<AvailableNeed[]>(`${base}necessidades-disponiveis/?patient=${patient}`);
export const createPlan = (data: { patient: number; start_date: string; end_date: string | null; objective: string; needs: number[] }) => apiJson<CarePlan>(base, { method: 'POST', json: data });
export const updatePlan = (id: number, data: { start_date: string; end_date: string | null; objective: string }) => apiJson<CarePlan>(`${base}${id}/`, { method: 'PATCH', json: data });
export const planHistory = (id: number) => apiJson<PlanHistory[]>(`${base}${id}/historico/`);
export interface PlanProfessional { id: number; full_name: string; profession__name: string; is_active: boolean }
export interface CatalogResource { id: number; name: string }
export interface NeedConfiguration {
  required_professional: number; frequency_quantity: number; frequency_period: FrequencyPeriod;
  resources: { resource: number; quantity: number; observation: string }[];
}
export const planProfessionals = () => apiJson<PlanProfessional[]>(`${base}profissionais/`);
export const planResources = () => apiJson<CatalogResource[]>(`${base}recursos/`);
export const configurePlanNeed = (plan: number, link: number, data: NeedConfiguration) => apiJson<CarePlan>(`${base}${plan}/necessidades/${link}/configurar/`, { method: 'POST', json: data });
export const attachPlanNeed = (plan: number, need: number) => apiJson<CarePlan>(`${base}${plan}/necessidades/`, { method: 'POST', json: { care_need: need } });
export const removePlanNeed = (plan: number, link: number, reason: string) => apiJson<CarePlan>(`${base}${plan}/necessidades/${link}/remover/`, { method: 'POST', json: { reason: reason.trim() } });
export type PlanStatusAction = 'ativar' | 'encerrar' | 'reativar';
export const statusActionLabels = { ativar: 'Ativar', encerrar: 'Encerrar', reativar: 'Reativar' };
export function allowedStatusActions(user: SessionUser | null, status: PlanStatus): PlanStatusAction[] {
  if (status === 'DRAFT' && canPlan(user, 'activate')) return ['ativar'];
  if (status === 'ACTIVE' && canPlan(user, 'close')) return ['encerrar'];
  if (status === 'CLOSED' && canPlan(user, 'reactivate')) return ['reativar'];
  return [];
}
export const changePlanStatus = (plan: number, action: PlanStatusAction) => apiJson<CarePlan>(`${base}${plan}/${action}/`, { method: 'POST' });
