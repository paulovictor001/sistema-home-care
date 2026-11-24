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

function groupByFeature(
  perms: GranularPermission[],
): [string, GranularPermission[]][] {
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
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function refresh() {
    const [cats, perms] = await Promise.all([
      listCategories(),
      listPermissions(),
    ]);
    setCategories(cats.results);
    setCatalog(perms.results);
  }

  useEffect(() => {
    Promise.resolve()
      .then(refresh)
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
    setSuccess(null);
    try {
      await createCategory(newName.trim());
      setNewName("");
      setSuccess("Categoria criada com sucesso!");
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Falha ao criar categoria.",
      );
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
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSavePermissions() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await setCategoryPermissions(editing.id, selected);
      setEditing(null);
      setSuccess("Permissões atualizadas com sucesso!");
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Falha ao salvar permissões.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    if (deletingId !== null) return;
    if (!window.confirm(`Excluir a categoria "${name}"?`)) return;

    setDeletingId(id);
    setError(null);
    setSuccess(null);

    try {
      await deleteCategory(id);
      setSuccess("Categoria excluída com sucesso!");
      await refresh();
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : String(err);

      setError(mensagem || "Falha ao excluir.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 shadow-sm">
        <p className="text-sm font-medium text-ink">Carregando categorias...</p>
        <p className="mt-1 text-sm text-muted">
          Aguarde enquanto buscamos as categorias e permissões.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-ink">
          Categorias e permissões
        </h2>
        <p className="mt-1 text-sm text-muted">
          Gerencie as categorias dos usuários e configure suas permissões de
          acesso.
        </p>
      </div>

      {success && (
        <p
          role="status"
          className="mb-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          {success}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <form
        onSubmit={handleCreate}
        className="mb-4 flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor="category-name"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Nome da categoria
          </label>

          <input
            id="category-name"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setError(null);
              setSuccess(null);
            }}
            placeholder="Ex.: Fisioterapeuta"
            aria-label="Nome da nova categoria"
            className="w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Criando..." : "Criar categoria"}
        </button>
      </form>
      <p className="mb-4 text-xs text-muted">
        Categorias novas começam sem permissões. Categorias com usuários não
        podem ser excluídas.
      </p>

      <div className="overflow-x-auto rounded-xl bg-surface shadow">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-background">
            <tr className="border-b border-line text-xs tracking-wider text-muted uppercase">
              <th className="px-5 py-4 text-left font-semibold">Nome</th>
              <th className="px-5 py-4 text-left font-semibold">Usuários</th>
              <th className="px-5 py-4 text-left font-semibold">Permissões</th>
              <th className="px-5 py-4 text-right font-semibold">Ações</th>
            </tr>
          </thead>

          <tbody>
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center">
                  <p className="font-medium text-ink">
                    Nenhuma categoria cadastrada
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Crie uma categoria utilizando o formulário acima.
                  </p>
                </td>
              </tr>
            ) : (
              categories.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-line transition-colors last:border-0 hover:bg-background/70"
                >
                  <td className="px-5 py-4 font-medium text-ink">
                    {c.name}
                    <span className="ml-2 text-xs text-muted">ID: {c.id}</span>
                  </td>
                  <td className="px-4 py-3 text-ink">{c.users_count ?? "—"}</td>
                  <td className="px-4 py-3 text-ink">
                    {c.permissions.length === 0 ? (
                      <span className="text-muted">nenhuma</span>
                    ) : (
                      `${c.permissions.length} configurada${c.permissions.length === 1 ? "" : "s"}`
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditor(c)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-line"
                      >
                        Permissões
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(c.id, c.name)}
                        disabled={deletingId !== null}
                        className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                      >
                        {deletingId === c.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="mt-4 rounded-xl bg-surface p-5 shadow">
          <h3 className="mb-1 text-sm font-semibold text-ink">
            Permissões de “{editing.name}”
          </h3>
          <p className="mb-3 text-xs text-muted">
            Um gerente pode alterar inclusive as permissões da categoria de
            outro gerente.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupByFeature(catalog).map(([feature, perms]) => (
              <fieldset
                key={feature}
                className="rounded-xl border border-line bg-white p-4 transition-colors hover:border-primary/40"
              >
                <legend className="px-2 text-xs font-bold tracking-wide text-ink uppercase">
                  {feature.replaceAll("_", " ")}
                </legend>
                {perms.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-start gap-3 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-background"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() => toggle(p.id)}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-mono text-xs text-ink">
                        {p.codename}
                      </span>
                      {p.description && (
                        <span className="block text-xs text-muted">
                          {p.description}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <div className="mt-5 flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(null)}
              className="rounded-lg border border-line bg-white px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSavePermissions()}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar permissões"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
