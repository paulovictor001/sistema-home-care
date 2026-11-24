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

  const pageTitle = resetMode
    ? resetUid
      ? "Defina uma nova senha"
      : "Recupere seu acesso"
    : "Acesse sua conta";
  const pageDescription = resetMode
    ? resetUid
      ? "Escolha uma nova senha para sua conta."
      : "Informe o e-mail cadastrado para receber o link de redefinição."
    : "Entre com seu CPF e senha para continuar.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F7F4] px-4 py-8 text-[#253431] sm:px-6 lg:px-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-[#E5EAE5] bg-white shadow-[0_24px_70px_-38px_rgba(23,59,58,0.32)] md:min-h-[570px] md:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden flex-col justify-between overflow-hidden bg-[#173B3A] p-10 text-white md:flex lg:p-14">
          <div aria-hidden="true" className="absolute -right-24 -top-24 h-72 w-72 rounded-full border border-white/10" />
          <div aria-hidden="true" className="absolute -right-10 -top-10 h-44 w-44 rounded-full border border-white/10" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-sm font-semibold tracking-wide text-white ring-1 ring-inset ring-white/15">HC</span>
              <span className="text-lg font-semibold tracking-tight">LarVita</span>
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
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E4F0EA] text-sm font-semibold tracking-wide text-[#347C70]">HC</span>
              <span className="text-lg font-semibold tracking-tight text-[#173B3A]">LarVita</span>
            </div>
          </div>

          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-[#347C70]">{resetMode ? "Recuperação de acesso" : "Bem-vindo"}</p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[#253431]">{pageTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-[#78847F]">{pageDescription}</p>
          </div>

          <form onSubmit={resetMode ? handleReset : handleSubmit} className="w-full">
            {resetMode ? (
              resetUid ? (
                <label className="mb-5 block">
                  <span className="mb-2 block text-sm font-medium text-[#253431]">Nova senha</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    className="h-12 w-full rounded-xl border border-[#E5EAE5] bg-white px-4 text-sm text-[#253431] outline-none transition placeholder:text-[#A4AEA9] hover:border-[#C8D5CE] focus:border-[#347C70] focus:ring-4 focus:ring-[#347C70]/10"
                    required
                  />
                </label>
              ) : (
                <label className="mb-5 block">
                  <span className="mb-2 block text-sm font-medium text-[#253431]">E-mail</span>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    autoComplete="email"
                    className="h-12 w-full rounded-xl border border-[#E5EAE5] bg-white px-4 text-sm text-[#253431] outline-none transition placeholder:text-[#A4AEA9] hover:border-[#C8D5CE] focus:border-[#347C70] focus:ring-4 focus:ring-[#347C70]/10"
                    required
                  />
                </label>
              )
            ) : (
              <>
                <label className="mb-5 block">
                  <span className="mb-2 block text-sm font-medium text-[#253431]">CPF</span>
                  <input
                    value={cpf}
                    onChange={(event) => setCpf(formatCpf(event.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    autoComplete="username"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "login-error" : undefined}
                    className="h-12 w-full rounded-xl border border-[#E5EAE5] bg-white px-4 text-sm text-[#253431] outline-none transition placeholder:text-[#A4AEA9] hover:border-[#C8D5CE] focus:border-[#347C70] focus:ring-4 focus:ring-[#347C70]/10"
                    required
                  />
                </label>
                <label className="mb-5 block">
                  <span className="mb-2 block text-sm font-medium text-[#253431]">Senha</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    aria-invalid={Boolean(error)}
                    aria-describedby={error ? "login-error" : undefined}
                    className="h-12 w-full rounded-xl border border-[#E5EAE5] bg-white px-4 text-sm text-[#253431] outline-none transition placeholder:text-[#A4AEA9] hover:border-[#C8D5CE] focus:border-[#347C70] focus:ring-4 focus:ring-[#347C70]/10"
                    required
                  />
                </label>
              </>
            )}

            {resetMessage && (
              <p role="status" className="mb-5 rounded-xl border border-[#D7E9DE] bg-[#F1F8F3] px-4 py-3 text-sm text-[#286343]">
                {resetMessage}
              </p>
            )}
            {error && (
              <p id="login-error" role="alert" className="mb-5 rounded-xl border border-[#F0D9D3] bg-[#FBF1EE] px-4 py-3 text-sm text-[#9A493B]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#347C70] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#28695F] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#347C70]/20 disabled:cursor-wait disabled:opacity-70"
            >
              {submitting && <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".3" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>}
              {submitting
                ? "Aguarde…"
                : resetMode
                  ? resetUid
                    ? "Redefinir senha"
                    : "Enviar link"
                  : "Entrar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setResetMessage(null);
                setResetMode(!resetMode);
              }}
              className="mt-4 w-full text-sm font-medium text-[#347C70] underline-offset-4 hover:underline"
            >
              {resetMode ? "Voltar ao login" : "Esqueci minha senha"}
            </button>
          </form>

          <div className="mt-8 flex items-start gap-3 border-t border-[#E5EAE5] pt-5 text-xs leading-5 text-[#78847F]">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="mt-0.5 h-4 w-4 shrink-0 text-[#347C70]" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v5c0 4.5 2.9 8.2 7 10 4.1-1.8 7-5.5 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>
            <p>Suas credenciais são protegidas e utilizadas apenas para autenticar seu acesso.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
