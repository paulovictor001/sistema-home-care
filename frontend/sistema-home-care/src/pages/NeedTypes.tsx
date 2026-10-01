import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { apiJson } from "../lib/api";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadTypes() {
    try {
      const data = await apiJson<NeedType[] | { results: NeedType[] }>(
        "/api/tipos/?page_size=100",
      );

      setTypes(Array.isArray(data) ? data : data.results);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível carregar os tipos.",
      );
    }
  }

  useEffect(() => {
    void loadTypes();
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
        await apiJson(`/api/tipos/${editingId}/`, {
          method: "PATCH",
          json: {
            name: name.trim(),
            description: description.trim(),
          },
        });
      } else {
        await apiJson("/api/tipos/", {
          method: "POST",
          json: {
            name: name.trim(),
            description: description.trim(),
            status: "ACTIVE",
          },
        });
      }

      cancelEdit();
      await loadTypes();
    } catch (err) {
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
      const action = item.status === "ACTIVE" ? "inativar" : "reativar";

      await apiJson(`/api/tipos/${item.id}/${action}/`, {
        method: "POST",
      });

      await loadTypes();
    } catch (err) {
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
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Manutenção de tipos</h1>
        <p className="mt-1 text-sm text-gray-600">
          Cadastre, edite, ative e inative os tipos de necessidades.
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      <section className="mb-6 rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">
          {editingId ? "Editar tipo" : "Novo tipo"}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Nome</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
              placeholder="Ex.: Necessidade de mobilidade"
            />
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium">Descrição</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="w-full rounded border border-gray-300 px-3 py-2"
              placeholder="Descreva este tipo de necessidade."
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
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
                className="rounded border border-gray-300 px-4 py-2 text-sm"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-semibold">Tipos cadastrados</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-3 py-3 font-medium">Nome</th>
                <th className="px-3 py-3 font-medium">Descrição</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>

            <tbody>
              {types.map((item) => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="px-3 py-3 font-medium">{item.name}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {item.description || "-"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={
                        item.status === "ACTIVE"
                          ? "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
                          : "rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
                      }
                    >
                      {item.status === "ACTIVE" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        disabled={loading}
                        className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      >
                        Editar
                      </button>

                      <button
                        type="button"
                        onClick={() => void changeStatus(item)}
                        disabled={loading}
                        className={
                          item.status === "ACTIVE"
                            ? "rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                            : "rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
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
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-gray-500"
                  >
                    Nenhum tipo cadastrado.
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



