import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { getPatient, type Patient } from "../lib/patients";
import { listVisits, statusLabels, type Visit } from "../lib/visits";
import {
  listPlans,
  planStatusLabels,
  frequencyLabels,
  type CarePlan,
} from "../lib/carePlans";
import {
  listScales,
  scaleStatusLabels,
  type CareScale,
} from "../lib/careScales";

function formatDate(value: string) {
  if (!value) return "Não informado";

  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "pt-BR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function frequencyText(
  quantity: number | null,
  period: "DAY" | "WEEK" | "MONTH" | null,
) {
  if (!quantity || !period) return "Não configurada";

  return `${quantity} vez(es) por ${frequencyLabels[period].toLowerCase()}`;
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
    </div>
  );
}

function InfoCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4 shadow-sm">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-2 text-xl font-bold text-ink">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted">{detail}</p>}
    </div>
  );
}

function EmptyState({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-surface px-5 py-6 text-sm text-muted">
      {children}
    </div>
  );
}

export function PatientPortal() {
  const { patientId } = useParams();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [plans, setPlans] = useState<CarePlan[]>([]);
  const [scales, setScales] = useState<CareScale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPortal() {
      if (!patientId || !Number.isInteger(Number(patientId))) {
        setError("Identificação do paciente inválida.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      const id = Number(patientId);

      const results = await Promise.allSettled([
        getPatient(id),
        listVisits({ patient: String(id) }),
        listPlans(id),
        listScales(1, id),
      ]);

      if (!active) return;

      const [patientResult, visitsResult, plansResult, scalesResult] = results;

      if (patientResult.status === "fulfilled") {
        setPatient(patientResult.value);
      } else {
        setError("Não foi possível carregar os dados do paciente.");
      }

      if (visitsResult.status === "fulfilled") {
        setVisits(visitsResult.value.results ?? []);
      }

      if (plansResult.status === "fulfilled") {
        setPlans(plansResult.value.results ?? []);
      }

      if (scalesResult.status === "fulfilled") {
        setScales(scalesResult.value.results ?? []);
      }

      setLoading(false);
    }

    loadPortal();

    return () => {
      active = false;
    };
  }, [patientId]);

  const activePlan = useMemo(
    () => plans.find((plan) => plan.status === "ACTIVE"),
    [plans],
  );

  const activeScale = useMemo(
    () => scales.find((scale) => scale.status === "ACTIVE"),
    [scales],
  );

  const activeNeeds = useMemo(
    () => activePlan?.need_links.filter((need) => !need.removed_at) ?? [],
    [activePlan],
  );

  const sortedVisits = useMemo(
    () =>
      [...visits].sort((a, b) =>
        `${a.visit_date} ${a.start_time}`.localeCompare(
          `${b.visit_date} ${b.start_time}`,
        ),
      ),
    [visits],
  );

  const upcomingVisits = useMemo(() => {
    const now = new Date();
    const today = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    return sortedVisits.filter(
      (visit) =>
        visit.visit_date >= today &&
        !["CANCELADA", "NAO_REALIZADA", "REALIZADA"].includes(visit.status),
    );
  }, [sortedVisits]);

  const nextVisit = upcomingVisits[0];

  const team = useMemo(() => {
    const professionals = new Map<string, string>();

    activeNeeds.forEach((need) => {
      if (need.professional_name) {
        professionals.set(need.professional_name, need.professional_name);
      }
    });

    activeScale?.items
      .filter((item) => !item.removed_at)
      .forEach((item) => {
        item.assignments
          .filter((assignment) => !assignment.removed_at)
          .forEach((assignment) => {
            professionals.set(assignment.full_name, assignment.profession_name);
          });
      });

    visits.forEach((visit) => {
      if (visit.professional_name) {
        professionals.set(
          visit.professional_name,
          professionals.get(visit.professional_name) ||
            "Profissional de atendimento",
        );
      }
    });

    return Array.from(professionals.entries()).map(([name, profession]) => ({
      name,
      profession,
    }));
  }, [activeNeeds, activeScale, visits]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8">
        <p className="text-sm text-muted">Carregando portal do paciente...</p>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-8">
          <h1 className="text-xl font-bold text-ink">
            Não foi possível abrir o portal
          </h1>

          <p className="mt-2 text-sm text-muted">
            {error || "Paciente não encontrado."}
          </p>

          <Link
            to="/pacientes"
            className="mt-5 inline-block font-semibold text-primary"
          >
            Voltar aos pacientes
          </Link>
        </div>
      </div>
    );
  }

  const address = patient.address;

  return (
    <div className="min-h-screen bg-background text-ink">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
              <span className="text-lg font-bold">L</span>
            </div>

            <div>
              <p className="text-xl font-bold leading-tight text-primary">
                LarVita
              </p>
              <p className="text-xs text-muted">Portal do paciente</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-primary-light px-3 py-2 text-xs font-semibold text-primary-dark">
              Área do paciente
            </span>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
              {patient.full_name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-5 py-6">
        <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-sm sm:p-8">
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/75">
              Seu acompanhamento domiciliar
            </p>

            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">
              Olá, {patient.full_name}
            </h1>

            <p className="mt-2 max-w-xl text-sm text-white/85">
              Acompanhe seus atendimentos e seu plano de cuidados em um só
              lugar.
            </p>
          </div>

          <div
            aria-hidden="true"
            className="absolute -right-12 -top-24 h-64 w-64 rounded-full border border-white/10"
          />
          <div
            aria-hidden="true"
            className="absolute -right-2 -top-16 h-48 w-48 rounded-full border border-white/10"
          />
        </section>

        <section>
          <SectionTitle
            title="Resumo do atendimento"
            description="Uma visão geral do seu acompanhamento."
          />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <InfoCard
              label="Próximas visitas"
              value={upcomingVisits.length}
              detail="Atendimentos programados"
            />

            <InfoCard
              label="Plano de cuidados"
              value={activePlan ? "Ativo" : "Indisponível"}
              detail={
                activePlan
                  ? `${activeNeeds.length} cuidado(s) previsto(s)`
                  : "Nenhum plano ativo"
              }
            />

            <InfoCard
              label="Escala de cuidados"
              value={activeScale ? "Ativa" : "Indisponível"}
              detail="Organização do atendimento"
            />

            <InfoCard
              label="Equipe vinculada"
              value={team.length}
              detail="Profissionais identificados"
            />
          </div>
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-5">
          <div className="space-y-6 lg:col-span-3">
            <section>
              <SectionTitle
                title="Seu próximo atendimento"
                description="Confira os detalhes da próxima visita."
              />

              {nextVisit ? (
                <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-xl bg-primary-light text-primary">
                      <span className="text-xs font-semibold uppercase">
                        {new Date(
                          `${nextVisit.visit_date}T12:00:00`,
                        ).toLocaleDateString("pt-BR", {
                          month: "short",
                        })}
                      </span>

                      <span className="text-3xl font-bold">
                        {new Date(`${nextVisit.visit_date}T12:00:00`).getDate()}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="inline-flex rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary-dark">
                        {statusLabels[nextVisit.status]}
                      </span>

                      <h3 className="mt-2 font-bold text-ink">
                        {nextVisit.visit_type}
                      </h3>

                      <p className="mt-1 text-sm text-muted">
                        {formatDate(nextVisit.visit_date)} ·{" "}
                        {nextVisit.start_time.slice(0, 5)} às{" "}
                        {nextVisit.end_time.slice(0, 5)}
                      </p>

                      <p className="mt-1 text-sm text-muted">
                        Profissional:{" "}
                        {nextVisit.professional_name || "Não informado"}
                      </p>
                    </div>
                  </div>

                  {nextVisit.plan_need_description && (
                    <div className="mt-4 border-t border-line pt-4">
                      <p className="text-xs text-muted">Cuidado previsto</p>
                      <p className="mt-1 text-sm font-medium">
                        {nextVisit.plan_need_description}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState>
                  Não há próximos atendimentos agendados no momento.
                </EmptyState>
              )}
            </section>

            <section>
              <SectionTitle
                title="Minha agenda"
                description="Consulte seus atendimentos agendados e anteriores."
              />

              <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                {sortedVisits.length > 0 ? (
                  <div className="divide-y divide-line">
                    {sortedVisits.map((visit) => (
                      <div
                        key={visit.id}
                        className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-background">
                            <span className="text-[10px] font-semibold uppercase text-muted">
                              {new Date(
                                `${visit.visit_date}T12:00:00`,
                              ).toLocaleDateString("pt-BR", {
                                month: "short",
                              })}
                            </span>
                            <span className="text-lg font-bold text-primary">
                              {new Date(
                                `${visit.visit_date}T12:00:00`,
                              ).getDate()}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                              {visit.visit_type}
                            </p>

                            <p className="mt-1 text-xs text-muted">
                              {formatDate(visit.visit_date)} ·{" "}
                              {visit.start_time.slice(0, 5)} às{" "}
                              {visit.end_time.slice(0, 5)}
                            </p>

                            <p className="mt-1 text-xs text-muted">
                              {visit.professional_name ||
                                "Profissional não informado"}
                            </p>
                          </div>
                        </div>

                        <span className="w-fit shrink-0 rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary-dark">
                          {statusLabels[visit.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-5 text-sm text-muted">
                    Nenhum atendimento encontrado.
                  </p>
                )}
              </div>
            </section>

            <section>
              <SectionTitle
                title="Minha equipe"
                description="Profissionais identificados no seu acompanhamento."
              />

              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
                {team.length > 0 ? (
                  <div className="divide-y divide-line">
                    {team.map((member) => (
                      <div
                        key={member.name}
                        className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-xs font-bold text-primary">
                          {member.name
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{member.name}</p>
                          <p className="text-xs text-muted">
                            {member.profession}
                          </p>
                        </div>

                        <span className="ml-auto text-xs text-primary">
                          Vinculado
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    Nenhum profissional identificado no acompanhamento.
                  </p>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6 lg:col-span-2">
            <section>
              <SectionTitle
                title="Meu plano de cuidados"
                description="Cuidados previstos para seu acompanhamento."
              />

              {activePlan ? (
                <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold">Plano #{activePlan.id}</h3>

                    <span className="rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary-dark">
                      {planStatusLabels[activePlan.status]}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-muted">
                    {activePlan.objective || "Objetivo não informado."}
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 border-b border-line pb-4">
                    <div>
                      <p className="text-xs text-muted">Início</p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatDate(activePlan.start_date)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-muted">Término</p>
                      <p className="mt-1 text-sm font-semibold">
                        {activePlan.end_date
                          ? formatDate(activePlan.end_date)
                          : "Não definido"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4">
                    <h3 className="mb-3 text-sm font-bold">
                      Cuidados previstos
                    </h3>

                    {activeNeeds.length > 0 ? (
                      <div className="space-y-2">
                        {activeNeeds.map((need) => (
                          <div
                            key={need.id}
                            className="rounded-xl bg-background p-3"
                          >
                            <p className="text-sm font-semibold">
                              {need.description}
                            </p>

                            <p className="mt-2 text-xs text-muted">
                              Tipo: {need.need_type_name || "Não informado"}
                            </p>

                            <p className="mt-1 text-xs text-muted">
                              Prioridade: {need.priority}
                            </p>

                            <p className="mt-1 text-xs text-muted">
                              Frequência:{" "}
                              {frequencyText(
                                need.frequency_quantity,
                                need.frequency_period,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-muted">
                              Profissional:{" "}
                              {need.professional_name || "Não definido"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted">
                        Nenhuma necessidade ativa vinculada ao plano.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <EmptyState>
                  Não existe plano de cuidados ativo disponível.
                </EmptyState>
              )}
            </section>

            <section>
              <SectionTitle
                title="Escala de cuidados"
                description="Frequências organizadas para seu atendimento."
              />

              {activeScale ? (
                <div className="space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-bold">Escala #{activeScale.id}</h3>

                    <span className="rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary-dark">
                      {scaleStatusLabels[activeScale.status]}
                    </span>
                  </div>

                  <p className="text-xs text-muted">
                    Período: {formatDate(activeScale.start_date)} até{" "}
                    {activeScale.end_date
                      ? formatDate(activeScale.end_date)
                      : "Não definido"}
                  </p>

                  {activeScale.observation && (
                    <p className="text-sm text-muted">
                      {activeScale.observation}
                    </p>
                  )}

                  {activeScale.items.filter((item) => !item.removed_at).length >
                  0 ? (
                    <div className="space-y-2">
                      {activeScale.items
                        .filter((item) => !item.removed_at)
                        .map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl bg-background p-3"
                          >
                            <p className="text-sm font-semibold">
                              {item.description}
                            </p>

                            <p className="mt-1 text-xs text-muted">
                              Frequência:{" "}
                              {frequencyText(
                                item.frequency_quantity,
                                item.frequency_period,
                              )}
                            </p>

                            {item.observation && (
                              <p className="mt-1 text-xs text-muted">
                                {item.observation}
                              </p>
                            )}

                            <div className="mt-2 space-y-1">
                              {item.assignments
                                .filter((assignment) => !assignment.removed_at)
                                .map((assignment) => (
                                  <p
                                    key={assignment.id}
                                    className="text-xs text-muted"
                                  >
                                    {assignment.full_name} ·{" "}
                                    {assignment.profession_name}
                                  </p>
                                ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted">
                      Nenhum cuidado ativo cadastrado nesta escala.
                    </p>
                  )}
                </div>
              ) : (
                <EmptyState>Não existe escala ativa disponível.</EmptyState>
              )}
            </section>
          </div>
        </div>

        <section>
          <SectionTitle
            title="Meu perfil"
            description="Seus dados cadastrais básicos."
          />

          <div className="grid gap-5 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-muted">Nome completo</p>
              <p className="mt-1 text-sm font-semibold">{patient.full_name}</p>
            </div>

            <div>
              <p className="text-xs text-muted">Idade</p>
              <p className="mt-1 text-sm font-semibold">
                {patient.age ? `${patient.age} anos` : "Não informada"}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted">Telefone</p>
              <p className="mt-1 text-sm font-semibold">
                {patient.phone || "Não informado"}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted">Médico responsável</p>
              <p className="mt-1 text-sm font-semibold">
                {patient.responsible_doctor_name || "Não informado"}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs text-muted">Endereço</p>
              <p className="mt-1 text-sm font-semibold">
                {address
                  ? `${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ""}, ${address.neighborhood}, ${address.city} - ${address.state}`
                  : "Endereço não informado"}
              </p>
            </div>
          </div>
        </section>

        <footer className="border-t border-line py-5 text-center text-xs text-muted">
          LarVita · Sistema de acompanhamento de Home Care
        </footer>
      </main>
    </div>
  );
}
