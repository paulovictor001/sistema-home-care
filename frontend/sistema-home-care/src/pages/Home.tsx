import { useAuth } from "../contexts/useAuth";
import { formatCpf } from "../lib/cpf";

export function Home() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sistema Home Care</h1>
          <p className="mt-1 text-sm text-gray-600">
            CPF: {user ? formatCpf(user.cpf) : "—"}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Perfil: {user?.groups.join(", ") || "—"}
          </p>
        </div>
        <button
          onClick={logout}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
