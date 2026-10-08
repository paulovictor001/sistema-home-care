import {useEffect, useState, type FormEvent} from 'react';
import {Link, useParams} from 'react-router-dom';
import {useAuth} from '../contexts/useAuth';
import {canScale, getScale, updateScale, scaleStatusLabels, type CareScale} from '../lib/careScales';

export function CareScaleDetail() {
  const {id} = useParams(); const {user} = useAuth();
  const [scale, setScale] = useState<CareScale | null>(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [editing, setEditing] = useState(false); const [busy, setBusy] = useState(false);
  const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [observation, setObservation] = useState('');
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
  </div>;
}
