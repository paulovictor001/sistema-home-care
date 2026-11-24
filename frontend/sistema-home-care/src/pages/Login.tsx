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
  const query = new URLSearchParams(location.search);
  const resetUid = query.get("uid");
  const resetToken = query.get("token");
  const [resetMode, setResetMode] = useState(Boolean(resetUid && resetToken));
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);

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

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResetMessage(null);
    setSubmitting(true);
    try {
      const endpoint = resetUid && resetToken
        ? "/api/auth/password-reset/confirm/"
        : "/api/auth/password-reset/";
      const json = resetUid && resetToken
        ? { uid: resetUid, token: resetToken, password: newPassword }
        : { email: resetEmail };
      const response = await fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:8000"}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.password?.join(" ") ?? body.detail ?? "Não foi possível redefinir a senha.");
      }
      setResetMessage(body.detail);
      if (resetUid) {
        setResetMode(false);
        navigate("/login", { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha de conexão.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form
        onSubmit={resetMode ? handleReset : handleSubmit}
        className="w-full max-w-sm rounded-xl border border-line bg-surface p-7 shadow-sm"
      >
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-base font-bold text-sidebar">
            HC
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-ink">
              Sistema Home Care
            </h1>
            <p className="text-xs text-muted">Acesso à equipe</p>
          </div>
        </div>
        <p className="mb-4 text-sm text-muted">{resetMode ? (resetUid ? "Defina uma nova senha." : "Informe o e-mail cadastrado para receber o link.") : "Entre com seu CPF e senha."}</p>

        {resetMode ? (
          resetUid ? (
            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-medium text-ink">Nova senha</span>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" className="w-full rounded border border-line bg-surface px-3 py-2 text-ink" required />
            </label>
          ) : (
            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-medium text-ink">E-mail</span>
              <input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} autoComplete="email" className="w-full rounded border border-line bg-surface px-3 py-2 text-ink" required />
            </label>
          )
        ) : <>

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium text-ink">CPF</span>
          <input
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            inputMode="numeric"
            autoComplete="username"
            className="w-full rounded border border-line bg-surface px-3 py-2 text-ink transition-colors focus:border-primary"
            required
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-medium text-ink">Senha</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded border border-line bg-surface px-3 py-2 text-ink transition-colors focus:border-primary"
            required
          />
        </label>
        </>}

        {resetMessage && <p role="status" className="mb-3 text-sm text-green-700">{resetMessage}</p>}

        {error && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-primary px-3 py-2 font-medium text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {submitting ? "Aguarde…" : resetMode ? (resetUid ? "Redefinir senha" : "Enviar link") : "Entrar"}
        </button>
        <button type="button" onClick={() => { setError(null); setResetMessage(null); setResetMode(!resetMode); }} className="mt-3 w-full text-sm text-primary underline">
          {resetMode ? "Voltar ao login" : "Esqueci minha senha"}
        </button>
      </form>
    </div>
  );
}
