import { useEffect, useState } from "react";
import { ApiError } from "../lib/api";
import {
  createProfession,
  deleteProfession,
  listProfessions,
  transferProfession,
  updateProfession,
  type Profession,
} from "../lib/users";

export function Professions() {
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [newName, setNewName] = useState("");
  const [transferFrom, setTransferFrom] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function refresh() {
    const data = await listProfessions();
    setProfessions(data.results);
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
    setNotice(null);
    try {
      await createProfession(newName.trim());
      setNewName("");
      await refresh();
      setNotice("Profissão criada (categoria correspondente sem permissões).");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Falha ao criar profissão.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(p: Profession) {
    setError(null);
    setNotice(null);
    try {
      await updateProfession(p.id, { is_active: !p.is_active });
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Falha ao alterar status. Transfira os profissionais antes.",
      );
    }
  }

  async function handleDelete(p: Profession) {
    if (!window.confirm(`Excluir a profissão "${p.name}"?`)) return;
    setError(null);
    setNotice(null);
    try {
      await deleteProfession(p.id);
      await refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Falha ao excluir. Transfira os profissionais antes.",
      );
    }
  }

  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (!transferFrom || !transferTo || transferFrom === transferTo) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await transferProfession(
        Number(transferFrom),
        Number(transferTo),
      );
      setTransferFrom("");
      setTransferTo("");
      await refresh();
      setNotice(
        `${result.transferidos} profissional(is) transferido(s). As categorias dos usuários foram atualizadas.`,
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Falha na transferência.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl rounded-xl border border-line bg-surface p-6 shadow-sm">
        <p className="text-sm font-semibold text-ink">
          Carregando profissões...
        </p>
        <p className="mt-1 text-sm text-muted">
          Aguarde enquanto buscamos os dados cadastrados.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-ink">Profissões</h2>
        <p className="mt-1 text-sm text-muted">
          Gerencie as profissões cadastradas e organize os vínculos dos
          profissionais.
        </p>
      </div>

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && <p className="mb-3 text-sm text-green-700">{notice}</p>}

      <form
        onSubmit={handleCreate}
        className="mb-5 flex flex-col gap-4 rounded-xl border border-line bg-surface p-5 shadow-sm sm:flex-row sm:items-end"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova profissão (ex.: Fisioterapeuta)"
          className="w-full flex-1 rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={saving || !newName.trim()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark disabled:opacity-50"
        >
          Criar profissão
        </button>
      </form>

      <form
        onSubmit={handleTransfer}
        className="mb-5 grid grid-cols-1 gap-4 rounded-xl border border-line bg-surface p-5 shadow-sm sm:grid-cols-4 sm:items-end"
      >
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">De</span>
          <select
            value={transferFrom}
            onChange={(e) => setTransferFrom(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          >
            <option value="">Origem…</option>
            {professions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Para</span>
          <select
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm"
          >
            <option value="">Destino…</option>
            {professions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end sm:col-span-2">
          <button
            type="submit"
            disabled={saving || !transferFrom || !transferTo}
            className="w-full rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white hover:bg-ink/90 disabled:opacity-50"
          >
            Transferir profissionais
          </button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-line/30 text-xs tracking-wide text-muted uppercase">
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Profissionais</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {professions.map((p) => (
              <tr
                key={p.id}
                className="border-b border-line transition-colors hover:bg-line/20 last:border-0"
              >
                <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                <td className="px-4 py-3 text-ink">
                  {p.professionals_count ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.is_active
                        ? "bg-green-100 text-green-800"
                        : "bg-line text-ink"
                    }`}
                  >
                    {p.is_active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggleActive(p)}
                      className="rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink transition hover:bg-line/50"
                    >
                      {p.is_active ? "Inativar" : "Reativar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(p)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50"
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
      <p className="mt-3 text-xs text-muted">
        Profissão com profissionais vinculados não pode ser inativada nem
        excluída: transfira-os antes. Profissionais transferidos permanecem
        ativos.
      </p>
    </div>
  );
}
