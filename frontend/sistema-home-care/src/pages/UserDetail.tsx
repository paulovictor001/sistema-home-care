import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../lib/api";
import { formatCpf } from "../lib/cpf";
import {
  deleteUser,
  getUser,
  inativarUser,
  reativarUser,
  type ManagedUser,
} from "../lib/users";

export function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<ManagedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getUser(Number(id));
        if (!cancelled) setUser(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Falha ao carregar usuário.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function run(action: () => Promise<ManagedUser>) {
    setActing(true);
    setError(null);
    try {
      const updated = await action();
      setUser(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Operação falhou.");
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    setActing(true);
    try {
      await deleteUser(user.id);
      navigate("/usuarios");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Exclusão falhou.");
      setActing(false);
      setConfirmDelete(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Carregando…</p>;
  if (error && !user) return <p role="alert" className="text-sm text-red-600">{error}</p>;
  if (!user) return null;

  const fullName =
    `${user.first_name} ${user.last_name}`.trim() || `Usuário #${user.id}`;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <Link to="/usuarios" className="text-sm text-primary hover:underline">
          ← Voltar
        </Link>
        <Link
          to={`/usuarios/${user.id}/editar`}
          className="rounded-lg border border-line bg-surface px-3 py-1.5 text-sm hover:bg-line"
        >
          Editar
        </Link>
      </div>

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="rounded-xl bg-surface p-5 shadow">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{fullName}</h2>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              user.is_active
                ? "bg-green-100 text-green-800"
                : "bg-line text-ink"
            }`}
          >
            {user.is_active ? "Ativo" : "Inativo"}
          </span>
        </div>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted">CPF</dt>
            <dd className="text-ink">{formatCpf(user.cpf)}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted">E-mail</dt>
            <dd className="text-ink">{user.email}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted">Categoria</dt>
            <dd className="text-ink">{user.category_detail?.name ?? "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-28 shrink-0 text-muted">Profissional</dt>
            <dd className="text-ink">
              {user.professional_detail
                ? `${user.professional_detail.full_name} · ${user.professional_detail.profession.name}`
                : "—"}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          {user.is_active ? (
            <button
              type="button"
              disabled={acting}
              onClick={() => void run(() => inativarUser(user.id))}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              Inativar (profissional junto)
            </button>
          ) : (
            <button
              type="button"
              disabled={acting}
              onClick={() => void run(() => reativarUser(user.id))}
              className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm text-green-800 hover:bg-green-100 disabled:opacity-50"
            >
              Reativar (profissional junto)
            </button>
          )}
          {!confirmDelete ? (
            <button
              type="button"
              disabled={acting}
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              Excluir definitivamente
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700">
              Exclui o usuário e o profissional. Confirmar?
              <button
                type="button"
                disabled={acting}
                onClick={() => void handleDelete()}
                className="rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Sim, excluir
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => setConfirmDelete(false)}
                className="rounded border border-red-300 px-2 py-0.5 text-xs hover:bg-red-100"
              >
                Cancelar
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
