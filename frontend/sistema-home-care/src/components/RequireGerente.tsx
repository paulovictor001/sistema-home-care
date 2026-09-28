import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { isGerente } from "../lib/patients";

export function RequireGerente({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando sessão…</p>
      </div>
    );
  }
  if (!isGerente(user?.groups)) {
    return <Navigate to="/pacientes" replace />;
  }
  return <>{children}</>;
}
