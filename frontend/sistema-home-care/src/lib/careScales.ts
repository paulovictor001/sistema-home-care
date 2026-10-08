import type { SessionUser } from '../contexts/auth-state';
import { apiJson } from './api';
import type { FrequencyPeriod } from './carePlans';
export type ScaleStatus = 'DRAFT' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type ScaleAction = 'create' | 'update' | 'view' | 'delete' | 'change_status';
export const scaleStatusLabels: Record<ScaleStatus, string> = { DRAFT: 'Rascunho', ACTIVE: 'Ativa', SUSPENDED: 'Suspensa', CLOSED: 'Encerrada' };
export function canScale(user: SessionUser | null, action: ScaleAction): boolean {
  return !!user && (user.groups.includes('GERENTE') || user.permissions.includes(`escalas.${action}`));
}
export interface ScaleAssignment { id: number; professional: number; full_name: string; profession_name: string; removed_at: string | null }
export interface ScaleNeed { id: number; plan_need: number; description: string; need_type: string; required_profession: number | null; planned_quantity: number | null; planned_period: FrequencyPeriod | null; frequency_quantity: number | null; frequency_period: FrequencyPeriod | null; frequency_reason: string; observation: string; removed_at: string | null; assignments: ScaleAssignment[] }
export interface CareScale { id: number; patient: number; patient_name: string; care_plan: number; start_date: string; end_date: string; status: ScaleStatus; observation: string; items: ScaleNeed[] }
export interface ScaleInput { patient: number; care_plan: number; start_date: string; end_date: string; observation: string }
export interface ScalePlanOption { id: number; patient: number; patient_name: string; start_date: string; end_date: string | null; needs: { id: number; care_need__description: string; frequency_quantity: number | null; frequency_period: FrequencyPeriod | null }[] }
const base = '/api/escalas/';
export const listScales = (page = 1, patient?: number) => apiJson<{count: number; next: string | null; results: CareScale[]}>(`${base}?page=${page}${patient ? `&patient=${patient}` : ''}`);
export const getScale = (id: number) => apiJson<CareScale>(`${base}${id}/`);
export const scalePlans = () => apiJson<ScalePlanOption[]>(`${base}planos/`);
export const createScale = (data: ScaleInput) => apiJson<CareScale>(base, {method: 'POST', json: data});
export const updateScale = (id: number, data: Partial<ScaleInput>) => apiJson<CareScale>(`${base}${id}/`, {method: 'PATCH', json: data});
export const deleteScale = (id: number) => apiJson<void>(`${base}${id}/`, {method: 'DELETE'});
export const changeScaleStatus = (id: number, status: ScaleStatus) => apiJson<CareScale>(`${base}${id}/status/`, {method: 'POST', json: {status}});
export interface ScaleProfessional {id: number; full_name: string; profession_name: string; regions: string[]; availability_notes: string; patient_region: string; region_match: boolean | null}
export const addScaleNeed = (id: number, plan_need: number) => apiJson<CareScale>(`${base}${id}/necessidades/`, {method: 'POST', json: {plan_need}});
export const removeScaleNeed = (id: number, item: number) => apiJson<CareScale>(`${base}${id}/necessidades/${item}/remover/`, {method: 'POST'});
export const configureScaleNeed = (id: number, item: number, data: {frequency_quantity: number; frequency_period: FrequencyPeriod; frequency_reason: string; observation: string}) => apiJson<CareScale>(`${base}${id}/necessidades/${item}/configurar/`, {method: 'POST', json: data});
export const scaleProfessionals = (id: number, item: number) => apiJson<ScaleProfessional[]>(`${base}${id}/necessidades/${item}/profissionais-disponiveis/`);
export const addScaleProfessional = (id: number, item: number, professional: number) => apiJson<CareScale>(`${base}${id}/necessidades/${item}/profissionais/`, {method: 'POST', json: {professional}});
export const removeScaleProfessional = (id: number, item: number, assignment: number) => apiJson<CareScale>(`${base}${id}/necessidades/${item}/profissionais/${assignment}/remover/`, {method: 'POST'});
export const substituteScaleProfessional = (id: number, item: number, assignment: number, professional: number) => apiJson<CareScale>(`${base}${id}/necessidades/${item}/profissionais/${assignment}/substituir/`, {method: 'POST', json: {professional}});
export const saveProfessionalPlanning = (professional: number, regions: string[], availability_notes: string) => apiJson<{regions: string[]; availability_notes: string}>(`${base}profissionais/${professional}/planejamento/`, {method: 'PUT', json: {regions, availability_notes}});
export interface ScaleSubstitution {id: number; item: number | null; previous_name: string; new_name: string; actor_name: string; created_at: string}
export interface ScaleAudit {id: number; actor_name: string; action: string; created_at: string; previous_data: unknown; new_data: unknown}
export const scaleSubstitutions = (id: number) => apiJson<ScaleSubstitution[]>(`${base}${id}/substituicoes/`);
export const scaleAudit = (id: number) => apiJson<ScaleAudit[]>(`${base}${id}/historico/`);
