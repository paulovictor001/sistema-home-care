import { useEffect, useState } from "react";
import { ApiError } from "../lib/api";
import { listNeedTypes, NEED_PRIORITIES, updateNeed, type CareNeed, type NeedType } from "../lib/assessments";
import { parseFieldErrors } from "../lib/patients";

const inputClass = "w-full rounded border border-gray-300 px-3 py-2 disabled:bg-gray-100";

export function NeedEditForm({ need, onSave, onCancel }: {
  need: CareNeed;
  onSave: (need: CareNeed) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState(String(need.need_type));
  const [description, setDescription] = useState(need.description);
  const [priority, setPriority] = useState(need.priority);
  const [types, setTypes] = useState<NeedType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [catalogError, setCatalogError] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let cancelled = false;
    listNeedTypes().then((data) => {
      if (!cancelled) setTypes(data);
    }).catch(() => {
      if (!cancelled) setCatalogError(true);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      onSave(await updateNeed(need.id, {
        need_type: Number(type), description: description.trim(), priority,
      }));
    } catch (error) {
      setErrors(parseFieldErrors(error instanceof ApiError ? error.message : "Não foi possível salvar a necessidade."));
    } finally {
      setSaving(false);
    }
  }

  function fieldErrors(field: string) {
    return errors[field]?.map((message) => <p key={message} className="mt-1 text-xs text-red-600">{message}</p>);
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="mt-3 rounded bg-slate-50 p-3" aria-label="Editar necessidade">
      <h3 className="mb-3 font-semibold">Editar necessidade</h3>
      {errors.detail && <p role="alert" className="mb-2 text-red-600">{errors.detail.join(" ")}</p>}
      {catalogError && <p role="alert" className="mb-2 text-red-600">Não foi possível carregar outros tipos. Você pode manter o tipo atual.</p>}
      <fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2">
        <label>
          <span className="mb-1 block font-medium">Tipo *</span>
          <select value={type} onChange={(event) => setType(event.target.value)} required disabled={loading} className={inputClass}>
            {!types.some((item) => item.id === need.need_type) && (
              <option value={need.need_type}>{need.need_type_name ?? "Tipo atual"} (atual)</option>
            )}
            {types.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          {fieldErrors("need_type")}
        </label>
        <label>
          <span className="mb-1 block font-medium">Prioridade *</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value)} required className={inputClass}>
            {NEED_PRIORITIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          {fieldErrors("priority")}
        </label>
        <label className="sm:col-span-2">
          <span className="mb-1 block font-medium">Descrição *</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} required rows={3} className={inputClass} />
          {fieldErrors("description")}
        </label>
        <p className="text-gray-600 sm:col-span-2">Status: Identificada · Situação: {need.is_active ? "Ativa" : "Inativa"}</p>
      </fieldset>
      <div className="mt-3 flex gap-2">
        <button type="submit" disabled={saving || loading || !description.trim()} className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50">{saving ? "Salvando…" : "Salvar necessidade"}</button>
        <button type="button" disabled={saving} onClick={onCancel} className="rounded border px-3 py-2 disabled:opacity-50">Cancelar</button>
      </div>
    </form>
  );
}
