import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ApiError } from "../lib/api";
import {
  createResource,
  listResources,
  updateResource,
  type ResourceCatalog,
} from "../lib/assessments";

export function Resources() {
  const [resources, setResources] = useState<ResourceCatalog[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);

    try {
      setResources(await listResources());
      setError("");
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : "Não foi possível carregar os recursos.";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim() || saving) return;

    setSaving(true);
    setError("");

    try {
      if (editingId === null) {
        await createResource(name.trim());
        toast.success("Recurso cadastrado com sucesso.");
      } else {
        await updateResource(editingId, name.trim());
        toast.success("Recurso atualizado com sucesso.");
      }

      cancelEdit();
      await load();
    } catch (cause) {
      const message =
        cause instanceof ApiError
          ? cause.message
          : "Não foi possível salvar o recurso.";

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Administração
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-ink">
            Recursos
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-muted">
            Gerencie o catálogo de recursos utilizados nas avaliações e
            necessidades de cuidado dos pacientes.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-sm">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="size-6"
              aria-hidden="true"
            >
              <path d="M12 3v18M3 12h18" strokeLinecap="round" />
              <rect x="3" y="3" width="18" height="18" rx="4" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold leading-none text-ink">
              {resources.length}
            </p>
            <p className="mt-1 text-xs text-muted">
              {resources.length === 1
                ? "Recurso cadastrado"
                : "Recursos cadastrados"}
            </p>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="flex items-center gap-3 border-b border-line bg-background/60 px-5 py-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="size-5"
              aria-hidden="true"
            >
              <path
                d="M12 5v14M5 12h14"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div>
            <h2 className="font-semibold text-ink">
              {editingId === null ? "Adicionar recurso" : "Editar recurso"}
            </h2>
            <p className="text-xs text-muted">
              {editingId === null
                ? "Cadastre um novo item no catálogo."
                : "Atualize o nome do recurso selecionado."}
            </p>
          </div>
        </div>

        <form
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label
              htmlFor="resource-name"
              className="mb-2 block text-sm font-medium text-ink"
            >
              Nome do recurso
            </label>

            <input
              id="resource-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              maxLength={100}
              required
              placeholder="Ex.: Cadeira de rodas"
              className="w-full rounded-lg border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/15"
            />

            <p className="mt-1.5 text-xs text-muted">
              Informe um nome claro para facilitar a identificação do recurso.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                "Salvando..."
              ) : editingId === null ? (
                <>
                  <span className="text-lg leading-none">+</span>
                  Cadastrar recurso
                </>
              ) : (
                "Salvar alterações"
              )}
            </button>

            {editingId !== null && (
              <button
                type="button"
                disabled={saving}
                onClick={cancelEdit}
                className="rounded-lg border border-line px-4 py-3 text-sm font-medium text-ink transition hover:bg-background disabled:opacity-50"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        {error && (
          <div
            role="alert"
            className="mx-5 mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
      </section>

      {/* Catálogo */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">
              Catálogo de recursos
            </h2>
            <p className="mt-1 text-sm text-muted">
              Recursos disponíveis para associação às avaliações.
            </p>
          </div>

          <span className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-muted">
            {resources.length} {resources.length === 1 ? "item" : "itens"}
          </span>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-line bg-surface p-10 text-center shadow-sm">
            <div className="mx-auto mb-3 size-7 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
            <p className="text-sm font-medium text-ink">
              Carregando recursos...
            </p>
            <p className="mt-1 text-xs text-muted">
              Aguarde enquanto buscamos o catálogo.
            </p>
          </div>
        ) : resources.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                className="size-7"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="4" />
                <path d="M12 7v10M7 12h10" strokeLinecap="round" />
              </svg>
            </div>

            <h3 className="font-semibold text-ink">
              Nenhum recurso cadastrado
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
              Seu catálogo ainda está vazio. Utilize o formulário acima para
              adicionar o primeiro recurso.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((resource) => (
              <article
                key={resource.id}
                className={`group flex items-center justify-between gap-3 rounded-xl border bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  editingId === resource.id
                    ? "border-primary/50 ring-2 ring-primary/10"
                    : "border-line hover:border-primary/30"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-background text-primary transition group-hover:bg-primary/10">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className="size-5"
                      aria-hidden="true"
                    >
                      <path d="M4 7h16M4 12h16M4 17h10" strokeLinecap="round" />
                    </svg>
                  </div>

                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-ink">
                      {resource.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      Recurso #{resource.id}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    setEditingId(resource.id);
                    setName(resource.name);
                    setError("");
                  }}
                  className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink transition hover:border-primary hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Editar
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Informação */}
      <div className="flex items-start gap-3 rounded-xl border border-line bg-background/60 p-4">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          className="mt-0.5 size-5 shrink-0 text-muted"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 8h.01" strokeLinecap="round" />
        </svg>
        <p className="text-xs leading-5 text-muted">
          <strong className="font-semibold text-ink">Importante:</strong> este
          catálogo organiza os recursos disponíveis para associação às
          avaliações. Ele não controla estoque, disponibilidade física ou
          logística.
        </p>
      </div>
    </div>
  );
}
