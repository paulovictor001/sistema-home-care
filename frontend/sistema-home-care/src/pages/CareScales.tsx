import {useEffect, useState, type FormEvent} from 'react';
import {Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {useAuth} from '../contexts/useAuth';
import {canScale, listScales, scalePlans, createScale, scaleStatusLabels, type CareScale, type ScalePlanOption} from '../lib/careScales';

export function CareScales() {
  const {user} = useAuth(); const {patientId} = useParams(); const navigate = useNavigate();
  const [params, setParams] = useSearchParams(); const page = Math.max(1, Number(params.get('page')) || 1);
  const [items, setItems] = useState<CareScale[]>([]); const [next, setNext] = useState(false);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [creating, setCreating] = useState(false); const [busy, setBusy] = useState(false);
  const [plans, setPlans] = useState<ScalePlanOption[]>([]); const [planId, setPlanId] = useState('');
  const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [observation, setObservation] = useState('');
  useEffect(() => {
    let cancelled = false; setLoading(true); setError('');
    listScales(page, patientId ? Number(patientId) : undefined).then(list => {if (!cancelled) {setItems(list.results); setNext(!!list.next);}})
      .catch(err => {if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao carregar escalas.');})
      .finally(() => {if (!cancelled) setLoading(false);});
    return () => {cancelled = true;};
  }, [page, patientId]);
  async function openCreate() {
    setBusy(true); setError('');
    try {const catalog = await scalePlans(); setPlans(catalog.filter(plan => !patientId || plan.patient === Number(patientId))); setPlanId(''); setCreating(true);}
    catch (err) {setError(err instanceof Error ? err.message : 'Falha ao carregar planos.');} finally {setBusy(false);}
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); const plan = plans.find(value => value.id === Number(planId)); if (!plan) return;
    setBusy(true); setError('');
    try {const scale = await createScale({patient: plan.patient, care_plan: plan.id, start_date: start, end_date: end, observation}); navigate(`/escalas/${scale.id}`);}
    catch (err) {setError(err instanceof Error ? err.message : 'Falha ao criar escala.');} finally {setBusy(false);}
  }
  return <div className="mx-auto max-w-4xl space-y-4">
    <h1 className="text-2xl font-semibold">Escalas</h1>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {canScale(user, 'create') && !creating && <button disabled={busy} className="rounded border p-2" onClick={() => void openCreate()}>Nova escala</button>}
    {creating && <form onSubmit={submit} className="rounded bg-white p-4 shadow"><fieldset disabled={busy} className="space-y-3">
      <h2 className="font-semibold">Nova escala · Rascunho</h2>
      <label className="block">Paciente / Plano<select className="ml-2 rounded border p-2" required value={planId} onChange={e => {setPlanId(e.target.value); const plan = plans.find(value => value.id === Number(e.target.value)); setStart(plan?.start_date || ''); setEnd(plan?.end_date || '');}}><option value="">Selecione</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.patient_name} · Plano #{plan.id}</option>)}</select></label>
      {!plans.length && <p>Nenhum plano disponível. Registre o Plano de Cuidados primeiro.</p>}
      <label className="block">Início<input className="ml-2 rounded border p-2" type="date" required value={start} onChange={e => setStart(e.target.value)} /></label>
      <label className="block">Fim<input className="ml-2 rounded border p-2" type="date" required min={start} value={end} onChange={e => setEnd(e.target.value)} /></label>
      <label className="block">Observação geral (opcional)<textarea className="block w-full rounded border p-2" value={observation} onChange={e => setObservation(e.target.value)} /></label>
      <button className="mr-2 rounded border p-2" disabled={!plans.length} type="submit">{busy ? 'Salvando…' : 'Criar escala'}</button><button className="rounded border p-2" type="button" onClick={() => setCreating(false)}>Cancelar</button>
    </fieldset></form>}
    {loading ? <p>Carregando…</p> : !items.length ? <p>Nenhuma escala disponível.</p> : <ul className="space-y-2">{items.map(scale => <li key={scale.id} className="rounded bg-white p-4 shadow"><Link className="text-blue-700 underline" to={`/escalas/${scale.id}`}>Escala #{scale.id} · {scale.patient_name}</Link><p>{scaleStatusLabels[scale.status]} · {scale.start_date} a {scale.end_date}</p></li>)}</ul>}
    <div className="flex gap-3"><button disabled={loading || page <= 1} onClick={() => setParams({page: String(page - 1)})}>Anterior</button><span>Página {page}</span><button disabled={loading || !next} onClick={() => setParams({page: String(page + 1)})}>Próxima</button></div>
  </div>;
}
