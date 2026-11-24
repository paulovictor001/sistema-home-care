import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../lib/api";
import { formatCpf, stripCpf } from "../lib/cpf";
import {
  listUsers,
  type ManagedUser,
  type UserStatusFilter,
} from "../lib/users";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: UserStatusFilter; label: string }[] = [
  { value: "ativo", label: "Ativos" },
  { value: "inativo", label: "Inativos" },
  { value: "todos", label: "Todos os status" },
];

const inputClass =
  "min-h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink outline-none transition placeholder:text-muted/80 focus:border-primary focus:ring-2 focus:ring-primary/15";

function displayName(user: ManagedUser): string {
  const name = `${user.first_name} ${user.last_name}`.trim();
  return name || user.professional_detail?.full_name || `Usuário #${user.id}`;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("pt-BR") ?? "")
    .join("");
}

function UserStatus({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active ? "bg-primary-light text-primary" : "bg-background text-muted"
      }`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-primary" : "bg-muted"}`}
      />
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

function UserIdentity({ user }: { user: ManagedUser }) {
  const name = displayName(user);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold tracking-wide text-primary">
        {initialsOf(name) || "U"}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ink">{name}</span>
        <span className="mt-0.5 block truncate text-xs text-muted">
          {user.professional_detail
            ? `${user.professional_detail.full_name} · ${user.professional_detail.profession.name}`
            : user.email}
        </span>
      </span>
    </div>
  );
}

export function UsersList() {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [status, setStatus] = useState<UserStatusFilter>("ativo");
  const [categoria, setCategoria] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<ManagedUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageToLoad: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listUsers({
          nome: nome.trim() || undefined,
          cpf: stripCpf(cpf) || undefined,
          status,
          categoria: categoria.trim() || undefined,
          page: pageToLoad,
        });
        setResults(data.results);
        setCount(data.count);
        setPage(pageToLoad);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Falha ao carregar usuários.",
        );
      } finally {
        setLoading(false);
      }
    },
    [nome, cpf, status, categoria],
  );

  useEffect(() => {
    void fetchPage(1);
    // A busca inicial deve ocorrer uma vez; filtros são aplicados pelo formulário.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);
  const hasFilters = Boolean(nome || cpf || categoria || status !== "ativo");

  function clearFilters() {
    setNome("");
    setCpf("");
    setCategoria("");
    setStatus("ativo");
    setLoading(true);
    setError(null);
    void listUsers({ status: "ativo", page: 1 })
      .then((data) => {
        setResults(data.results);
        setCount(data.count);
        setPage(1);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError ? err.message : "Falha ao carregar usuários.",
        );
      })
      .finally(() => setLoading(false));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-primary">Administração</p>
          <h2 className="text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
            Usuários
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted">
            Gerencie os acessos e consulte os profissionais vinculados ao sistema.
          </p>
        </div>
        <Link
          to="/usuarios/novo"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:outline-offset-4"
        >
          <span aria-hidden="true" className="text-lg leading-none">+</span>
          Adicionar usuário
        </Link>
      </section>

      <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void fetchPage(1);
          }}
          className="p-4 sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">Buscar usuários</h3>
              <p className="mt-0.5 text-xs text-muted">
                Filtre por nome, CPF, categoria ou situação do cadastro.
              </p>
            </div>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="min-h-9 rounded-md px-2 text-sm font-medium text-primary transition hover:bg-primary-light"
              >
                Limpar filtros
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_0.9fr_auto] lg:items-end">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink">Nome</span>
              <input
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                placeholder="Buscar pelo nome"
                autoComplete="off"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink">CPF</span>
              <input
                value={cpf}
                onChange={(event) => setCpf(formatCpf(event.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="off"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink">Categoria</span>
              <input
                value={categoria}
                onChange={(event) => setCategoria(event.target.value)}
                placeholder="Ex.: Gerente"
                autoComplete="off"
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-ink">Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as UserStatusFilter)}
                className={inputClass}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? "Buscando…" : "Filtrar"}
            </button>
          </div>
        </form>

        <div className="flex flex-col gap-1 border-t border-line bg-background/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm font-medium text-ink" aria-live="polite">
            {loading ? "Atualizando lista…" : `${count} usuário${count === 1 ? "" : "s"}`}
          </p>
          <p className="text-xs text-muted">
            {count > 0 ? `Exibindo ${from}–${to} de ${count} registros` : "Resultados da busca"}
          </p>
        </div>

        {error && (
          <div role="alert" className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 sm:m-5">
            <p className="text-sm font-semibold text-red-800">Não foi possível carregar os usuários</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => void fetchPage(page)}
              className="mt-2 text-sm font-semibold text-red-800 underline underline-offset-2"
            >
              Tentar novamente
            </button>
          </div>
        )}

        <div className="md:hidden">
          {loading ? (
            <div className="space-y-3 p-4" aria-label="Carregando usuários" aria-busy="true">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-28 animate-pulse rounded-lg bg-background" />
              ))}
            </div>
          ) : results.length === 0 && !error ? (
            <div className="px-5 py-12 text-center">
              <p className="font-semibold text-ink">Nenhum usuário encontrado</p>
              <p className="mt-1 text-sm text-muted">Tente ajustar os filtros e faça uma nova busca.</p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {results.map((user) => (
                <li key={user.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <UserIdentity user={user} />
                    <UserStatus active={user.is_active} />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="min-w-0 text-xs text-muted">
                      <p className="truncate">CPF <span className="font-medium text-ink">{formatCpf(user.cpf)}</span></p>
                      <p className="mt-1 truncate">Categoria <span className="font-medium text-ink">{user.category_detail?.name ?? "Não informada"}</span></p>
                    </div>
                    <Link
                      to={`/usuarios/${user.id}`}
                      aria-label={`Ver detalhes de ${displayName(user)}`}
                      className="shrink-0 rounded-md px-2 py-1 text-sm font-semibold text-primary transition hover:bg-primary-light"
                    >
                      Detalhes <span aria-hidden="true">→</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-background/60 text-xs uppercase tracking-wide text-muted">
              <tr className="border-y border-line">
                <th scope="col" className="w-16 px-5 py-3.5 font-semibold">Nº</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Usuário</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">CPF</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Categoria</th>
                <th scope="col" className="px-5 py-3.5 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3.5 text-right font-semibold">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-muted" aria-live="polite">
                    Carregando usuários…
                  </td>
                </tr>
              ) : results.length === 0 && !error ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <p className="font-semibold text-ink">Nenhum usuário encontrado</p>
                    <p className="mt-1 text-sm text-muted">Ajuste os filtros para tentar novamente.</p>
                  </td>
                </tr>
              ) : (
                results.map((user, index) => (
                  <tr key={user.id} className="border-b border-line last:border-0 transition-colors hover:bg-background/70">
                    <td className="px-5 py-3.5 text-xs tabular-nums text-muted">
                      {String((page - 1) * PAGE_SIZE + index + 1).padStart(2, "0")}
                    </td>
                    <td className="px-5 py-3.5"><UserIdentity user={user} /></td>
                    <td className="px-5 py-3.5 tabular-nums text-ink">{formatCpf(user.cpf)}</td>
                    <td className="px-5 py-3.5 text-ink">{user.category_detail?.name ?? "—"}</td>
                    <td className="px-5 py-3.5"><UserStatus active={user.is_active} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/usuarios/${user.id}`}
                        aria-label={`Ver detalhes de ${displayName(user)}`}
                        className="inline-flex min-h-9 items-center rounded-lg border border-line px-3 text-xs font-semibold text-ink transition hover:border-primary/30 hover:bg-primary-light hover:text-primary"
                      >
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <nav
          aria-label="Paginação de usuários"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5"
        >
          <p className="text-xs text-muted">Página {page} de {totalPages}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void fetchPage(page - 1)}
              className="min-h-10 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-45"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => void fetchPage(page + 1)}
              className="min-h-10 rounded-lg border border-line bg-surface px-3 text-sm font-medium text-ink transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-45"
            >
              Próxima
            </button>
          </div>
        </nav>
      </section>
    </div>
  );
}
