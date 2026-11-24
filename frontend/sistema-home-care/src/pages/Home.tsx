import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { ApiError } from "../lib/api";
import {
  canViewAssessments,
  isCareTeam,
  listAssessments,
} from "../lib/assessments";
import { isGerente, listPatients } from "../lib/patients";
import { listScales, scaleAccess } from "../lib/careScales";
import { listUsers } from "../lib/users";

/* ------------------------------- Estados ------------------------------- */

type LoadStatus = "loading" | "ok" | "error";

interface GroupState<T> {
  status: LoadStatus;
  data: T | null;
  error: string | null;
}

function loadingGroup<T>(): GroupState<T> {
  return { status: "loading", data: null, error: null };
}

interface PatientCounts {
  total: number;
  ativos: number;
  inativos: number;
}

interface UserCounts {
  total: number;
  ativos: number;
}

function apiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  return err instanceof Error ? err.message : fallback;
}

/* -------------------------------- Ícones -------------------------------- */

type IconName =
  | "users"
  | "userCheck"
  | "userMinus"
  | "userPlus"
  | "clipboard"
  | "calendar"
  | "shield"
  | "tag"
  | "briefcase"
  | "alert"
  | "inbox"
  | "arrow"
  | "refresh";

const ICONS: Record<IconName, ReactNode> = {
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  userCheck: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="m16 11 2 2 4-4" />
    </>
  ),
  userMinus: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 13h-6" />
    </>
  ),
  userPlus: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M19 8v6" />
      <path d="M22 11h-6" />
    </>
  ),
  clipboard: (
    <>
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </>
  ),
  calendar: (
    <>
      <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h5" />
      <path d="M17.5 17.5 16 16.3V14" />
      <circle cx="16" cy="16" r="6" />
    </>
  ),
  shield: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
      <path d="m9 12 2 2 4-4" />
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
  alert: (
    <>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </>
  ),
  inbox: (
    <>
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </>
  ),
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </>
  ),
  refresh: (
    <>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </>
  ),
};

function Icon({ name, className }: { name: IconName; className?: string }) {
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
      className={className}
    >
      {ICONS[name]}
    </svg>
  );
}

/* ----------------------------- Componentes ------------------------------ */

type Accent = "primary" | "neutral" | "warm";

const ACCENT_CHIP: Record<Accent, string> = {
  primary: "bg-primary-light text-primary",
  neutral: "bg-line text-muted",
  warm: "bg-accent/25 text-ink",
};

interface StatModel {
  label: string;
  value: number;
  sub?: string;
  icon: IconName;
  accent: Accent;
}

function StatCard({ stat }: { stat: StatModel }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{stat.label}</p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${ACCENT_CHIP[stat.accent]}`}
        >
          <Icon name={stat.icon} className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-ink tabular-nums">
        {stat.value.toLocaleString("pt-BR")}
      </p>
      {stat.sub && <p className="mt-1 text-xs text-muted">{stat.sub}</p>}
    </div>
  );
}

function StatSkeleton() {
  return (
    <div
      className="animate-pulse rounded-xl border border-line bg-surface p-5 shadow-sm"
      aria-hidden="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="h-4 w-28 rounded bg-line" />
        <div className="h-9 w-9 rounded-lg bg-line" />
      </div>
      <div className="mt-3 h-9 w-16 rounded bg-line" />
      <div className="mt-2 h-3 w-24 rounded bg-line" />
    </div>
  );
}

function StatError({
  label,
  message,
  onRetry,
}: {
  label: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm sm:col-span-2 lg:col-span-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-red-800">
              Não foi possível carregar {label}.
            </p>
            <p className="mt-0.5 break-words text-xs text-red-600">{message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-300 bg-surface px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
        >
          <Icon name="refresh" className="h-4 w-4" />
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  description,
  action,
}: {
  icon: IconName;
  title: string;
  description: string;
  action?: { to: string; label: string; icon: IconName };
}) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-6 py-8 text-center shadow-sm">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-line">
        <Icon name={icon} className="h-6 w-6 text-muted" />
      </span>
      <h4 className="mt-3 text-sm font-semibold text-ink">{title}</h4>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">
        {description}
      </p>
      {action && (
        <Link
          to={action.to}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Icon name={action.icon} className="h-4 w-4" />
          {action.label}
        </Link>
      )}
    </div>
  );
}

interface ShortcutModel {
  to: string;
  title: string;
  description: string;
  icon: IconName;
}

/* --------------------------- Render de grupos --------------------------- */

function renderStatsGroup<T>(
  group: GroupState<T>,
  visible: boolean,
  groupKey: string,
  skeletonCount: number,
  errorLabel: string,
  onRetry: () => void,
  toStats: (data: T) => StatModel[],
): ReactNode {
  if (!visible) return null;
  if (group.status === "error") {
    return (
      <StatError
        key={`${groupKey}-error`}
        label={errorLabel}
        message={group.error ?? "Erro inesperado ao consultar a API."}
        onRetry={onRetry}
      />
    );
  }
  if (group.status === "ok" && group.data !== null) {
    return toStats(group.data).map((stat) => (
      <StatCard key={`${groupKey}-${stat.label}`} stat={stat} />
    ));
  }
  return Array.from({ length: skeletonCount }, (_, index) => (
    <StatSkeleton key={`${groupKey}-skeleton-${index}`} />
  ));
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

/* -------------------------------- Página -------------------------------- */

export function Home() {
  const { user } = useAuth();

  const gerente = isGerente(user?.groups);
  const canPatients = isCareTeam(user?.groups);
  const canAssessments = canViewAssessments(user);

  const firstName = user?.first_name?.trim() || null;
  const roleLabel =
    user?.category?.name ??
    (user?.groups.length ? user.groups.join(", ") : "—");

  const [patients, setPatients] = useState<GroupState<PatientCounts>>(
    loadingGroup,
  );
  const [assessments, setAssessments] = useState<GroupState<number>>(
    loadingGroup,
  );
  const [scales, setScales] = useState<GroupState<number>>(loadingGroup);
  const [users, setUsers] = useState<GroupState<UserCounts>>(loadingGroup);
  /** null = verificando acesso; false = sem acesso (ou falha na checagem). */
  const [scalesAccess, setScalesAccess] = useState<boolean | null>(null);

  const loadPatients = useCallback(async () => {
    setPatients((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const [todos, ativos, inativos] = await Promise.all([
        listPatients({ status: "todos" }),
        listPatients({ status: "ativo" }),
        listPatients({ status: "inativo" }),
      ]);
      const counts = [todos.count, ativos.count, inativos.count];
      if (
        counts.some((count) => !Number.isInteger(count) || count < 0) ||
        todos.count !== ativos.count + inativos.count
      ) {
        throw new Error(
          "A API retornou totais de pacientes inconsistentes. Atualize para consultar novamente.",
        );
      }
      setPatients({
        status: "ok",
        data: {
          total: todos.count,
          ativos: ativos.count,
          inativos: inativos.count,
        },
        error: null,
      });
    } catch (err) {
      setPatients((prev) => ({
        ...prev,
        status: "error",
        error: apiErrorMessage(err, "Falha ao carregar pacientes."),
      }));
    }
  }, []);

  const loadAssessments = useCallback(async () => {
    setAssessments((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const data = await listAssessments();
      setAssessments({ status: "ok", data: data.count, error: null });
    } catch (err) {
      setAssessments((prev) => ({
        ...prev,
        status: "error",
        error: apiErrorMessage(err, "Falha ao carregar avaliações."),
      }));
    }
  }, []);

  const loadScales = useCallback(async () => {
    setScales((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const data = await listScales(1);
      setScales({ status: "ok", data: data.count, error: null });
    } catch (err) {
      setScales((prev) => ({
        ...prev,
        status: "error",
        error: apiErrorMessage(err, "Falha ao carregar escalas."),
      }));
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsers((prev) => ({ ...prev, status: "loading", error: null }));
    try {
      const [todos, ativos] = await Promise.all([
        listUsers({ status: "todos" }),
        listUsers({ status: "ativo" }),
      ]);
      setUsers({
        status: "ok",
        data: { total: todos.count, ativos: ativos.count },
        error: null,
      });
    } catch (err) {
      setUsers((prev) => ({
        ...prev,
        status: "error",
        error: apiErrorMessage(err, "Falha ao carregar usuários."),
      }));
    }
  }, []);

  // Checagem de acesso a escalas (mesma lógica da sidebar) e carga do
  // indicador quando o acesso é confirmado.
  useEffect(() => {
    let cancelled = false;
    scaleAccess()
      .then((access) => {
        if (cancelled) return;
        setScalesAccess(access.view);
        if (access.view) void loadScales();
      })
      .catch(() => {
        // Sem acesso confirmado: oculta o atalho/indicador (como a sidebar).
        if (!cancelled) setScalesAccess(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Indicadores: carregam uma vez na montagem (gates estáveis na sessão).
  useEffect(() => {
    if (canPatients) void loadPatients();
    if (canAssessments) void loadAssessments();
    if (gerente) void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scalesVisible = scalesAccess !== false;

  const indicatorsLoading =
    (canPatients && patients.status === "loading") ||
    (canAssessments && assessments.status === "loading") ||
    (gerente && users.status === "loading") ||
    (scalesVisible && scales.status === "loading");

  const noIndicators =
    !canPatients && !canAssessments && !gerente && scalesAccess === false;

  const patientsEmpty =
    canPatients && patients.status === "ok" && patients.data?.total === 0;

  const now = new Date();
  const greeting = greetingFor(now);
  const dateLabel = capitalize(
    now.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  );

  const patientsShortcut: ShortcutModel = {
    to: "/pacientes",
    title: "Pacientes",
    description: "Busque, filtre e acompanhe os pacientes cadastrados.",
    icon: "users",
  };
  const newPatientShortcut: ShortcutModel = {
    to: "/pacientes/novo",
    title: "Novo paciente",
    description: "Cadastre um paciente com endereço e médico responsável.",
    icon: "userPlus",
  };
  const scalesShortcut: ShortcutModel = {
    to: "/escalas",
    title: "Escalas",
    description: "Acompanhe as escalas de cuidado visíveis para você.",
    icon: "calendar",
  };
  const adminShortcuts: ShortcutModel[] = [
    {
      to: "/usuarios",
      title: "Usuários",
      description: "Gerencie usuários, status e acessos da equipe.",
      icon: "shield",
    },
    {
      to: "/categorias",
      title: "Categorias",
      description: "Organize categorias e permissões de acesso.",
      icon: "tag",
    },
    {
      to: "/profissoes",
      title: "Profissões",
      description: "Cadastre e organize as profissões da equipe.",
      icon: "briefcase",
    },
  ];

  const shortcuts: ShortcutModel[] = [
    ...(canPatients ? [patientsShortcut] : []),
    ...(gerente ? [newPatientShortcut] : []),
    ...(scalesAccess ? [scalesShortcut] : []),
    ...(gerente ? adminShortcuts : []),
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Saudação */}
      <header className="relative overflow-hidden rounded-2xl border border-line bg-surface px-5 py-6 shadow-sm sm:px-7 sm:py-8">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-primary" />
        <div className="flex flex-wrap items-start justify-between gap-4 pl-1">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">
              {firstName ? `${greeting}, ${firstName}!` : `${greeting}!`}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-ink md:text-base">
              Acompanhe os indicadores do sistema e acesse as funcionalidades
              disponíveis para o seu perfil.
            </p>
            <span className="mt-3 inline-flex items-center rounded-full border border-primary-light bg-primary-light px-3 py-1 text-xs font-medium text-primary">
              {roleLabel}
            </span>
            <p className="mt-2 text-xs text-muted lg:hidden">{dateLabel}</p>
          </div>
          <div className="hidden shrink-0 text-right lg:block">
            <p className="text-sm font-medium text-ink">{dateLabel}</p>
            <p className="mt-0.5 text-xs text-muted">
              {firstName ? `Sessão de ${firstName}` : "Sessão ativa"}
            </p>
          </div>
        </div>
      </header>

      {/* Indicadores */}
      <section className="mt-8" aria-labelledby="indicadores-title">
        <div className="flex items-center justify-between gap-3">
          <h3
            id="indicadores-title"
            className="text-base font-semibold text-ink"
          >
            Indicadores
          </h3>
          {indicatorsLoading && (
            <span className="text-xs text-muted" role="status">
              Carregando…
            </span>
          )}
        </div>

        {noIndicators ? (
          <div className="mt-4">
            <EmptyPanel
              icon="inbox"
              title="Nenhum indicador disponível para o seu perfil"
              description="As funcionalidades autorizadas para o seu perfil estão disponíveis na seção Atalhos abaixo."
            />
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {renderStatsGroup(
              patients,
              canPatients,
              "patients",
              3,
              "os pacientes",
              loadPatients,
              (data) => [
                {
                  label: "Total de pacientes",
                  value: data.total,
                  icon: "users",
                  accent: "primary",
                },
                {
                  label: "Pacientes ativos",
                  value: data.ativos,
                  icon: "userCheck",
                  accent: "primary",
                },
                {
                  label: "Pacientes inativos",
                  value: data.inativos,
                  icon: "userMinus",
                  accent: "neutral",
                },
              ],
            )}
            {renderStatsGroup(
              assessments,
              canAssessments,
              "assessments",
              1,
              "as avaliações",
              loadAssessments,
              (count) => [
                {
                  label: "Avaliações registradas",
                  value: count,
                  icon: "clipboard",
                  accent: "primary",
                },
              ],
            )}
            {renderStatsGroup(
              scales,
              scalesVisible,
              "scales",
              1,
              "as escalas",
              loadScales,
              (count) => [
                {
                  label: "Escalas",
                  value: count,
                  sub: "visíveis para você",
                  icon: "calendar",
                  accent: "warm",
                },
              ],
            )}
            {renderStatsGroup(
              users,
              gerente,
              "users",
              1,
              "os usuários",
              loadUsers,
              (data) => [
                {
                  label: "Usuários ativos",
                  value: data.ativos,
                  sub: `${data.total.toLocaleString("pt-BR")} cadastrados`,
                  icon: "shield",
                  accent: "primary",
                },
              ],
            )}
          </div>
        )}

        {patientsEmpty && (
          <div className="mt-4">
            <EmptyPanel
              icon="users"
              title="Nenhum paciente cadastrado ainda"
              description={
                gerente
                  ? "Cadastre o primeiro paciente para começar a acompanhar os indicadores do sistema."
                  : "Assim que a equipe cadastrar pacientes, eles aparecerão aqui."
              }
              action={
                gerente
                  ? {
                      to: "/pacientes/novo",
                      label: "Cadastrar paciente",
                      icon: "userPlus",
                    }
                  : undefined
              }
            />
          </div>
        )}
      </section>

      {/* Atalhos */}
      <section className="mt-8" aria-labelledby="atalhos-title">
        <h3
          id="atalhos-title"
          className="text-base font-semibold text-ink"
        >
          Atalhos
        </h3>
        <nav aria-label="Atalhos rápidos">
          {shortcuts.length > 0 ? (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shortcuts.map((shortcut) => (
                <Link
                  key={shortcut.to}
                  to={shortcut.to}
                  className="group rounded-xl border border-line bg-surface p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
                      <Icon name={shortcut.icon} className="h-5 w-5" />
                    </span>
                    <Icon
                      name="arrow"
                      className="h-5 w-5 text-line transition group-hover:translate-x-0.5 group-hover:text-primary"
                    />
                  </div>
                  <p className="mt-3 font-semibold text-ink">
                    {shortcut.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    {shortcut.description}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <EmptyPanel
                icon="inbox"
                title="Nenhum atalho disponível"
                description="Não há funcionalidades liberadas para o seu perfil neste momento."
              />
            </div>
          )}
        </nav>
      </section>
    </div>
  );
}
