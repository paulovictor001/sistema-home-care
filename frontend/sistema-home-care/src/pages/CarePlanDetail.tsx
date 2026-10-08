import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { canPlan, getPlan, updatePlan, planHistory, planStatusLabels, frequencyLabels, availableNeeds, attachPlanNeed, type AvailableNeed, type CarePlan, type PlanHistory } from '../lib/carePlans';
import { NEED_PRIORITIES } from '../lib/assessments';
import { PlanNeedConfiguration } from '../components/PlanNeedConfiguration';

export function CarePlanDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [plan, setPlan] = useState<CarePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [objective, setObjective] = useState('');
  const [events, setEvents] = useState<PlanHistory[] | null>(null);
  const [configuring, setConfiguring] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [available, setAvailable] = useState<AvailableNeed[]>([]);
  const [selectedNeed, setSelectedNeed] = useState('');
  const permitted = canPlan(user, 'view');
  useEffect(() => {
    if (!permitted) return;
    let cancelled = false;
    setLoading(true); setError(''); setPlan(null); setEvents(null); setEditing(false); setConfiguring(null); setAdding(false);
    getPlan(Number(id)).then(value => { if (!cancelled) setPlan(value); })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao carregar plano.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, permitted]);
  async function save(event: FormEvent) {
    event.preventDefault(); if (!plan) return;
    setBusy(true); setError('');
    try { setPlan(await updatePlan(plan.id, { start_date: start, end_date: end || null, objective })); setEditing(false); setEvents(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Falha ao salvar plano.'); }
    finally { setBusy(false); }
  }
  async function showHistory() {
    if (!plan) return;
    setBusy(true); setError('');
    try { setEvents(await planHistory(plan.id)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Falha ao carregar histórico.'); }
    finally { setBusy(false); }
  }
  async function openAdd() {
    if (!plan) return;
    setBusy(true); setError('');
    try { const needs = await availableNeeds(plan.patient); setAvailable(needs.filter(need => !plan.need_links.some(link => !link.removed_at && link.care_need === need.id))); setSelectedNeed(''); setAdding(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Falha ao carregar necessidades.'); }
    finally { setBusy(false); }
  }
  async function addNeed(event: FormEvent) {
    event.preventDefault(); if (!plan || !selectedNeed) return;
    setBusy(true); setError('');
    try { setPlan(await attachPlanNeed(plan.id, Number(selectedNeed))); setAdding(false); setEvents(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Falha ao vincular necessidade.'); }
    finally { setBusy(false); }
  }
  if (!permitted) return <p role="alert" className="p-6">Você não tem permissão para visualizar planos.</p>;
  if (loading) return <p className="p-6">Carregando…</p>;
  if (!plan) return <p role="alert" className="p-6 text-red-700">{error || 'Plano não encontrado.'}</p>;
  return <div className="mx-auto max-w-3xl space-y-4 p-6">
    <div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-semibold">Plano #{plan.id}</h1><p>{plan.patient_name} · {planStatusLabels[plan.status]}</p></div><Link className="text-blue-700 underline" to={`/pacientes/${plan.patient}/planos-cuidados`}>Planos do paciente</Link></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <section className="space-y-3 rounded-lg bg-white p-4 shadow"><h2 className="font-semibold">Dados do plano</h2>
      {editing ? <form onSubmit={save}><fieldset disabled={busy} className="space-y-3">
        <label className="block">Data de início<input className="ml-2 rounded border p-2" type="date" required value={start} onChange={e => setStart(e.target.value)} /></label>
        <label className="block">Data de encerramento (opcional)<input className="ml-2 rounded border p-2" type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
        <label className="block">Descrição / objetivo<textarea className="mt-1 w-full rounded border p-2" value={objective} onChange={e => setObjective(e.target.value)} /></label>
        <button className="mr-2 rounded border px-3 py-2" type="submit">{busy ? 'Salvando…' : 'Salvar'}</button><button type="button" className="rounded border px-3 py-2" onClick={() => setEditing(false)}>Cancelar</button>
      </fieldset></form> : <><dl className="space-y-2"><div><dt className="text-gray-500">Data de início</dt><dd>{plan.start_date}</dd></div><div><dt className="text-gray-500">Data de encerramento</dt><dd>{plan.end_date || '—'}</dd></div><div><dt className="text-gray-500">Descrição / objetivo</dt><dd className="whitespace-pre-wrap">{plan.objective || '—'}</dd></div></dl>
        {canPlan(user, 'update') && <button disabled={busy || configuring !== null || adding} className="rounded border px-3 py-2" onClick={() => { setStart(plan.start_date); setEnd(plan.end_date || ''); setObjective(plan.objective); setEditing(true); }}>Editar plano</button>}</>}
    </section>
    <section className="space-y-3 rounded-lg bg-white p-4 shadow"><h2 className="font-semibold">Necessidades vinculadas</h2>
      {canPlan(user, 'update') && !adding && <button className="rounded border px-3 py-2 disabled:opacity-50" disabled={busy || editing || configuring !== null} onClick={() => void openAdd()}>Vincular necessidade</button>}
      {adding && <form onSubmit={addNeed}><fieldset disabled={busy} className="space-y-2"><label className="block">Necessidade identificada<select className="ml-2 rounded border p-2" required value={selectedNeed} onChange={e => setSelectedNeed(e.target.value)}><option value="">Selecione</option>{available.map(need => <option key={need.id} value={need.id}>{need.need_type__name} · {need.description}</option>)}</select></label>{!available.length && <p>Nenhuma necessidade ativa disponível para novo vínculo.</p>}<button className="mr-2 rounded border px-3 py-2" type="submit" disabled={!available.length}>Vincular</button><button className="rounded border px-3 py-2" type="button" onClick={() => setAdding(false)}>Cancelar vínculo</button></fieldset></form>}
      {!plan.need_links.length && <p>Nenhuma necessidade vinculada.</p>}
      <ul className="space-y-3">{plan.need_links.map(need => <li key={need.id} className="space-y-1 rounded border p-3"><h3 className="font-medium">{need.need_type_name} · {need.description}</h3><p>Prioridade: {NEED_PRIORITIES.find(priority => priority.value === need.priority)?.label || need.priority}</p>
        <p>Profissional: {need.professional_name || 'A configurar'}</p><p>Frequência: {need.frequency_quantity && need.frequency_period ? `${need.frequency_quantity} por ${frequencyLabels[need.frequency_period]}` : 'A configurar'}</p>
        {need.removed_at && <p className="text-gray-600">Removida em {new Date(need.removed_at).toLocaleString('pt-BR')} · {need.removal_reason}</p>}
        {!need.resources.length ? <p className="text-gray-600">Sem recursos.</p> : <ul>{need.resources.map(resource => <li key={resource.id}>{resource.resource_name} · quantidade {resource.quantity}{resource.observation && ` · ${resource.observation}`}</li>)}</ul>}
        {!need.removed_at && canPlan(user, 'update') && <button className="rounded border px-3 py-2 disabled:opacity-50" disabled={busy || editing || adding || configuring !== null} onClick={() => { setConfiguring(need.id); setError(''); }}>Configurar necessidade</button>}
        {configuring === need.id && <PlanNeedConfiguration key={need.id} planId={plan.id} need={need} onBusy={setBusy} onCancel={() => setConfiguring(null)} onSave={updated => { setPlan(updated); setConfiguring(null); setEvents(null); }} />}
      </li>)}</ul>
    </section>
    <section className="rounded-lg bg-white p-4 shadow"><button disabled={busy || editing || configuring !== null || adding} className="rounded border px-3 py-2 disabled:opacity-50" onClick={() => void showHistory()}>Ver histórico de alterações</button>
      {events && <ul className="mt-3 space-y-2">{events.map(event => <li key={event.id}>{new Date(event.changed_at).toLocaleString('pt-BR')} · {event.description} · {event.changed_by ? `Usuário #${event.changed_by}` : 'Autor excluído'}</li>)}</ul>}
    </section>
  </div>;
}
