import { useState, type FormEvent } from 'react';
import { removePlanNeed, type CarePlan } from '../lib/carePlans';

export function PlanNeedRemoval({ planId, linkId, onSave, onCancel, onBusy }: {
  planId: number; linkId: number; onSave: (plan: CarePlan) => void; onCancel: () => void; onBusy: (busy: boolean) => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!reason.trim()) { setError('Informe o motivo da remoção.'); return; }
    setBusy(true); onBusy(true);
    try { onSave(await removePlanNeed(planId, linkId, reason)); }
    catch (err) { setError(err instanceof Error ? err.message : 'Falha ao remover vínculo.'); }
    finally { setBusy(false); onBusy(false); }
  }
  return <form onSubmit={submit} className="mt-3 space-y-3 border-t pt-3">
    <p>A remoção retira o vínculo deste plano. Ela não exclui nem inativa a necessidade identificada; seu registro e histórico serão preservados.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <fieldset disabled={busy} className="space-y-3">
      <label className="block">Motivo da remoção<textarea className="mt-1 w-full rounded border p-2" required value={reason} onChange={e => setReason(e.target.value)} /></label>
      <div className="flex gap-2"><button className="rounded border border-red-300 px-3 py-2 text-red-700" type="submit">{busy ? 'Removendo…' : 'Confirmar remoção'}</button><button className="rounded border px-3 py-2" type="button" onClick={onCancel}>Cancelar remoção</button></div>
    </fieldset>
  </form>;
}
