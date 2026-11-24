import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { formatCpf } from "../lib/cpf";
import { canViewPatients, isGerente } from "../lib/patients";
import { scaleAccess } from '../lib/careScales';
import { canManageNeedTypes } from "../lib/assessments";
import { canVisit } from "../lib/visits";

function navClasses({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-primary text-white"
      : "text-white/75 hover:bg-white/10 hover:text-white"
  }`;
}

function sectionLabel(text: string) {
  return (
    <p className="px-3 pt-5 pb-1 text-[11px] font-semibold tracking-wider text-white/60 uppercase">
      {text}
    </p>
  );
}

/* Ícones da navegação — SVG stroke (mesmo estilo do painel) */
const NAV_ICONS: Record<string, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  calendar: (
    <>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </>
  ),
  user: (
    <>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  tag: (
    <>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </>
  ),
  briefcase: (
    <>
      <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      <rect width="20" height="14" x="2" y="6" rx="2" />
    </>
  ),
  box: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="M3 8v9l9 5 9-5V8" />
      <path d="M12 13v9" />
    </>
  ),
  types: (
    <>
      <path d="M4 5h16M4 12h16M4 19h16" />
      <circle cx="7" cy="5" r="1" fill="currentColor" />
      <circle cx="7" cy="12" r="1" fill="currentColor" />
      <circle cx="7" cy="19" r="1" fill="currentColor" />
    </>
  ),
};

function NavIcon({ name }: { name: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="h-[18px] w-[18px] shrink-0"
    >
      {NAV_ICONS[name]}
    </svg>
  );
}

const PAGE_TITLES: { prefix: string; title: string; crumb: string }[] = [
  { prefix: "/escalas", title: "Escalas", crumb: "Painel / Escalas" },
  { prefix: "/agendamentos", title: "Agendamentos", crumb: "Painel / Gestão / Agendamentos" },
  { prefix: "/avaliacoes/", title: "Detalhe da Avaliação", crumb: "Painel / Pacientes / Avaliações / Detalhe" },
  { prefix: "/avaliacoes", title: "Avaliações", crumb: "Painel / Pacientes / Avaliações" },
  { prefix: "/pacientes/novo", title: "Novo Paciente", crumb: "Painel / Pacientes / Novo" },
  { prefix: "/pacientes/", title: "Detalhe do Paciente", crumb: "Painel / Pacientes / Detalhe" },
  { prefix: "/pacientes", title: "Pacientes", crumb: "Painel / Pacientes" },
  { prefix: "/usuarios/novo", title: "Novo Usuário", crumb: "Painel / Usuários / Novo" },
  { prefix: "/usuarios/", title: "Detalhe do Usuário", crumb: "Painel / Usuários / Detalhe" },
  { prefix: "/usuarios", title: "Usuários", crumb: "Painel / Usuários" },
  { prefix: "/categorias", title: "Categorias", crumb: "Painel / Categorias" },
  { prefix: "/profissoes", title: "Profissões", crumb: "Painel / Profissões" },
  { prefix: "/tipos", title: "Tipos de necessidade", crumb: "Painel / Administração / Tipos de necessidade" },
  { prefix: "/recursos", title: "Recursos", crumb: "Painel / Administração / Recursos" },
  { prefix: "/", title: "Painel", crumb: "Painel" },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scalesVisible, setScalesVisible] = useState(false);
  useEffect(() => {let cancelled = false; if (user) void scaleAccess().then(access => {if (!cancelled) setScalesVisible(Object.values(access).some(Boolean));}).catch(() => {}); return () => {cancelled = true;};}, [user]);
  const location = useLocation();

  const displayName =
    `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Usuário";
  const roleLabel = user?.category?.name ?? user?.groups.join(", ") ?? "—";
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const current =
    location.pathname.includes("/avaliacoes")
      ? {
          title: "Avaliações",
          crumb: "Painel / Pacientes / Avaliações",
        }
      : (PAGE_TITLES.find((p) => location.pathname.startsWith(p.prefix)) ??
        PAGE_TITLES[PAGE_TITLES.length - 1]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            menuOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"
          } w-64 shrink-0 flex-col bg-sidebar p-4 md:sticky md:top-0 md:flex md:h-screen`}
        >
          <Link to="/" onClick={closeMenu} className="flex items-center gap-2 px-1 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-sm font-bold text-sidebar">
              HC
            </span>
            <span className="text-lg font-semibold text-white">Home Care</span>
          </Link>

          <nav className="mt-2 flex-1 overflow-y-auto" aria-label="Navegação principal">
            {sectionLabel("Principal")}
            <div className="space-y-1">
              <NavLink to="/" end className={navClasses} onClick={closeMenu}>
                <NavIcon name="grid" /> Painel
              </NavLink>
            </div>

            {sectionLabel("Gestão")}
            <div className="space-y-1">
              {canViewPatients(user) && (
                <NavLink to="/pacientes" end className={navClasses} onClick={closeMenu}>
                  <NavIcon name="users" /> Pacientes
                </NavLink>
              )}
              {scalesVisible && <NavLink to="/escalas" className={navClasses} onClick={closeMenu}><NavIcon name="calendar" /> Escalas</NavLink>}
              {canVisit(user, 'view') && <NavLink to="/agendamentos" className={navClasses} onClick={closeMenu}><NavIcon name="calendar" /> Agendamentos</NavLink>}
            </div>

            {(isGerente(user?.groups) || canManageNeedTypes(user)) && (
              <>
                {sectionLabel("Administração")}
                <div className="space-y-1">
                  {isGerente(user?.groups) && <>
                    <NavLink to="/usuarios" end className={navClasses} onClick={closeMenu}>
                      <NavIcon name="user" /> Usuários
                    </NavLink>
                    <NavLink to="/categorias" end className={navClasses} onClick={closeMenu}>
                      <NavIcon name="tag" /> Categorias
                    </NavLink>
                    <NavLink to="/profissoes" end className={navClasses} onClick={closeMenu}>
                      <NavIcon name="briefcase" /> Profissões
                    </NavLink>
                    <NavLink to="/recursos" end className={navClasses} onClick={closeMenu}>
                      <NavIcon name="box" /> Recursos
                    </NavLink>
                  </>}
                  {canManageNeedTypes(user) && <NavLink to="/tipos" end className={navClasses} onClick={closeMenu}>
                    <NavIcon name="types" /> Tipos de necessidade
                  </NavLink>}
                </div>
              </>
            )}
          </nav>

          <div className="mt-4 rounded-lg bg-white/10 p-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{displayName}</p>
                <p className="truncate text-xs text-white/60">{roleLabel}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-white/60">
              CPF: {user ? formatCpf(user.cpf) : "—"}
            </p>
            <button
              onClick={logout}
              className="mt-3 w-full rounded-lg border border-white/25 px-3 py-1.5 text-sm text-white/90 transition-colors hover:bg-white/10"
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
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface px-4 py-3 md:px-6">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              className="rounded-lg border border-line px-3 py-1.5 text-sm md:hidden"
            >
              {menuOpen ? "Fechar" : "Menu"}
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-ink">
                {current.title}
              </h1>
              <p className="truncate text-xs text-muted">{current.crumb}</p>
            </div>
            <div className="ml-auto hidden items-center gap-3 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {initials}
              </span>
              <div className="text-right">
                <p className="text-sm font-medium text-ink">{displayName}</p>
                <p className="text-xs text-muted">{roleLabel}</p>
              </div>
            </div>
          </header>

          <main className="p-4 md:p-6">
            <Outlet />
          </main>

          <footer className="px-4 pb-6 text-xs text-muted md:px-6">
            Sistema Home Care — painel de acesso
          </footer>
        </div>
      </div>
    </div>
  );
}
