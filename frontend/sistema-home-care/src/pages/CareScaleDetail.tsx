import {useEffect, useState, type FormEvent} from 'react';
import {Link, useParams} from 'react-router-dom';
import {useAuth} from '../contexts/useAuth';
import {canScale, getScale, updateScale, scaleStatusLabels, type CareScale} from '../lib/careScales';
import {frequencyLabels} from '../lib/carePlans';
import {scalePlans, addScaleNeed, type ScalePlanOption} from '../lib/careScales';
import {ScaleNeedManagement} from '../components/ScaleNeedManagement';
import {scaleSubstitutions, scaleAudit, type ScaleSubstitution, type ScaleAudit} from '../lib/careScales';

export function CareScaleDetail() {
  const {id} = useParams(); const {user} = useAuth();
  const [scale, setScale] = useState<CareScale | null>(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false);
  const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [observation, setObservation] = useState('');
  const [available, setAvailable] = useState<ScalePlanOption['needs'] | null>(null); const [selectedNeed, setSelectedNeed] = useState('');
  const [substitutions, setSubstitutions] = useState<ScaleSubstitution[] | null>(null); const [events, setEvents] = useState<ScaleAudit[] | null>(null);
  useEffect(() => {
    let cancelled = false; setScale(null); setLoading(true); setError(''); setEditing(false);
    getScale(Number(id)).then(value => {if (!cancelled) setScale(value);}).catch(err => {if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao carregar escala.');}).finally(() => {if (!cancelled) setLoading(false);});
    return () => {cancelled = true;};
  }, [id]);
  async function save(event: FormEvent) {
    event.preventDefault(); if (!scale) return; setBusy(true); setError('');
    try {setScale(await updateScale(scale.id, {start_date: start, end_date: end, observation})); setEditing(false);}
    catch (err) {setError(err instanceof Error ? err.message : 'Falha ao salvar escala.');} finally {setBusy(false);}
  }
  async function openNeeds() {
    if (!scale) return; setBusy(true); setError('');
    try {const plans = await scalePlans(); setAvailable(plans.find(plan => plan.id === scale.care_plan)?.needs.filter(need => !scale.items.some(item => !item.removed_at && item.plan_need === need.id)) || []); setSelectedNeed('');}
    catch (err) {setError(err instanceof Error ? err.message : 'Falha ao carregar necessidades.');} finally {setBusy(false);}
  }
  async function attachNeed(event: FormEvent) {
    event.preventDefault(); if (!scale || !selectedNeed) return; setBusy(true); setError('');
    try {setScale(await addScaleNeed(scale.id, Number(selectedNeed))); setAvailable(null);}
    catch (err) {setError(err instanceof Error ? err.message : 'Falha ao incluir necessidade.');} finally {setBusy(false);}
  }
  function changed(value: CareScale) {setScale(value); setSubstitutions(null); setEvents(null);}
  async function history() {
    if (!scale) return; setBusy(true); setError('');
    try {const [substitutionList, auditList] = await Promise.all([scaleSubstitutions(scale.id), scaleAudit(scale.id)]); setSubstitutions(substitutionList); setEvents(auditList);}
    catch (err) {setError(err instanceof Error ? err.message : 'Falha ao carregar histórico.');} finally {setBusy(false);}
  }
  if (loading) return <p>Carregando…</p>;
  if (!scale) return <p role="alert" className="text-red-700">{error || 'Escala não encontrada.'}</p>;
  return <div className="mx-auto max-w-4xl space-y-4">
    <div className="flex justify-between"><h1 className="text-2xl font-semibold">Escala #{scale.id}</h1><Link className="text-blue-700 underline" to="/escalas">Escalas</Link></div>
    <p>{scale.patient_name} · Plano #{scale.care_plan} · {scaleStatusLabels[scale.status]}</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <section className="space-y-3 rounded bg-white p-4 shadow"><h2 className="font-semibold">Dados da escala</h2>
      {editing ? <form onSubmit={save}><fieldset disabled={busy} className="space-y-3">
        <label className="block">Início<input className="ml-2 rounded border p-2" type="date" required value={start} onChange={e => setStart(e.target.value)} /></label>
        <label className="block">Fim<input className="ml-2 rounded border p-2" type="date" required min={start} value={end} onChange={e => setEnd(e.target.value)} /></label>
        <label className="block">Observação geral (opcional)<textarea className="block w-full rounded border p-2" value={observation} onChange={e => setObservation(e.target.value)} /></label>
        <button className="mr-2 rounded border p-2" type="submit">{busy ? 'Salvando…' : 'Salvar escala'}</button><button className="rounded border p-2" type="button" onClick={() => setEditing(false)}>Cancelar</button>
      </fieldset></form> : <><p>Período: {scale.start_date} a {scale.end_date}</p><p className="whitespace-pre-wrap">{scale.observation || 'Sem observação geral.'}</p>
        {canScale(user, 'update') && <button className="rounded border p-2" onClick={() => {setStart(scale.start_date); setEnd(scale.end_date); setObservation(scale.observation); setEditing(true);}}>Editar escala</button>}</>}
    </section>
    <section className="space-y-3 rounded bg-white p-4 shadow"><h2 className="font-semibold">Necessidades e profissionais</h2>
      {canScale(user, 'update') && !available && <button className="rounded border p-2" disabled={busy} onClick={() => void openNeeds()}>Adicionar necessidade</button>}
      {available && <form onSubmit={attachNeed}><fieldset disabled={busy} className="flex flex-wrap gap-2"><label>Necessidade do plano<select className="ml-2 rounded border p-2" required value={selectedNeed} onChange={e => setSelectedNeed(e.target.value)}><option value="">Selecione</option>{available.map(need => <option key={need.id} value={need.id}>{need.care_need__description}</option>)}</select></label><button className="rounded border p-2" disabled={!available.length} type="submit">Incluir necessidade</button><button className="rounded border p-2" type="button" onClick={() => setAvailable(null)}>Cancelar</button>{!available.length && <p>Nenhuma necessidade vigente disponível no plano.</p>}</fieldset></form>}
      {!scale.items.filter(item => !item.removed_at).length && <p>Nenhuma necessidade vigente nesta escala.</p>}
      {scale.items.map(item => <article key={item.id} className={`space-y-2 rounded border p-3 ${item.removed_at ? 'bg-gray-50 text-gray-600' : ''}`}>
        <h3 className="font-medium">{item.need_type} · {item.description}{item.removed_at ? ' · Removida da escala' : ''}</h3>
        <p>Frequência na escala: {item.frequency_quantity && item.frequency_period ? `${item.frequency_quantity} por ${frequencyLabels[item.frequency_period].toLowerCase()}` : 'Não configurada'}</p>
        <p>Referência do plano: {item.planned_quantity && item.planned_period ? `${item.planned_quantity} por ${frequencyLabels[item.planned_period].toLowerCase()}` : 'Não configurada'}</p>
        <p className="whitespace-pre-wrap">Observação: {item.observation || 'Não informada'}</p>
        <p className="whitespace-pre-wrap">Motivo da frequência: {item.frequency_reason || 'Não informado'}</p>
        <h4 className="font-medium">Profissionais vinculados</h4>
        {!item.assignments.filter(assignment => !assignment.removed_at).length && <p>Nenhum profissional vigente.</p>}
        <ul>{item.assignments.map(assignment => <li key={assignment.id}>{assignment.full_name} · {assignment.profession_name}{assignment.removed_at ? ' · Vínculo encerrado' : ''}</li>)}</ul>
        {!item.removed_at && canScale(user, 'update') && <ScaleNeedManagement key={`${scale.id}-${item.id}`} scale={scale} item={item} onChange={changed} />}
      </article>)}
    </section>
    <section className="space-y-3 rounded bg-white p-4 shadow"><h2 className="font-semibold">Histórico da escala</h2><button className="rounded border p-2" disabled={busy} onClick={() => void history()}>Consultar histórico</button>
      {substitutions && <><h3 className="font-medium">Substituições de profissionais</h3>{!substitutions.length ? <p>Nenhuma substituição registrada.</p> : <ul className="space-y-2">{substitutions.map(value => <li key={value.id}>{value.previous_name} → {value.new_name} · Necessidade #{value.item || 'Histórica'} · {value.actor_name} · {new Date(value.created_at).toLocaleString('pt-BR')}</li>)}</ul>}</>}
      {events && <><h3 className="font-medium">Auditoria</h3>{!events.length ? <p>Nenhuma alteração registrada.</p> : <ul className="space-y-2">{events.map(value => <li key={value.id}>{value.action} · {value.actor_name} · {new Date(value.created_at).toLocaleString('pt-BR')}</li>)}</ul>}</>}
    </section>
  </div>;
}
