import { useEffect, useState } from "react";
import { ApiError } from "../lib/api";
import {
  createCategory,
  deleteCategory,
  listCategories,
  listPermissions,
  setCategoryPermissions,
  type Category,
  type GranularPermission,
} from "../lib/users";

function groupByFeature(perms: GranularPermission[]): [string, GranularPermission[]][] {
  const map = new Map<string, GranularPermission[]>();
  for (const p of perms) {
    const list = map.get(p.feature) ?? [];
    list.push(p);
    map.set(p.feature, list);
  }
  return [...map.entries()];
}

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalog, setCatalog] = useState<GranularPermission[]>([]);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<Category | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [cats, perms] = await Promise.all([listCategories(), listPermissions()]);
    setCategories(cats.results);
    setCatalog(perms.results);
  }

  useEffect(() => {
    refresh()
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Falha ao carregar."),
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await createCategory(newName.trim());
      setNewName("");
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao criar categoria.");
    } finally {
      setSaving(false);
    }
  }

  function openEditor(category: Category) {
    setEditing(category);
    setSelected(category.permissions.map((p) => p.id));
    setError(null);
  }

  function toggle(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSavePermissions() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await setCategoryPermissions(editing.id, selected);
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao salvar permissões.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!window.confirm(`Excluir a categoria "${name}"?`)) return;
    setError(null);
    try {
      await deleteCategory(id);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao excluir.");
    }
  }

  if (loading) return <p className="text-sm text-slate-500">Carregando…</p>;

  return (
    <div className="mx-auto max-w-6xl">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Categorias e permissões</h2>

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <form
        onSubmit={handleCreate}
        className="mb-4 flex flex-col gap-2 rounded-xl bg-white p-4 shadow sm:flex-row"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova categoria (ex.: Fisioterapeuta)"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Criar categoria
        </button>
      </form>
      <p className="mb-4 text-xs text-slate-500">
        Categorias novas começam sem permissões. Categorias com usuários não podem ser
        excluídas.
      </p>

      <div className="overflow-x-auto rounded-xl bg-white shadow">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs tracking-wide text-slate-500 uppercase">
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Usuários</th>
              <th className="px-4 py-3 font-semibold">Permissões</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                <td className="px-4 py-3 text-slate-600">{c.users_count ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {c.permissions.length === 0 ? (
                    <span className="text-slate-400">nenhuma</span>
                  ) : (
                    `${c.permissions.length} configurada${c.permissions.length === 1 ? "" : "s"}`
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditor(c)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100"
                    >
                      Permissões
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(c.id, c.name)}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                    >
                      Excluir
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="mt-4 rounded-xl bg-white p-5 shadow">
          <h3 className="mb-1 text-sm font-semibold text-slate-900">
            Permissões de “{editing.name}”
          </h3>
          <p className="mb-3 text-xs text-slate-500">
            Um gerente pode alterar inclusive as permissões da categoria de outro gerente.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupByFeature(catalog).map(([feature, perms]) => (
              <fieldset key={feature} className="rounded-lg border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold text-slate-700 uppercase">
                  {feature}
                </legend>
                {perms.map((p) => (
                  <label key={p.id} className="flex items-start gap-2 py-1 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() => toggle(p.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-mono text-xs text-slate-800">{p.codename}</span>
                      {p.description && (
                        <span className="block text-xs text-slate-500">{p.description}</span>
                      )}
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSavePermissions()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar permissões"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
