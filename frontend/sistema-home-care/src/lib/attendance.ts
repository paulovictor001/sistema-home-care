import { apiJson } from './api';

export interface AttendanceHistory { id: number; actor_name: string; event_type: string; changed_at: string; previous_data: Record<string, unknown>; new_data: Record<string, unknown> }
export interface Attendance { id: number; visit: number; care_description: string; notes: string; created_by: number | null; created_at: string; updated_at: string; history: AttendanceHistory[] }

const url = (visitId: number) => `/api/atendimentos/visitas/${visitId}/`;
export const getAttendance = (visitId: number) => apiJson<Attendance>(url(visitId));
export const createAttendance = (visitId: number, data: Pick<Attendance, 'care_description' | 'notes'>) => apiJson<Attendance>(url(visitId), { method: 'POST', json: data });
export const updateAttendance = (visitId: number, data: Partial<Pick<Attendance, 'care_description' | 'notes'>>) => apiJson<Attendance>(url(visitId), { method: 'PATCH', json: data });
export const finishVisit = (visitId: number) => apiJson<{ id: number; status: 'REALIZADA'; finished_at: string }>(`${url(visitId)}concluir/`, { method: 'POST', json: {} });
