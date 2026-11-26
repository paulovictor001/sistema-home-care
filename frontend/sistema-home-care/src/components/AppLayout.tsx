import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { formatCpf } from "../lib/cpf";
import { canViewPatients, isGerente } from "../lib/patients";
import { scaleAccess } from "../lib/careScales";
import { canManageNeedTypes } from "../lib/assessments";
import { canVisit } from "../lib/visits";

function navClasses({ isActive }: { isActive: boolean }): string {
  return `group flex min-h-9 items-center gap-3 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-care-action ${
    isActive
      ? "bg-primary text-white shadow-md shadow-black/10 ring-1 ring-white/10"
      : "text-white/75 hover:bg-white/10 hover:text-white"
  }`;
}

function sectionLabel(text: string) {
  return (
    <div className="flex items-center gap-3 px-2.5 pt-3 pb-1">
      <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
        {text}
      </span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

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
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5" />
      <path d="M9 10h6M9 14h6M9 18h3" />
    </>
  ),
  calendarClock: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <circle cx="15" cy="15" r="3" />
      <path d="M15 13.5V15l1 1" />
    </>
  ),
  userRound: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
    </>
  ),
  tags: (
    <>
      <path d="m20.59 13.41-7.17 7.17a2 2 0 0 1-2.83 0L2 12V3h9l9.59 9.59a2 2 0 0 1 0 2.82Z" />
      <circle cx="7" cy="7" r="1.5" />
    </>
  ),
  briefcaseMedical: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M12 11v6M9 14h6" />
    </>
  ),
  package: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="M3 8v9l9 5 9-5V8M12 13v9" />
    </>
  ),
  listChecks: (
    <>
      <path d="m3 6 2 2 4-4M3 12l2 2 4-4M3 18l2 2 4-4" />
      <path d="M12 6h9M12 12h9M12 18h9" />
    </>
  ),
};

function NavIcon({ name }: { name: string }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/85 transition-colors group-hover:bg-white/10 group-hover:text-white">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className="size-[17px]"
      >
        {NAV_ICONS[name]}
      </svg>
    </span>
  );
}

const PAGE_TITLES: { prefix: string; title: string; crumb: string }[] = [
  { prefix: "/escalas", title: "Escalas", crumb: "Painel / Escalas" },
  {
    prefix: "/agendamentos",
    title: "Agendamentos",
    crumb: "Painel / Gestão / Agendamentos",
  },
  {
    prefix: "/avaliacoes/",
    title: "Detalhe da Avaliação",
    crumb: "Painel / Pacientes / Avaliações / Detalhe",
  },
  {
    prefix: "/avaliacoes",
    title: "Avaliações",
    crumb: "Painel / Pacientes / Avaliações",
  },
  {
    prefix: "/pacientes/novo",
    title: "Novo Paciente",
    crumb: "Painel / Pacientes / Novo",
  },
  {
    prefix: "/pacientes/",
    title: "Detalhe do Paciente",
    crumb: "Painel / Pacientes / Detalhe",
  },
  { prefix: "/pacientes", title: "Pacientes", crumb: "Painel / Pacientes" },
  {
    prefix: "/usuarios/novo",
    title: "Novo Usuário",
    crumb: "Painel / Usuários / Novo",
  },
  {
    prefix: "/usuarios/",
    title: "Detalhe do Usuário",
    crumb: "Painel / Usuários / Detalhe",
  },
  { prefix: "/usuarios", title: "Usuários", crumb: "Painel / Usuários" },
  { prefix: "/categorias", title: "Categorias", crumb: "Painel / Categorias" },
  { prefix: "/profissoes", title: "Profissões", crumb: "Painel / Profissões" },
  {
    prefix: "/equipes",
    title: "Equipes",
    crumb: "Painel / Administração / Equipes",
  },
  {
    prefix: "/tipos",
    title: "Tipos de necessidade",
    crumb: "Painel / Administração / Tipos de necessidade",
  },
  {
    prefix: "/recursos",
    title: "Recursos",
    crumb: "Painel / Administração / Recursos",
  },
  { prefix: "/", title: "Painel", crumb: "Painel" },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scalesVisible, setScalesVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (user) {
      void scaleAccess()
        .then((access) => {
          if (!cancelled) {
            setScalesVisible(Object.values(access).some(Boolean));
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  const location = useLocation();

  const displayName =
    `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim() || "Usuário";

  const roleLabel = user?.category?.name ?? user?.groups.join(", ") ?? "—";

  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const current = location.pathname.includes("/avaliacoes")
    ? {
        title: "Avaliações",
        crumb: "Painel / Pacientes / Avaliações",
      }
    : (PAGE_TITLES.find((page) => location.pathname.startsWith(page.prefix)) ??
      PAGE_TITLES[PAGE_TITLES.length - 1]);
  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside
          id="primary-sidebar"
          className={`${
            menuOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"
          } w-64 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-sidebar p-3 md:sticky md:top-0 md:flex md:h-dvh md:w-[272px]`}
        >
          {/* Marca */}
          <Link
            to="/"
            onClick={closeMenu}
            className="group flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-white/5"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-sm font-extrabold tracking-tight text-sidebar shadow-md shadow-black/10">
              HC
            </span>

            <span className="min-w-0">
              <span className="block text-base font-bold tracking-wide text-white">
                LarVita
              </span>
              <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">
                Sistema de gestão
              </span>
            </span>
          </Link>

          <div className="mx-2 mt-3 h-px bg-white/10" />

          {/* Navegação */}
          <nav
            className="mt-1 flex-1 min-h-0 space-y-1 pb-1 overflow-hidden"
            aria-label="Navegação principal"
          >
            {sectionLabel("Principal")}

            <div className="space-y-1">
              <NavLink to="/" end className={navClasses} onClick={closeMenu}>
                <NavIcon name="grid" />
                <span>Painel</span>
              </NavLink>
            </div>

            {sectionLabel("Gestão")}

            <div className="space-y-1">
              {canViewPatients(user) && (
                <NavLink
                  to="/pacientes"
                  end
                  className={navClasses}
                  onClick={closeMenu}
                >
                  <NavIcon name="users" />
                  <span>Pacientes</span>
                </NavLink>
              )}

              {scalesVisible && (
                <NavLink
                  to="/escalas"
                  className={navClasses}
                  onClick={closeMenu}
                >
                  <NavIcon name="clipboard" />
                  <span>Escalas</span>
                </NavLink>
              )}

              {canVisit(user, "view") && (
                <NavLink
                  to="/agendamentos"
                  className={navClasses}
                  onClick={closeMenu}
                >
                  <NavIcon name="calendarClock" />
                  <span>Agendamentos</span>
                </NavLink>
              )}
            </div>

            {(isGerente(user?.groups) || canManageNeedTypes(user)) && (
              <>
                {sectionLabel("Administração")}

                <div className="space-y-1">
                  {isGerente(user?.groups) && (
                    <>
                      <NavLink
                        to="/usuarios"
                        end
                        className={navClasses}
                        onClick={closeMenu}
                      >
                        <NavIcon name="userRound" />
                        <span>Usuários</span>
                      </NavLink>

                      <NavLink
                        to="/categorias"
                        end
                        className={navClasses}
                        onClick={closeMenu}
                      >
                        <NavIcon name="tags" />
                        <span>Categorias</span>
                      </NavLink>

                      <NavLink
                        to="/profissoes"
                        end
                        className={navClasses}
                        onClick={closeMenu}
                      >
                        <NavIcon name="briefcaseMedical" />
                        <span>Profissões</span>
                      </NavLink>

                      <NavLink
                        to="/equipes"
                        end
                        className={navClasses}
                        onClick={closeMenu}
                      >
                        <NavIcon name="users" />
                        <span>Equipes</span>
                      </NavLink>

                      <NavLink
                        to="/recursos"
                        end
                        className={navClasses}
                        onClick={closeMenu}
                      >
                        <NavIcon name="package" />
                        <span>Recursos</span>
                      </NavLink>
                    </>
                  )}

                  {canManageNeedTypes(user) && (
                    <NavLink
                      to="/tipos"
                      end
                      className={navClasses}
                      onClick={closeMenu}
                    >
                      <NavIcon name="listChecks" />
                      <span>Tipos de necessidade</span>
                    </NavLink>
                  )}
                </div>
              </>
            )}
          </nav>

          {/* Perfil do usuário */}
          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.07] p-3 shadow-inner shadow-black/5">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-white/10 bg-primary text-sm font-bold text-white shadow-sm">
                {initials}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {displayName}
                </p>
                <p className="mt-0.5 truncate text-xs text-white/55">
                  {roleLabel}
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-black/10 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
                Documento
              </p>
              <p className="mt-1 text-xs font-medium tracking-wide text-white/75">
                {user ? formatCpf(user.cpf) : "—"}
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2.5 text-sm font-medium text-white/85 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M10 17l5-5-5-5" />
                <path d="M15 12H3" />
                <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
              </svg>
              Sair da conta
            </button>
          </div>

          <p className="pt-3 text-center text-[10px] tracking-wide text-white/30">
            HOME CARE • SISTEMA DE GESTÃO
          </p>
        </aside>

        {/* Overlay mobile */}
        {menuOpen && (
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={closeMenu}
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
          />
        )}

        {/* Conteúdo */}
        <div className="min-w-0 flex-1">
          {/* Topbar */}
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-surface px-4 py-3 md:px-6">
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-controls="primary-sidebar"
              aria-expanded={menuOpen}
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              className="rounded-lg border border-line px-3 py-1.5 text-sm transition hover:bg-background md:hidden"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                {menuOpen ? (
                  <>
                    <path d="m6 6 12 12M18 6 6 18" />
                  </>
                ) : (
                  <>
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </>
                )}
              </svg>
            </button>

            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-ink">
                {current.title}
              </h1>
              <p className="truncate text-xs text-muted">{current.crumb}</p>
            </div>

            <div className="ml-auto hidden items-center gap-3 sm:flex">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {initials}
              </span>

              <div className="text-right">
                <p className="text-sm font-medium text-ink">{displayName}</p>
                <p className="text-xs text-muted">{roleLabel}</p>
              </div>
            </div>
          </header>

          <main className="mx-auto min-w-0 w-full max-w-[1440px] p-4 sm:p-6 lg:p-8">
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
