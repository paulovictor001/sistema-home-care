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
  { value: "todos", label: "Todos" },
];

function displayName(user: ManagedUser): string {
  const name = `${user.first_name} ${user.last_name}`.trim();
  return name || user.professional_detail?.full_name || `Usuário #${user.id}`;
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
        setError(err instanceof ApiError ? err.message : "Falha ao carregar usuários.");
      } finally {
        setLoading(false);
      }
    },
    [nome, cpf, status, categoria],
  );

  useEffect(() => {
    void fetchPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const from = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, count);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Mostrando {from}–{to} de {count} registro{count === 1 ? "" : "s"}
        </p>
        <Link
          to="/usuarios/novo"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Adicionar Usuário
        </Link>
      </div>

      <form
        className="mb-4 grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={(e) => {
          e.preventDefault();
          void fetchPage(1);
        }}
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Nome</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Buscar por nome"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">CPF</span>
          <input
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Categoria</span>
          <input
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Filtrar por categoria"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as UserStatusFilter)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Buscando…" : "Filtrar"}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl bg-white shadow">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase">
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Usuário / Profissional</th>
              <th className="px-4 py-3 font-semibold">CPF</th>
              <th className="px-4 py-3 font-semibold">Categoria</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Carregando…
                </td>
              </tr>
            ) : results.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              results.map((user, index) => (
                <tr
                  key={user.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-3 text-slate-500">
                    {(page - 1) * PAGE_SIZE + index + 1}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{displayName(user)}</p>
                    <p className="text-xs text-slate-500">
                      {user.professional_detail
                        ? `${user.professional_detail.full_name} · ${user.professional_detail.profession.name}`
                        : "Sem profissional"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatCpf(user.cpf)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {user.category_detail?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {user.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/usuarios/${user.id}`}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          disabled={page <= 1 || loading}
          onClick={() => void fetchPage(page - 1)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Anterior
        </button>
        <p className="text-sm text-slate-500">
          Página {page} de {totalPages}
        </p>
        <button
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() => void fetchPage(page + 1)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
