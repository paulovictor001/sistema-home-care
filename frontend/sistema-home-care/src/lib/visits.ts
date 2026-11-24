import { apiJson } from './api';
import type { SessionUser } from '../contexts/auth-state';

export type VisitStatus = 'AGENDADA' | 'CONFIRMADA' | 'EM_ATENDIMENTO' | 'REALIZADA' | 'CANCELADA' | 'NAO_REALIZADA';
export interface VisitAddress { zip_code: string; state: string; city: string; neighborhood: string; street: string; number: string; complement: string; reference_point: string; region: string }
export interface VisitHistory { id: number; actor_name: string; event_type: string; changed_at: string; previous_data: Record<string, unknown>; new_data: Record<string, unknown> }
export interface Visit { id: number; patient: number; patient_name: string; care_plan: number; plan_need: number; plan_need_description: string; care_scale: number; scale_need: number; professional: number; professional_name: string; visit_date: string; start_time: string; end_time: string; visit_type: string; status: VisitStatus; observation: string; address: VisitAddress; cancellation_reason: string; not_realized_reason: string; confirmed_at: string | null; started_at: string | null; finished_at: string | null; started_by: number | null; finished_by: number | null; created_by_name: string | null; history: VisitHistory[] }
export interface VisitDraft { care_scale: number; scale_need: number; professional: number; visit_date?: string; visit_dates?: string[]; start_time: string; end_time: string; observation: string; visit_type: string }
export interface Availability { id?: number; weekday: number; start_time: string; end_time: string }
export const statusLabels: Record<VisitStatus, string> = { AGENDADA: 'Agendada', CONFIRMADA: 'Confirmada', EM_ATENDIMENTO: 'Em atendimento', REALIZADA: 'Realizada', CANCELADA: 'Cancelada', NAO_REALIZADA: 'Não realizada' };
export const canVisit = (user: SessionUser | null, action: 'create' | 'view' | 'update' | 'delete' | 'confirm' | 'cancel' | 'not_realized' | 'start' | 'finish') => !!user && (user.is_superuser || user.permissions.includes(['confirm', 'cancel', 'not_realized', 'start', 'finish'].includes(action) ? `visitas.${action}` : `agendamentos.${action}`));
const base = '/api/agendamentos/';
export const listVisits = (filters: { patient?: string; status?: string; from?: string; to?: string } = {}) => apiJson<{results: Visit[]}>(`${base}?${new URLSearchParams(Object.entries(filters).filter(([, value]) => !!value) as [string, string][]).toString()}`);
export const getVisit = (id: number) => apiJson<Visit>(`${base}${id}/`);
export const createVisit = (data: VisitDraft) => apiJson<Visit | {created: Visit[]; rejected: {visit_date: string; errors: unknown}[]}>(base, {method: 'POST', json: data});
export const editVisit = (id: number, data: Partial<Pick<Visit, 'visit_date' | 'start_time' | 'end_time' | 'observation' | 'address'>>) => apiJson<Visit>(`${base}${id}/`, {method: 'PATCH', json: data});
export const transitionVisit = (id: number, status: VisitStatus, reason = '') => apiJson<Visit>(`${base}${id}/status/`, {method: 'POST', json: {status, reason}});
export const getAvailability = (professional: number) => apiJson<Availability[]>(`${base}profissionais/${professional}/agenda/`);
export const saveAvailability = (professional: number, windows: Availability[]) => apiJson<Availability[]>(`${base}profissionais/${professional}/agenda/`, {method: 'PUT', json: windows});
