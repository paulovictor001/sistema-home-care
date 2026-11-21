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
    Promise.resolve().then(refresh)
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
      setError(err instanceof ApiError ? err.message : "Falha ao criar profissão.");
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
      const result = await transferProfession(Number(transferFrom), Number(transferTo));
      setTransferFrom("");
      setTransferTo("");
      await refresh();
      setNotice(
        `${result.transferidos} profissional(is) transferido(s). As categorias dos usuários foram atualizadas.`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha na transferência.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-muted">Carregando…</p>;

  return (
    <div className="mx-auto max-w-6xl">
      <h2 className="mb-4 text-lg font-semibold text-ink">Profissões</h2>

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && <p className="mb-3 text-sm text-green-700">{notice}</p>}

      <form
        onSubmit={handleCreate}
        className="mb-4 flex flex-col gap-2 rounded-xl bg-surface p-4 shadow sm:flex-row"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nova profissão (ex.: Fisioterapeuta)"
          className="flex-1 rounded-lg border border-line px-3 py-2 text-sm"
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
        className="mb-4 grid grid-cols-1 gap-2 rounded-xl bg-surface p-4 shadow sm:grid-cols-4"
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

      <div className="overflow-x-auto rounded-xl bg-surface shadow">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs tracking-wide text-muted uppercase">
              <th className="px-4 py-3 font-semibold">Nome</th>
              <th className="px-4 py-3 font-semibold">Profissionais</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody>
            {professions.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-medium text-ink">{p.name}</td>
                <td className="px-4 py-3 text-ink">{p.professionals_count ?? "—"}</td>
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
                      className="rounded-lg border border-line px-3 py-1.5 text-xs hover:bg-line"
                    >
                      {p.is_active ? "Inativar" : "Reativar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(p)}
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
      <p className="mt-3 text-xs text-muted">
        Profissão com profissionais vinculados não pode ser inativada nem excluída:
        transfira-os antes. Profissionais transferidos permanecem ativos.
      </p>
    </div>
  );
}
