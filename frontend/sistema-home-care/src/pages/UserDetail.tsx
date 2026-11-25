import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../lib/api";
import { formatCpf } from "../lib/cpf";
import { formatPhone } from "../lib/phone";
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
          toast.error(err instanceof ApiError ? err.message : "Falha ao carregar usuário.");
          setError(
            err instanceof ApiError
              ? err.message
              : "Falha ao carregar usuário.",
          );
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
      toast.success("Status do usuário atualizado.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Operação falhou.");
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
      toast.success("Usuário excluído com sucesso.");
      navigate("/usuarios");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Exclusão falhou.");
      setError(err instanceof ApiError ? err.message : "Exclusão falhou.");
      setActing(false);
      setConfirmDelete(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-sm text-muted">
        Carregando dados do usuário...
      </div>
    );
  }

  if (error && !user) {
    return (
      <div
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
      >
        <p className="font-semibold">Não foi possível carregar o usuário</p>
        <p className="mt-1">{error}</p>
        <Link
          to="/usuarios"
          className="mt-3 inline-block font-medium underline"
        >
          Voltar para usuários
        </Link>
      </div>
    );
  }

  if (!user) return null;

  const fullName =
    `${user.first_name} ${user.last_name}`.trim() || `Usuário #${user.id}`;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/usuarios"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Voltar para usuários
        </Link>

        <Link
          to={`/usuarios/${user.id}/editar`}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-background"
        >
          Editar usuário
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Detalhes do usuário</p>
            <h2 className="mt-1 text-xl font-semibold text-ink">{fullName}</h2>
            <p className="mt-1 text-sm text-muted">Cadastro #{user.id}</p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              user.is_active
                ? "bg-green-100 text-green-800"
                : "bg-line text-ink"
            }`}
          >
            {user.is_active ? "Ativo" : "Inativo"}
          </span>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h3 className="font-semibold text-ink">Dados de acesso</h3>
          <p className="mt-1 text-sm text-muted">
            Informações de identificação e acesso ao sistema.
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              CPF
            </dt>
            <dd className="mt-1 break-words text-sm font-medium text-ink">
              {formatCpf(user.cpf)}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              E-mail
            </dt>
            <dd className="mt-1 break-words text-sm font-medium text-ink">
              {user.email}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Telefone</dt>
            <dd className="mt-1 break-words text-sm font-medium text-ink">{user.phone ? formatPhone(user.phone) : "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h3 className="font-semibold text-ink">Dados pessoais</h3>
          <p className="mt-1 text-sm text-muted">
            Categoria associada ao usuário.
          </p>
        </div>

        <dl>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Categoria
            </dt>
            <dd className="mt-1 text-sm font-medium text-ink">
              {user.category_detail?.name ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h3 className="font-semibold text-ink">Vínculo profissional</h3>
          <p className="mt-1 text-sm text-muted">
            Informações do profissional associado ao cadastro.
          </p>
        </div>

        <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Profissional
            </dt>
            <dd className="mt-1 break-words text-sm font-medium text-ink">
              {user.professional_detail?.full_name ?? "—"}
            </dd>
          </div>

          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">
              Profissão
            </dt>
            <dd className="mt-1 break-words text-sm font-medium text-ink">
              {user.professional_detail?.profession.name ?? "—"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h3 className="font-semibold text-ink">Ações do usuário</h3>
          <p className="mt-1 text-sm text-muted">
            Gerencie a situação ou a exclusão deste cadastro.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {user.is_active ? (
            <button
              type="button"
              disabled={acting}
              onClick={() => void run(() => inativarUser(user.id))}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Inativar usuário
            </button>
          ) : (
            <button
              type="button"
              disabled={acting}
              onClick={() => void run(() => reativarUser(user.id))}
              className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reativar usuário
            </button>
          )}

          {!confirmDelete ? (
            <button
              type="button"
              disabled={acting}
              onClick={() => setConfirmDelete(true)}
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Excluir definitivamente
            </button>
          ) : (
            <div className="flex w-full flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <span className="flex-1">
                Essa ação excluirá o usuário e o profissional associado. Deseja
                continuar?
              </span>

              <button
                type="button"
                disabled={acting}
                onClick={() => void handleDelete()}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {acting ? "Excluindo..." : "Sim, excluir"}
              </button>

              <button
                type="button"
                disabled={acting}
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-red-300 px-3 py-2 text-xs font-medium hover:bg-red-100 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
