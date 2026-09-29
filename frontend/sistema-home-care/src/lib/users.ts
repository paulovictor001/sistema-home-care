import { apiJson } from "./api";
import type { Paginated } from "./patients";

export interface GranularPermission {
  id: number;
  feature: string;
  action: string;
  codename: string;
  description: string;
}

export interface Category {
  id: number;
  name: string;
  permissions: GranularPermission[];
  users_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Profession {
  id: number;
  name: string;
  is_active: boolean;
  professionals_count?: number;
  created_at: string;
  updated_at: string;
}

export interface ProfessionalDetail {
  id: number;
  full_name: string;
  profession: Profession;
  is_active: boolean;
}

export interface FreeProfessional {
  id: number;
  full_name: string;
  profession__id: number;
  profession__name: string;
}

export interface ManagedUser {
  id: number;
  cpf: string;
  email: string;
  first_name: string;
  last_name: string;
  category: number;
  category_detail: Category | null;
  professional_detail: ProfessionalDetail | null;
  is_active: boolean;
  date_joined: string;
}

export type UserStatusFilter = "ativo" | "inativo" | "todos";

export interface UserListParams {
  nome?: string;
  cpf?: string;
  status?: UserStatusFilter;
  categoria?: string;
  page?: number;
}

export function listUsers(params: UserListParams = {}): Promise<Paginated<ManagedUser>> {
  const search = new URLSearchParams();
  if (params.nome) search.set("nome", params.nome);
  if (params.cpf) search.set("cpf", params.cpf);
  if (params.status) search.set("status", params.status);
  if (params.categoria) search.set("categoria", params.categoria);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const query = search.toString();
  return apiJson<Paginated<ManagedUser>>(`/api/usuarios/${query ? `?${query}` : ""}`);
}

export function getUser(id: number): Promise<ManagedUser> {
  return apiJson<ManagedUser>(`/api/usuarios/${id}/`);
}

export interface ProfessionalInlineInput {
  full_name: string;
  profession: number;
}

export interface UserCreateInput {
  cpf: string;
  password: string;
  email: string;
  first_name?: string;
  last_name?: string;
  category: number;
  professional_id?: number;
  professional?: ProfessionalInlineInput;
}

export function createUser(input: UserCreateInput): Promise<ManagedUser> {
  return apiJson<ManagedUser>("/api/usuarios/", { method: "POST", json: input });
}

export interface UserUpdateInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
}

export function updateUser(id: number, input: UserUpdateInput): Promise<ManagedUser> {
  return apiJson<ManagedUser>(`/api/usuarios/${id}/`, { method: "PATCH", json: input });
}

export function inativarUser(id: number): Promise<ManagedUser> {
  return apiJson<ManagedUser>(`/api/usuarios/${id}/inativar/`, { method: "POST" });
}

export function reativarUser(id: number): Promise<ManagedUser> {
  return apiJson<ManagedUser>(`/api/usuarios/${id}/reativar/`, { method: "POST" });
}

export function deleteUser(id: number): Promise<void> {
  return apiJson<void>(`/api/usuarios/${id}/`, { method: "DELETE" });
}

export function listCategories(): Promise<Paginated<Category>> {
  return apiJson<Paginated<Category>>("/api/categorias/?page_size=100");
}

export function createCategory(name: string): Promise<Category> {
  return apiJson<Category>("/api/categorias/", { method: "POST", json: { name } });
}

export function deleteCategory(id: number): Promise<void> {
  return apiJson<void>(`/api/categorias/${id}/`, { method: "DELETE" });
}

export function setCategoryPermissions(
  id: number,
  permission_ids: number[],
): Promise<Category> {
  return apiJson<Category>(`/api/categorias/${id}/permissoes/`, {
    method: "PUT",
    json: { permission_ids },
  });
}

export function listProfessions(): Promise<Paginated<Profession>> {
  return apiJson<Paginated<Profession>>("/api/profissoes/?page_size=100");
}

export function createProfession(name: string): Promise<Profession> {
  return apiJson<Profession>("/api/profissoes/", { method: "POST", json: { name } });
}

export function updateProfession(
  id: number,
  input: Partial<Pick<Profession, "name" | "is_active">>,
): Promise<Profession> {
  return apiJson<Profession>(`/api/profissoes/${id}/`, { method: "PATCH", json: input });
}

export function deleteProfession(id: number): Promise<void> {
  return apiJson<void>(`/api/profissoes/${id}/`, { method: "DELETE" });
}

export function transferProfession(
  id: number,
  to_profession_id: number,
): Promise<{ transferidos: number; para_profissao: number }> {
  return apiJson(`/api/profissoes/${id}/transferir/`, {
    method: "POST",
    json: { to_profession_id },
  });
}

export function listPermissions(): Promise<Paginated<GranularPermission>> {
  return apiJson<Paginated<GranularPermission>>("/api/permissoes/?page_size=200");
}

export function listFreeProfessionals(): Promise<FreeProfessional[]> {
  return apiJson<FreeProfessional[]>("/api/profissionais-livres/");
}
