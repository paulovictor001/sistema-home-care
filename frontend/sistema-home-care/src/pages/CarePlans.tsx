import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import { canPlan, listPlans, createPlan, availableNeeds, planStatusLabels, type AvailableNeed, type CarePlan } from '../lib/carePlans';
import { getPatient } from '../lib/patients';

const input = 'mt-1 w-full rounded border border-gray-300 p-2';
const button = 'rounded border px-3 py-2 text-sm disabled:opacity-50';

export function CarePlans() {
  const { patientId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [items, setItems] = useState<CarePlan[]>([]);
  const [name, setName] = useState('');
  const [next, setNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [needs, setNeeds] = useState<AvailableNeed[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [objective, setObjective] = useState('');
  const [busy, setBusy] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const permitted = canPlan(user, 'view');

  useEffect(() => {
    if (!permitted) return;
    let cancelled = false;
    setLoading(true); setError('');
    Promise.all([getPatient(Number(patientId)), listPlans(Number(patientId), page)])
      .then(([patient, list]) => { if (!cancelled) { setName(patient.full_name); setItems(list.results); setNext(!!list.next); } })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao carregar planos.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [patientId, page, permitted]);

  async function openCreate() {
    setError(''); setCatalogLoading(true);
    try { setNeeds(await availableNeeds(Number(patientId))); setSelected([]); setCreating(true); }
    catch (err) { setError(err instanceof Error ? err.message : 'Falha ao carregar necessidades.'); }
    finally { setCatalogLoading(false); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!selected.length) { setError('Selecione ao menos uma necessidade.'); return; }
    setBusy(true);
    try {
      const plan = await createPlan({ patient: Number(patientId), start_date: start, end_date: end || null, objective, needs: selected });
      navigate(`/planos-cuidados/${plan.id}`);
    } catch (err) { setError(err instanceof Error ? err.message : 'Falha ao criar plano.'); }
    finally { setBusy(false); }
  }
  if (!permitted) return <p role="alert" className="p-6">Você não tem permissão para visualizar planos.</p>;
  return <div className="mx-auto max-w-3xl space-y-4 p-6">
    <div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-semibold">Planos de cuidados</h1><p>{name}</p></div>
      <Link className={button} to={`/pacientes/${patientId}`}>Paciente</Link></div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {canPlan(user, 'create') && !creating && <button className={button} disabled={catalogLoading} onClick={() => void openCreate()}>{catalogLoading ? 'Carregando necessidades…' : 'Novo plano'}</button>}
    {creating && <form onSubmit={submit} className="space-y-3 rounded-lg bg-white p-4 shadow"><h2 className="font-semibold">Novo plano · Rascunho</h2>
      <fieldset disabled={busy} className="space-y-3">
        <label className="block">Data de início<input className={input} type="date" required value={start} onChange={e => setStart(e.target.value)} /></label>
        <label className="block">Data de encerramento (opcional)<input className={input} type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
        <label className="block">Descrição / objetivo (opcional)<textarea className={input} value={objective} onChange={e => setObjective(e.target.value)} /></label>
        <fieldset className="space-y-2"><legend className="font-medium">Necessidades identificadas</legend>
          {!needs.length && <p>Nenhuma necessidade ativa identificada. Registre uma necessidade na avaliação antes de criar o plano.</p>}
          {needs.map(need => <label key={need.id} className="block"><input type="checkbox" checked={selected.includes(need.id)} onChange={e => setSelected(current => e.target.checked ? [...current, need.id] : current.filter(id => id !== need.id))} /> {need.need_type__name} · {need.description}</label>)}
        </fieldset>
        <div className="flex gap-2"><button className={button} disabled={!needs.length} type="submit">{busy ? 'Salvando…' : 'Criar plano'}</button><button className={button} type="button" onClick={() => setCreating(false)}>Cancelar</button></div>
      </fieldset></form>}
    {loading ? <p>Carregando…</p> : !items.length ? <p>Nenhum plano registrado.</p> : <ul className="space-y-2">{items.map(plan => <li key={plan.id} className="rounded-lg bg-white p-4 shadow"><Link className="font-medium text-blue-700 underline" to={`/planos-cuidados/${plan.id}`}>Plano #{plan.id} · {planStatusLabels[plan.status]}</Link><p>Início: {plan.start_date} · {plan.need_links.filter(need => !need.removed_at).length} necessidade(s)</p></li>)}</ul>}
    <div className="flex items-center gap-3"><button className={button} disabled={page <= 1 || loading} onClick={() => setParams({ page: String(page - 1) })}>Anterior</button><span>Página {page}</span><button className={button} disabled={!next || loading} onClick={() => setParams({ page: String(page + 1) })}>Próxima</button></div>
  </div>;
}
