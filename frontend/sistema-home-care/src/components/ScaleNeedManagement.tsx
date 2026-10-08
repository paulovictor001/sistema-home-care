import {useState, type FormEvent} from 'react';
import {frequencyLabels, type FrequencyPeriod} from '../lib/carePlans';
import {configureScaleNeed, scaleProfessionals, addScaleProfessional, removeScaleProfessional, substituteScaleProfessional, removeScaleNeed, saveProfessionalPlanning, type CareScale, type ScaleNeed, type ScaleProfessional} from '../lib/careScales';

export function ScaleNeedManagement({scale, item, onChange}: {scale: CareScale; item: ScaleNeed; onChange: (value: CareScale) => void}) {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [options, setOptions] = useState<ScaleProfessional[]>([]); const [selected, setSelected] = useState('');
  const [quantity, setQuantity] = useState(item.frequency_quantity || 1); const [period, setPeriod] = useState<FrequencyPeriod>(item.frequency_period || 'WEEK');
  const [reason, setReason] = useState(item.frequency_reason); const [observation, setObservation] = useState(item.observation);
  const [regions, setRegions] = useState(''); const [availability, setAvailability] = useState('');
  async function execute(operation: () => Promise<CareScale>) {
    setBusy(true); setError(''); try {onChange(await operation());} catch (err) {setError(err instanceof Error ? err.message : 'Falha ao alterar necessidade.');} finally {setBusy(false);}
  }
  async function load() {
    setBusy(true); setError(''); try {setOptions(await scaleProfessionals(scale.id, item.id)); setOpen(true);} catch (err) {setError(err instanceof Error ? err.message : 'Falha ao carregar profissionais.');} finally {setBusy(false);}
  }
  function frequency(event: FormEvent) {event.preventDefault(); void execute(() => configureScaleNeed(scale.id, item.id, {frequency_quantity: quantity, frequency_period: period, frequency_reason: reason, observation}));}
  async function planning(event: FormEvent) {
    event.preventDefault(); if (!selected) return; setBusy(true); setError('');
    try {await saveProfessionalPlanning(Number(selected), regions.split(',').map(value => value.trim()).filter(Boolean), availability); setOptions(await scaleProfessionals(scale.id, item.id));}
    catch (err) {setError(err instanceof Error ? err.message : 'Falha ao salvar planejamento.');} finally {setBusy(false);}
  }
  const professional = options.find(value => value.id === Number(selected));
  return <div className="space-y-3">
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!open ? <button className="rounded border p-2" disabled={busy} onClick={() => void load()}>Gerenciar necessidade</button> : <fieldset disabled={busy} className="space-y-3 border-t pt-3">
      <form onSubmit={frequency} className="space-y-2">
        <label className="block">Quantidade por período<input className="ml-2 w-24 rounded border p-2" type="number" required min="1" step="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} /></label>
        <label className="block">Período da frequência<select className="ml-2 rounded border p-2" value={period} onChange={e => setPeriod(e.target.value as FrequencyPeriod)}>{Object.entries(frequencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="block">Motivo da frequência (opcional)<input className="block w-full rounded border p-2" value={reason} onChange={e => setReason(e.target.value)} /></label>
        <label className="block">Observação da necessidade (opcional)<textarea className="block w-full rounded border p-2" value={observation} onChange={e => setObservation(e.target.value)} /></label>
        <button className="rounded border p-2" type="submit">Salvar frequência e observação</button>
      </form>
      <label className="block">Profissional ativo compatível<select className="ml-2 rounded border p-2" value={selected} onChange={e => {setSelected(e.target.value); const option = options.find(value => value.id === Number(e.target.value)); setRegions(option?.regions.join(', ') || ''); setAvailability(option?.availability_notes || '');}}><option value="">Selecione</option>{options.map(value => <option key={value.id} value={value.id}>{value.full_name} · {value.profession_name}</option>)}</select></label>
      {!options.length && <p>Nenhum profissional ativo compatível. Verifique a profissão necessária no plano.</p>}
      {professional && <div className="space-y-2 rounded bg-slate-50 p-3"><p>Região do paciente: {professional.patient_region || 'Não informada'} · {professional.region_match === null ? 'Regiões atendidas não informadas' : professional.region_match ? 'Região atendida' : 'Verifique atendimento nesta região'}</p><p>Disponibilidade: {professional.availability_notes || 'Não informada'}</p>
        <details><summary>Editar informações de planejamento</summary><form onSubmit={planning} className="space-y-2"><label className="block">Regiões atendidas (separadas por vírgula)<input className="block w-full rounded border p-2" value={regions} onChange={e => setRegions(e.target.value)} /></label><label className="block">Observações de disponibilidade<textarea className="block w-full rounded border p-2" value={availability} onChange={e => setAvailability(e.target.value)} /></label><button className="rounded border p-2" type="submit">Salvar planejamento</button></form></details>
      </div>}
      <button className="rounded border p-2" disabled={!selected} onClick={() => void execute(() => addScaleProfessional(scale.id, item.id, Number(selected)))}>Adicionar profissional</button>
      <ul className="space-y-2">{item.assignments.filter(assignment => !assignment.removed_at).map(assignment => <li key={assignment.id} className="flex flex-wrap items-center gap-2"><span>{assignment.full_name}</span><button className="rounded border p-2" onClick={() => void execute(() => removeScaleProfessional(scale.id, item.id, assignment.id))}>Remover {assignment.full_name}</button><button className="rounded border p-2" disabled={!selected || Number(selected) === assignment.professional} onClick={() => void execute(() => substituteScaleProfessional(scale.id, item.id, assignment.id, Number(selected)))}>Substituir {assignment.full_name}</button></li>)}</ul>
      <button className="mr-2 rounded border p-2" onClick={() => {if (window.confirm('Remover esta necessidade da escala? Os vínculos atuais serão encerrados.')) void execute(() => removeScaleNeed(scale.id, item.id));}}>Remover necessidade</button><button className="rounded border p-2" onClick={() => setOpen(false)}>Fechar gerenciamento</button>
    </fieldset>}
  </div>;
}
