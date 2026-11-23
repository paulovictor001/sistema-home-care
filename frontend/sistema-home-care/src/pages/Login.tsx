import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { ApiError } from "../lib/api";
import { formatCpf } from "../lib/cpf";

export function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(cpf, password);
      const from =
        (location.state as { from?: string } | null)?.from ?? "/";
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? "CPF ou senha inválidos." : "Falha de conexão.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 text-ink sm:px-6 lg:px-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-line bg-white shadow-[0_24px_70px_-38px_rgba(23,59,58,0.32)] md:min-h-[570px] md:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-sidebar p-10 text-white md:flex lg:p-14">
          <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-white/10" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold tracking-wide text-white ring-1 ring-inset ring-white/15">HC</span>
              <span className="text-lg font-semibold tracking-tight">Sistema Home Care</span>
            </div>
            <div className="mt-24 max-w-sm">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#BBD8CA]">Sistema Home Care</p>
              <h1 className="text-3xl font-semibold leading-tight tracking-[-0.03em] lg:text-4xl">Cuidado próximo, gestão segura.</h1>
              <p className="mt-5 text-sm leading-6 text-white/70">Acesse o ambiente de trabalho da sua equipe com suas credenciais.</p>
            </div>
          </div>
          <p className="relative text-xs text-white/50">Acesso destinado a usuários autorizados.</p>
        </section>

        <section className="flex flex-col justify-center px-6 py-10 sm:px-10 md:px-12 lg:px-16">
          <div className="mb-9 md:hidden">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-sm font-semibold tracking-wide text-primary">HC</span>
              <span className="text-lg font-semibold tracking-tight text-sidebar">Sistema Home Care</span>
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-primary">Bem-vindo</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">Acesse sua conta</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Entre com seu CPF e senha para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="w-full">
            <label className="mb-5 block">
              <span className="mb-2 block text-sm font-medium text-ink">CPF</span>
              <input
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                autoComplete="username"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                className="h-12 w-full rounded-xl border border-line bg-white px-4 text-sm text-ink outline-none transition placeholder:text-[#A4AEA9] hover:border-primary-light focus:border-primary focus:ring-4 focus:ring-primary/10"
                required
              />
            </label>

            <label className="mb-5 block">
              <span className="mb-2 block text-sm font-medium text-ink">Senha</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                className="h-12 w-full rounded-xl border border-line bg-white px-4 text-sm text-ink outline-none transition placeholder:text-[#A4AEA9] hover:border-primary-light focus:border-primary focus:ring-4 focus:ring-primary/10"
                required
              />
            </label>

            {error && (
              <p id="login-error" role="alert" className="mb-5 rounded-xl border border-[#F0D9D3] bg-[#FBF1EE] px-4 py-3 text-sm text-[#9A493B]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-wait disabled:opacity-70"
            >
              {submitting && <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>}
              {submitting ? "Entrando…" : "Entrar"}
            </button>
          </form>

          <div className="mt-8 flex items-start gap-3 border-t border-line pt-5 text-xs leading-5 text-muted">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-primary" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v5c0 4.5 2.9 8.2 7 10 4.1-1.8 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
            <p>Suas credenciais são protegidas e utilizadas apenas para autenticar seu acesso.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
