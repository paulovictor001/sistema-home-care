import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { ApiError } from "../lib/api";
import { isGerente, listPatients } from "../lib/patients";

interface DashboardCounts {
  total: number;
  ativos: number;
  inativos: number;
}

export function Home() {
  const { user } = useAuth();
  const gerente = isGerente(user?.groups);
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  const firstName = user?.first_name?.trim() || "bem-vindo";

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      try {
        const [todos, ativos, inativos] = await Promise.all([
          listPatients({ status: "todos" }),
          listPatients({ status: "ativo" }),
          listPatients({ status: "inativo" }),
        ]);
        if (!cancelled) {
          setCounts({
            total: todos.count,
            ativos: ativos.count,
            inativos: inativos.count,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Falha ao carregar resumo.",
          );
        }
      }
    }
    void loadCounts();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards: { label: string; value: number | string; accent: string }[] = [
    {
      label: "Total de pacientes",
      value: counts?.total ?? "…",
      accent: "border-blue-600",
    },
    {
      label: "Pacientes ativos",
      value: counts?.ativos ?? "…",
      accent: "border-green-600",
    },
    {
      label: "Pacientes inativos",
      value: counts?.inativos ?? "…",
      accent: "border-slate-400",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-slate-500">
        Olá, {firstName}. Este é o resumo do sistema.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border-l-4 bg-white p-5 shadow ${card.accent}`}
          >
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          to="/pacientes"
          className="rounded-xl bg-white p-5 shadow hover:shadow-md"
        >
          <h2 className="text-lg font-semibold text-slate-900">Pacientes</h2>
          <p className="mt-1 text-sm text-slate-500">
            Buscar, filtrar e visualizar pacientes cadastrados.
          </p>
          <span className="mt-3 inline-block rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white">
            Abrir lista
          </span>
        </Link>

        {gerente && (
          <Link
            to="/pacientes/novo"
            className="rounded-xl bg-white p-5 shadow hover:shadow-md"
          >
            <h2 className="text-lg font-semibold text-slate-900">
              Cadastrar Paciente
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Cadastrar um novo paciente com endereço e médico responsável.
            </p>
            <span className="mt-3 inline-block rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white">
              + Adicionar paciente
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
