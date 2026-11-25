import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ApiError } from "../lib/api";
import { createResource, listResources, updateResource, type ResourceCatalog } from "../lib/assessments";

export function Resources() {
  const [resources, setResources] = useState<ResourceCatalog[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setResources(await listResources());
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Não foi possível carregar os recursos."; setError(message); toast.error(message);
    }
  }

  useEffect(() => { void load(); }, []);

  function cancelEdit() {
    setEditingId(null);
    setName("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      if (editingId === null) { await createResource(name.trim()); toast.success("Recurso cadastrado com sucesso."); }
      else { await updateResource(editingId, name.trim()); toast.success("Recurso atualizado com sucesso."); }
      cancelEdit();
      await load();
    } catch (cause) {
      const message = cause instanceof ApiError ? cause.message : "Não foi possível salvar o recurso."; setError(message); toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-semibold">Recursos</h1>
      <p className="mb-5 text-sm text-ink">Cadastre recursos disponíveis para associação às avaliações. O catálogo não controla estoque ou logística.</p>
      {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      <form onSubmit={(event) => void submit(event)} className="mb-5 flex flex-wrap gap-2 rounded-lg bg-surface p-4 shadow">
        <label className="min-w-56 flex-1 text-sm font-medium">
          {editingId === null ? "Novo recurso" : "Editar recurso"}
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required className="mt-1 w-full rounded border border-line px-3 py-2" placeholder="Ex.: Cadeira de rodas" />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" disabled={loading || !name.trim()} className="rounded bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{loading ? "Salvando…" : editingId === null ? "Cadastrar" : "Salvar"}</button>
          {editingId !== null && <button type="button" disabled={loading} onClick={cancelEdit} className="rounded border border-line px-4 py-2 text-sm">Cancelar</button>}
        </div>
      </form>
      {resources.length === 0 ? <p className="text-sm text-ink">Nenhum recurso cadastrado.</p> : (
        <ul className="space-y-2">
          {resources.map((resource) => <li key={resource.id} className="flex items-center justify-between rounded-lg bg-surface px-4 py-3 shadow">
            <span>{resource.name}</span>
            <button type="button" disabled={loading} onClick={() => { setEditingId(resource.id); setName(resource.name); setError(""); }} className="rounded border border-line px-3 py-1.5 text-sm disabled:opacity-50">Editar</button>
          </li>)}
        </ul>
      )}
    </div>
  );
}
