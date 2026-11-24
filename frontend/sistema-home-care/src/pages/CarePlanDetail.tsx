import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { canPlan, canManagePlanNeeds, getPlan, updatePlan, planHistory, planStatusLabels, frequencyLabels, availableNeeds, attachPlanNeed, allowedStatusActions, changePlanStatus, statusActionLabels, type PlanStatusAction, type AvailableNeed, type CarePlan, type PlanHistory } from '../lib/carePlans';
import { NEED_PRIORITIES } from '../lib/assessments';
import { PlanNeedConfiguration } from '../components/PlanNeedConfiguration';
import { PlanNeedRemoval } from '../components/PlanNeedRemoval';

const historyEventLabels: Record<string, string> = {
  CREATE: 'Criação', UPDATE: 'Edição do plano', STATUS: 'Alteração de status',
  ADD_NEED: 'Vínculo de necessidade', CONFIGURE_NEED: 'Configuração de necessidade', REMOVE_NEED: 'Remoção de necessidade',
};

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
  const [removing, setRemoving] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [available, setAvailable] = useState<AvailableNeed[]>([]);
  const [selectedNeed, setSelectedNeed] = useState('');
  const [message, setMessage] = useState('');
  const permitted = canPlan(user, 'view');
  useEffect(() => {
    if (!permitted) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true); setError(''); setPlan(null); setEvents(null); setEditing(false); setConfiguring(null); setRemoving(null); setAdding(false);
      return getPlan(Number(id));
    }).then(value => { if (!cancelled && value) setPlan(value); })
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
  async function changeStatus(action: PlanStatusAction) {
    if (!plan) return;
    const description = action === 'encerrar' ? 'As necessidades identificadas serão preservadas.'
      : action === 'reativar' ? 'O mesmo plano será reativado, mantendo seu histórico.'
      : 'Todas as necessidades devem ter profissional e frequência configurados.';
    if (!window.confirm(`${statusActionLabels[action]} este plano? ${description}`)) return;
    setBusy(true); setError(''); setMessage('');
    try { const updated = await changePlanStatus(plan.id, action); setPlan(updated); setEvents(null); setMessage(`Plano ${planStatusLabels[updated.status].toLowerCase()}.`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Falha ao alterar status.'); }
    finally { setBusy(false); }
  }
  if (!permitted) return <p role="alert" className="p-6">Você não tem permissão para visualizar planos.</p>;
  if (loading) return <p className="p-6">Carregando…</p>;
  if (!plan) return <p role="alert" className="p-6 text-red-700">{error || 'Plano não encontrado.'}</p>;
  return <div className="mx-auto max-w-3xl space-y-4 p-6">
    <div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-semibold">Plano #{plan.id}</h1><p>{plan.patient_name} · {planStatusLabels[plan.status]}</p></div><Link className="text-primary underline" to={`/pacientes/${plan.patient}/planos-cuidados`}>Planos do paciente</Link></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {message && <p role="status" className="text-green-700">{message}</p>}
    <div className="flex gap-2">{allowedStatusActions(user, plan.status).map(action => <button key={action} className="rounded border px-3 py-2 disabled:opacity-50" disabled={busy || editing || adding || configuring !== null || removing !== null} onClick={() => void changeStatus(action)}>{busy ? 'Processando…' : statusActionLabels[action]}</button>)}</div>
    <section className="space-y-3 rounded-lg bg-surface p-4 shadow"><h2 className="font-semibold">Dados do plano</h2>
      {editing ? <form onSubmit={save}><fieldset disabled={busy} className="space-y-3">
        <label className="block">Data de início<input className="ml-2 rounded border p-2" type="date" required value={start} onChange={e => setStart(e.target.value)} /></label>
        <label className="block">Data de encerramento (opcional)<input className="ml-2 rounded border p-2" type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
        <label className="block">Descrição / objetivo<textarea className="mt-1 w-full rounded border p-2" value={objective} onChange={e => setObjective(e.target.value)} /></label>
        <button className="mr-2 rounded border px-3 py-2" type="submit">{busy ? 'Salvando…' : 'Salvar'}</button><button type="button" className="rounded border px-3 py-2" onClick={() => setEditing(false)}>Cancelar</button>
      </fieldset></form> : <><dl className="space-y-2"><div><dt className="text-muted">Data de início</dt><dd>{plan.start_date}</dd></div><div><dt className="text-muted">Data de encerramento</dt><dd>{plan.end_date || '—'}</dd></div><div><dt className="text-muted">Descrição / objetivo</dt><dd className="whitespace-pre-wrap">{plan.objective || '—'}</dd></div><div><dt className="text-muted">Criado em</dt><dd>{new Date(plan.created_at).toLocaleString('pt-BR')} · {plan.created_by_name || (plan.created_by ? `Usuário #${plan.created_by}` : 'Autor não disponível')}</dd></div><div><dt className="text-muted">Atualizado em</dt><dd>{new Date(plan.updated_at).toLocaleString('pt-BR')} · {plan.updated_by_name || (plan.updated_by ? `Usuário #${plan.updated_by}` : 'Autor não disponível')}</dd></div></dl>
        {canPlan(user, 'update') && <button disabled={busy || configuring !== null || removing !== null || adding} className="rounded border px-3 py-2" onClick={() => { setStart(plan.start_date); setEnd(plan.end_date || ''); setObjective(plan.objective); setEditing(true); }}>Editar plano</button>}</>}
    </section>
    <section className="space-y-3 rounded-lg bg-surface p-4 shadow"><h2 className="font-semibold">Necessidades vinculadas</h2>
      {canManagePlanNeeds(user) && !adding && <button className="rounded border px-3 py-2 disabled:opacity-50" disabled={busy || editing || configuring !== null || removing !== null} onClick={() => void openAdd()}>Vincular necessidade</button>}
      {adding && <form onSubmit={addNeed}><fieldset disabled={busy} className="space-y-2"><label className="block">Necessidade identificada<select className="ml-2 rounded border p-2" required value={selectedNeed} onChange={e => setSelectedNeed(e.target.value)}><option value="">Selecione</option>{available.map(need => <option key={need.id} value={need.id}>{need.need_type__name} · {need.description}</option>)}</select></label>{!available.length && <p>Nenhuma necessidade ativa disponível para novo vínculo.</p>}<button className="mr-2 rounded border px-3 py-2" type="submit" disabled={!available.length}>Vincular</button><button className="rounded border px-3 py-2" type="button" onClick={() => setAdding(false)}>Cancelar vínculo</button></fieldset></form>}
      {!plan.need_links.length && <p>Nenhuma necessidade vinculada.</p>}
      <ul className="space-y-3">{plan.need_links.map(need => <li key={need.id} className="space-y-1 rounded border p-3"><h3 className="font-medium">{need.need_type_name} · {need.description}</h3><p>Prioridade: {NEED_PRIORITIES.find(priority => priority.value === need.priority)?.label || need.priority}</p>
        <p>Profissional: {need.professional_name || 'A configurar'}</p><p>Frequência: {need.frequency_quantity && need.frequency_period ? `${need.frequency_quantity} por ${frequencyLabels[need.frequency_period]}` : 'A configurar'}</p>
        {need.removed_at && <p className="text-ink">Removida em {new Date(need.removed_at).toLocaleString('pt-BR')} · {need.removal_reason}</p>}
        {!need.resources.length ? <p className="text-ink">Sem recursos.</p> : <ul>{need.resources.map(resource => <li key={resource.id}>{resource.resource_name} · quantidade {resource.quantity}{resource.observation && ` · ${resource.observation}`}</li>)}</ul>}
        {!need.removed_at && canManagePlanNeeds(user) && <div className="flex flex-wrap gap-2"><button className="rounded border px-3 py-2 disabled:opacity-50" disabled={busy || editing || adding || configuring !== null || removing !== null} onClick={() => { setConfiguring(need.id); setError(''); }}>Configurar necessidade</button><button className="rounded border border-red-300 px-3 py-2 text-red-700 disabled:opacity-50" disabled={busy || editing || adding || configuring !== null || removing !== null || plan.need_links.filter(item => !item.removed_at).length <= 1} title={plan.need_links.filter(item => !item.removed_at).length <= 1 ? 'O plano precisa manter ao menos uma necessidade vigente.' : undefined} onClick={() => { setRemoving(need.id); setError(''); }}>Remover do plano</button></div>}
        {configuring === need.id && <PlanNeedConfiguration key={need.id} planId={plan.id} need={need} onBusy={setBusy} onCancel={() => setConfiguring(null)} onSave={updated => { setPlan(updated); setConfiguring(null); setEvents(null); }} />}
        {removing === need.id && <PlanNeedRemoval planId={plan.id} linkId={need.id} onBusy={setBusy} onCancel={() => setRemoving(null)} onSave={updated => { setPlan(updated); setRemoving(null); setEvents(null); }} />}
      </li>)}</ul>
    </section>
    <section className="rounded-lg bg-surface p-4 shadow"><button disabled={busy || editing || configuring !== null || removing !== null || adding} className="rounded border px-3 py-2 disabled:opacity-50" onClick={() => void showHistory()}>Ver histórico de alterações</button>
      {events && <ol className="mt-3 space-y-3">{events.map(event => <li key={event.id} className="rounded border p-3"><p className="font-medium">{historyEventLabels[event.event_type] || event.event_type} · {new Date(event.changed_at).toLocaleString('pt-BR')}</p><p>{event.description}</p><p className="text-sm text-muted">Responsável: {event.actor_name || (event.changed_by ? `Usuário #${event.changed_by}` : 'Autor excluído')}</p>{Object.keys(event.previous_data || {}).length > 0 && <details className="mt-2"><summary className="cursor-pointer">Dados anteriores</summary><pre className="mt-1 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(event.previous_data, null, 2)}</pre></details>}{Object.keys(event.new_data || {}).length > 0 && <details className="mt-2"><summary className="cursor-pointer">Dados registrados</summary><pre className="mt-1 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(event.new_data, null, 2)}</pre></details>}</li>)}</ol>}
    </section>
  </div>;
}
