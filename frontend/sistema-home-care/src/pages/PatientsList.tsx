import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { ApiError } from "../lib/api";
import { formatCpf, stripCpf } from "../lib/cpf";
import {
  isGerente,
  listPatients,
  type Patient,
  type PatientStatusFilter,
} from "../lib/patients";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: PatientStatusFilter; label: string }[] = [
  { value: "ativo", label: "Ativos" },
  { value: "inativo", label: "Inativos" },
  { value: "todos", label: "Todos" },
];

export function PatientsList() {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [status, setStatus] = useState<PatientStatusFilter>("ativo");
  const [regiao, setRegiao] = useState("");
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<Patient[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(
    async (pageToLoad: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listPatients({
          nome: nome.trim() || undefined,
          cpf: stripCpf(cpf) || undefined,
          status,
          regiao: regiao.trim() || undefined,
          page: pageToLoad,
        });
        setResults(data.results);
        setCount(data.count);
        setPage(pageToLoad);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Falha ao carregar pacientes.",
        );
      } finally {
        setLoading(false);
      }
    },
    [nome, cpf, status, regiao],
  );

  useEffect(() => {
    void fetchPage(1);
    // Carrega uma vez na montagem; novas buscas pelo botão filtrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Pacientes</h1>
          <p className="mt-1 text-sm text-gray-600">
            {count} paciente{count === 1 ? "" : "s"} encontrado
            {count === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          >
            Início
          </Link>
          {isGerente(user?.groups) && (
            <Link
              to="/pacientes/novo"
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              Novo paciente
            </Link>
          )}
        </div>
      </div>

      <form
        className="mb-4 grid grid-cols-1 gap-3 rounded-lg bg-white p-4 shadow sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void fetchPage(1);
        }}
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Nome</span>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Buscar por nome"
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">CPF</span>
          <input
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as PatientStatusFilter)}
            className="w-full rounded border border-gray-300 px-3 py-2"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Região</span>
          <input
            value={regiao}
            onChange={(e) => setRegiao(e.target.value)}
            placeholder="Filtrar por região"
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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

      {loading ? (
        <p className="text-sm text-gray-600">Carregando…</p>
      ) : results.length === 0 ? (
        <p className="text-sm text-gray-600">Nenhum paciente encontrado.</p>
      ) : (
        <>
          <ul className="divide-y rounded-lg bg-white shadow">
            {results.map((patient) => (
              <li key={patient.id}>
                <Link
                  to={`/pacientes/${patient.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{patient.full_name}</p>
                    <p className="text-sm text-gray-600">
                      CPF: {formatCpf(patient.cpf)}
                      {patient.address?.region
                        ? ` · ${patient.address.region}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                      patient.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {patient.status === "ACTIVE" ? "Ativo" : "Inativo"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void fetchPage(page - 1)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Anterior
            </button>
            <p className="text-sm text-gray-600">
              Página {page} de {totalPages}
            </p>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => void fetchPage(page + 1)}
              className="rounded border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </>
      )}
    </div>
  );
}
