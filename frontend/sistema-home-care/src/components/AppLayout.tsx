import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { formatCpf } from "../lib/cpf";
import { isGerente } from "../lib/patients";
import { scaleAccess } from '../lib/careScales';
import { Breadcrumbs } from "./ui";

function navClasses({ isActive }: { isActive: boolean }): string {
  return `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care-action ${
    isActive
      ? "bg-care-soft text-care-forest ring-1 ring-inset ring-care-action/10"
      : "text-[#C2D0CA] hover:bg-white/10 hover:text-white"
  }`;
}

function sectionLabel(text: string) {
  return (
    <p className="px-3 pt-6 pb-2 text-[10px] font-semibold tracking-[0.14em] text-[#8FA39A] uppercase">
      {text}
    </p>
  );
}

type Breadcrumb = { label: string; to?: string };
type PageContext = { title: string; breadcrumbs: Breadcrumb[] };

function getPageContext(pathname: string): PageContext {
  const parts = pathname.split("/").filter(Boolean);
  const home: Breadcrumb = { label: "Painel", to: "/" };
  const patients: Breadcrumb = { label: "Pacientes", to: "/pacientes" };
  const users: Breadcrumb = { label: "Usuários", to: "/usuarios" };

  if (parts.length === 0) return { title: "Painel", breadcrumbs: [home] };
  if (parts[0] === "pacientes") {
    if (parts[1] === "novo") return { title: "Novo paciente", breadcrumbs: [home, patients, { label: "Novo" }] };
    if (parts[1] && parts[2] === "editar") return { title: "Editar paciente", breadcrumbs: [home, patients, { label: `Paciente #${parts[1]}`, to: `/pacientes/${parts[1]}` }, { label: "Editar" }] };
    if (parts[1] && parts[2] === "avaliacoes") {
      const assessments: Breadcrumb = { label: "Avaliações", to: `/pacientes/${parts[1]}/avaliacoes` };
      const patient: Breadcrumb = { label: `Paciente #${parts[1]}`, to: `/pacientes/${parts[1]}` };
      if (parts[3] === "nova") return { title: "Nova avaliação", breadcrumbs: [home, patients, patient, assessments, { label: "Nova" }] };
      return { title: "Histórico de avaliações", breadcrumbs: [home, patients, patient, assessments] };
    }
    if (parts[1] && parts[2] === "planos-cuidados") return { title: "Planos de cuidado", breadcrumbs: [home, patients, { label: `Paciente #${parts[1]}`, to: `/pacientes/${parts[1]}` }, { label: "Planos de cuidado" }] };
    if (parts[1] && parts[2] === "escalas") return { title: "Escalas de cuidado", breadcrumbs: [home, patients, { label: `Paciente #${parts[1]}`, to: `/pacientes/${parts[1]}` }, { label: "Escalas" }] };
    if (parts[1]) return { title: "Detalhe do paciente", breadcrumbs: [home, patients, { label: "Detalhe" }] };
    return { title: "Pacientes", breadcrumbs: [home, patients] };
  }
  if (parts[0] === "avaliacoes") {
    if (parts[2] === "editar") return { title: "Editar avaliação", breadcrumbs: [home, patients, { label: "Avaliações" }, { label: "Editar" }] };
    return { title: "Detalhe da avaliação", breadcrumbs: [home, patients, { label: "Avaliações" }, { label: "Detalhe" }] };
  }
  if (parts[0] === "usuarios") {
    if (parts[1] === "novo") return { title: "Novo usuário", breadcrumbs: [home, users, { label: "Novo" }] };
    if (parts[1] && parts[2] === "editar") return { title: "Editar usuário", breadcrumbs: [home, users, { label: "Usuário" }, { label: "Editar" }] };
    if (parts[1]) return { title: "Detalhe do usuário", breadcrumbs: [home, users, { label: "Detalhe" }] };
    return { title: "Usuários", breadcrumbs: [home, users] };
  }
  if (parts[0] === "escalas") {
    if (parts[1]) return { title: "Detalhe da escala", breadcrumbs: [home, { label: "Escalas", to: "/escalas" }, { label: "Detalhe" }] };
    return { title: "Escalas", breadcrumbs: [home, { label: "Escalas" }] };
  }
  if (parts[0] === "planos-cuidados") return { title: "Detalhe do plano de cuidado", breadcrumbs: [home, patients, { label: "Planos de cuidado" }, { label: "Detalhe" }] };
  const sections: Record<string, string> = { categorias: "Categorias", profissoes: "Profissões", tipos: "Tipos de necessidade" };
  const title = sections[parts[0]];
  if (title) return { title, breadcrumbs: [home, { label: title }] };
  return { title: "Painel", breadcrumbs: [home] };
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scalesVisible, setScalesVisible] = useState(false);
  useEffect(() => {let cancelled = false; setScalesVisible(false); if (user) void scaleAccess().then(access => {if (!cancelled) setScalesVisible(Object.values(access).some(Boolean));}).catch(() => {}); return () => {cancelled = true;};}, [user]);
  const location = useLocation();

  const displayName =
    `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Usuário";
  const roleLabel = user?.category?.name ?? user?.groups.join(", ") ?? "—";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const current = getPageContext(location.pathname);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-[#F6F7F4] text-[#253431]">
      <div className="flex">
        {/* Sidebar */}
        <aside
          id="primary-sidebar"
          className={`${
            menuOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"
          } w-[min(19rem,88vw)] shrink-0 flex-col bg-[#173B3A] p-4 shadow-xl md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shadow-none`}
        >
          <Link to="/" onClick={closeMenu} className="flex items-center gap-2 px-1 py-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-care-action text-sm font-bold text-white ring-1 ring-inset ring-white/15">
              HC
            </span>
            <span className="text-lg font-semibold text-white">LarVita</span>
          </Link>

          <nav className="mt-2 flex-1 overflow-y-auto" aria-label="Navegação principal">
            {sectionLabel("Principal")}
            <div className="space-y-1">
              <NavLink to="/" end className={navClasses} onClick={closeMenu}>
                <span aria-hidden="true" className="w-5 text-center">⌂</span> Painel
              </NavLink>
            </div>

            {sectionLabel("Gestão")}
            <div className="space-y-1">
              <NavLink to="/pacientes" className={navClasses} onClick={closeMenu}>
                <span aria-hidden="true" className="w-5 text-center">◉</span> Pacientes
              </NavLink>
              {scalesVisible && <NavLink to="/escalas" className={navClasses} onClick={closeMenu}><span aria-hidden="true" className="w-5 text-center">⌁</span>Escalas</NavLink>}
            </div>

            {isGerente(user?.groups) && (
              <>
                {sectionLabel("Administração")}
                <div className="space-y-1">
                  <NavLink to="/usuarios" className={navClasses} onClick={closeMenu}>
                    <span aria-hidden="true" className="w-5 text-center">◎</span> Usuários
                  </NavLink>
                  <NavLink to="/categorias" end className={navClasses} onClick={closeMenu}>
                    <span aria-hidden="true" className="w-5 text-center">◈</span> Categorias
                  </NavLink>
                  <NavLink to="/profissoes" end className={navClasses} onClick={closeMenu}>
                    <span aria-hidden="true" className="w-5 text-center">✚</span> Profissões
                  </NavLink>
                </div>
              </>
            )}
          </nav>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-care-action font-semibold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{displayName}</p>
                <p className="truncate text-xs text-[#B5C6BE]">{roleLabel}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-[#B5C6BE]">
              CPF: {user ? formatCpf(user.cpf) : "—"}
            </p>
            <button
              onClick={() => void logout()}
              className="mt-3 min-h-10 w-full rounded-xl border border-white/15 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Sair
            </button>
          </div>
        </aside>

        {menuOpen && (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={closeMenu}
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
          />
        )}

        {/* Coluna conteúdo */}
        <div className="min-w-0 flex-1">
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex min-h-[76px] items-center gap-3 border-b border-[#E5EAE5] bg-white/95 px-4 py-3 backdrop-blur-sm md:gap-5 md:px-8">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-controls="primary-sidebar"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E5EAE5] text-[#347C70] transition hover:bg-[#E4F0EA] md:hidden"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                {menuOpen ? <><path d="m6 6 12 12M18 6 6 18" /></> : <><path d="M4 7h16M4 12h16M4 17h16" /></>}
              </svg>
            </button>
            <div className="min-w-0">
              <div className="mb-1 hidden sm:block"><Breadcrumbs items={current.breadcrumbs} /></div>
              <h1 className="truncate text-base font-semibold tracking-[-0.02em] text-[#253431] md:text-lg">
                {current.title}
              </h1>
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-2.5 border-l border-[#E5EAE5] pl-3 sm:gap-3 sm:pl-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E4F0EA] text-xs font-semibold text-[#347C70] ring-1 ring-inset ring-[#347C70]/10 sm:h-10 sm:w-10 sm:text-sm">
                {initials}
              </span>
              <div className="min-w-0 max-w-[140px] sm:max-w-[220px]">
                <p className="truncate text-xs font-semibold text-[#253431] sm:text-sm">{displayName}</p>
                <p className="truncate text-[11px] text-[#78847F] sm:text-xs">{roleLabel}</p>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>

          <footer className="mx-auto w-full max-w-[1440px] px-4 pb-6 text-xs text-care-muted sm:px-6 lg:px-8">
            LarVita — painel de acesso
          </footer>
        </div>
      </div>
    </div>
  );
}
