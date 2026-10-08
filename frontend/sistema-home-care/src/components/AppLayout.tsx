import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { formatCpf } from "../lib/cpf";
import { isGerente } from "../lib/patients";

function navClasses({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive
      ? "bg-blue-600 text-white"
      : "text-slate-300 hover:bg-slate-800 hover:text-white"
  }`;
}

function sectionLabel(text: string) {
  return (
    <p className="px-3 pt-5 pb-1 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
      {text}
    </p>
  );
}

const PAGE_TITLES: { prefix: string; title: string; crumb: string }[] = [
  { prefix: "/escalas", title: "Escalas", crumb: "Painel / Escalas" },
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
  { prefix: "/", title: "Painel", crumb: "Painel" },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
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
    <div className="min-h-screen bg-slate-100">
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            menuOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"
          } w-64 shrink-0 flex-col bg-slate-900 p-4 md:sticky md:top-0 md:flex md:h-screen`}
        >
          <Link to="/" onClick={closeMenu} className="flex items-center gap-2 px-1 py-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              HC
            </span>
            <span className="text-lg font-semibold text-white">Home Care</span>
          </Link>

          <nav className="mt-2 flex-1 overflow-y-auto" aria-label="Navegação principal">
            {sectionLabel("Principal")}
            <div className="space-y-1">
              <NavLink to="/" end className={navClasses} onClick={closeMenu}>
                <span aria-hidden="true">▦</span> Painel
              </NavLink>
            </div>

            {sectionLabel("Gestão")}
            <div className="space-y-1">
              <NavLink to="/pacientes" end className={navClasses} onClick={closeMenu}>
                <span aria-hidden="true">👥</span> Pacientes
              </NavLink>
              <NavLink to="/escalas" className={navClasses} onClick={closeMenu}>Escalas</NavLink>
            </div>

            {isGerente(user?.groups) && (
              <>
                {sectionLabel("Administração")}
                <div className="space-y-1">
                  <NavLink to="/usuarios" end className={navClasses} onClick={closeMenu}>
                    <span aria-hidden="true">🧑‍💼</span> Usuários
                  </NavLink>
                  <NavLink to="/categorias" end className={navClasses} onClick={closeMenu}>
                    <span aria-hidden="true">🏷️</span> Categorias
                  </NavLink>
                  <NavLink to="/profissoes" end className={navClasses} onClick={closeMenu}>
                    <span aria-hidden="true">⚕️</span> Profissões
                  </NavLink>
                </div>
              </>
            )}
          </nav>

          <div className="mt-4 rounded-lg bg-slate-800 p-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 font-semibold text-white">
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{displayName}</p>
                <p className="truncate text-xs text-slate-400">{roleLabel}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              CPF: {user ? formatCpf(user.cpf) : "—"}
            </p>
            <button
              onClick={logout}
              className="mt-3 w-full rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
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
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:px-6">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm md:hidden"
            >
              {menuOpen ? "Fechar" : "Menu"}
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-slate-900">
                {current.title}
              </h1>
              <p className="truncate text-xs text-slate-500">{current.crumb}</p>
            </div>
            <div className="ml-auto hidden items-center gap-3 sm:flex">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {initials}
              </span>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-900">{displayName}</p>
                <p className="text-xs text-slate-500">{roleLabel}</p>
              </div>
            </div>
          </header>

          <main className="p-4 md:p-6">
            <Outlet />
          </main>

          <footer className="px-4 pb-6 text-xs text-slate-500 md:px-6">
            Sistema Home Care — painel de acesso
          </footer>
        </div>
      </div>
    </div>
  );
}
