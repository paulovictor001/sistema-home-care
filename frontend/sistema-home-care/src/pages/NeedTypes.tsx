import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { apiJson } from "../lib/api";
import {
  changeNeedTypeStatus,
  createNeedType,
  updateNeedType,
} from "../lib/assessments";

interface NeedType {
  id: number;
  name: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
}

export function NeedTypes() {
  const [types, setTypes] = useState<NeedType[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTypes() {
    try {
      const data = await apiJson<NeedType[] | { results: NeedType[] }>(
        "/api/tipos-necessidade/?status=todos",
      );

      setTypes(Array.isArray(data) ? data : data.results);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível carregar os tipos.");
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os tipos.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadTypes);
  }, []);

  function startEdit(item: NeedType) {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description);
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setDescription("");
    setError("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Informe o nome do tipo.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (editingId) {
        await updateNeedType(editingId, {
          name: name.trim(),
          description: description.trim(),
        });
        toast.success("Tipo de necessidade atualizado.");
      } else {
        await createNeedType({
          name: name.trim(),
          description: description.trim(),
        });
        toast.success("Tipo de necessidade cadastrado.");
      }

      cancelEdit();
      await loadTypes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o tipo.");
      setError(
        err instanceof Error ? err.message : "Não foi possível salvar o tipo.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function changeStatus(item: NeedType) {
    setLoading(true);
    setError("");

    try {
      await changeNeedTypeStatus(item.id, item.status !== "ACTIVE");
      toast.success(item.status === "ACTIVE" ? "Tipo de necessidade inativado." : "Tipo de necessidade ativado.");

      await loadTypes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível alterar o status.");
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível alterar o status.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">
          Tipos de necessidades
        </h1>
        <p className="mt-1 text-sm text-muted">
          Gerencie os tipos de necessidades utilizados no atendimento Home Care.
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <section className="mb-6 rounded-xl border border-line bg-surface p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-ink">
            {editingId ? "Editar tipo" : "Cadastrar novo tipo"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Preencha as informações para cadastrar ou atualizar um tipo de
            necessidade.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Nome</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Ex.: Necessidade de mobilidade"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Descrição</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              placeholder="Descreva este tipo de necessidade."
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Salvando..."
                : editingId
                  ? "Salvar alterações"
                  : "Cadastrar tipo"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-lg border border-line px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-line bg-surface p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-ink">
            Tipos cadastrados
          </h2>
          <p className="mt-1 text-sm text-muted">
            Consulte, edite e altere o status dos tipos de necessidades.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-background">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Nome
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Descrição
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {types.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-line transition-colors hover:bg-background/70"
                >
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3 text-ink">
                    {item.description || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        item.status === "ACTIVE"
                          ? "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
                          : "rounded-full bg-line px-2 py-1 text-xs font-medium text-ink"
                      }
                    >
                      {item.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        disabled={loading}
                        className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink transition hover:bg-background disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => void changeStatus(item)}
                        disabled={loading}
                        className={
                          item.status === "ACTIVE"
                            ? "rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                            : "rounded-lg bg-green-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        }
                      >
                        {item.status === "ACTIVE" ? "Inativar" : "Ativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {types.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center">
                    <p className="text-sm font-medium text-ink">
                      Nenhum tipo cadastrado
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Cadastre um novo tipo para começar.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
