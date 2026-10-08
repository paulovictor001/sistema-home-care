import { useEffect, useState, type FormEvent } from 'react';
import { configurePlanNeed, planProfessionals, planResources, frequencyLabels, type CarePlan, type PlanNeed, type PlanProfessional, type CatalogResource, type FrequencyPeriod } from '../lib/carePlans';

export function PlanNeedConfiguration({ planId, need, onSave, onCancel, onBusy }: {
  planId: number; need: PlanNeed; onSave: (plan: CarePlan) => void; onCancel: () => void; onBusy: (busy: boolean) => void;
}) {
  const [professionals, setProfessionals] = useState<PlanProfessional[]>([]);
  const [resources, setResources] = useState<CatalogResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [professional, setProfessional] = useState(String(need.required_professional || ''));
  const [quantity, setQuantity] = useState(String(need.frequency_quantity || ''));
  const [period, setPeriod] = useState<FrequencyPeriod>(need.frequency_period || 'DAY');
  const [rows, setRows] = useState(need.resources.map(resource => ({ resource: String(resource.resource), quantity: String(resource.quantity), observation: resource.observation })));
  const input = 'mt-1 w-full rounded border border-gray-300 p-2';
  const button = 'rounded border px-3 py-2 text-sm disabled:opacity-50';
  useEffect(() => {
    let cancelled = false;
    Promise.all([planProfessionals(), planResources()]).then(([people, catalog]) => {
      if (!cancelled) { setProfessionals(people); setResources(catalog); }
    }).catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Falha ao carregar cadastros.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!professional || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 || rows.some(row => !row.resource || !Number.isInteger(Number(row.quantity)) || Number(row.quantity) < 1)) {
      setError('Selecione o profissional e os recursos e informe quantidades inteiras maiores que zero.'); return;
    }
    setBusy(true); onBusy(true);
    try { onSave(await configurePlanNeed(planId, need.id, { required_professional: Number(professional), frequency_quantity: Number(quantity), frequency_period: period,
      resources: rows.map(row => ({ resource: Number(row.resource), quantity: Number(row.quantity), observation: row.observation })) })); }
    catch (err) { setError(err instanceof Error ? err.message : 'Falha ao salvar configuração.'); }
    finally { setBusy(false); onBusy(false); }
  }
  return <form onSubmit={submit} className="mt-3 space-y-3 border-t pt-3">
    <h4 className="font-medium">Configurar necessidade</h4>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loading && <p>Carregando cadastros…</p>}
    <fieldset disabled={busy || loading || !professionals.length} className="space-y-3">
      <label className="block">Profissional necessário<select className={input} required value={professional} onChange={e => setProfessional(e.target.value)}><option value="">Selecione um profissional</option>{professionals.map(person => <option key={person.id} value={person.id}>{person.full_name} — {person.profession__name}{!person.is_active && ' (inativo)'}</option>)}</select></label>
      <div className="grid gap-3 sm:grid-cols-2"><label>Quantidade da frequência<input className={input} required type="number" min="1" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} /></label><label>Período<select className={input} value={period} onChange={e => setPeriod(e.target.value as FrequencyPeriod)}>{Object.entries(frequencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <fieldset className="space-y-2"><legend className="font-medium">Recursos (opcionais)</legend>
        {rows.map((row, index) => <div key={index} className="space-y-2 rounded border p-3">
          <label className="block">Recurso {index + 1}<select className={input} required value={row.resource} onChange={e => setRows(current => current.map((item, i) => i === index ? { ...item, resource: e.target.value } : item))}><option value="">Selecione um recurso</option>{resources.map(resource => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</select></label>
          <label className="block">Quantidade do recurso {index + 1}<input className={input} type="number" min="1" step="1" required value={row.quantity} onChange={e => setRows(current => current.map((item, i) => i === index ? { ...item, quantity: e.target.value } : item))} /></label>
          <label className="block">Observação do recurso {index + 1}<input className={input} value={row.observation} onChange={e => setRows(current => current.map((item, i) => i === index ? { ...item, observation: e.target.value } : item))} /></label>
          <button className={button} type="button" onClick={() => setRows(current => current.filter((_, i) => i !== index))}>Retirar recurso {index + 1}</button>
        </div>)}
        <button className={button} type="button" disabled={!resources.length} onClick={() => setRows(current => [...current, { resource: '', quantity: '1', observation: '' }])}>Adicionar recurso</button>
        {!loading && !resources.length && <p>Nenhum recurso cadastrado. É possível salvar sem recursos.</p>}
      </fieldset>
      <button className={button} type="submit">{busy ? 'Salvando…' : 'Salvar configuração'}</button>
    </fieldset>
    {!loading && !professionals.length && <p>Nenhum profissional cadastrado. Cadastre um profissional antes de configurar.</p>}
    <button className={button} type="button" disabled={busy} onClick={onCancel}>Cancelar configuração</button>
  </form>;
}
