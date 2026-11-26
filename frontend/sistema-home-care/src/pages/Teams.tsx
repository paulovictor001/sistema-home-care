import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "../lib/api";
import { listTeamProfessionals, listTeams, saveTeam, setTeamStatus, type TeamProfessional, type TeamRecord } from "../lib/users";

const inputClass = "min-h-11 w-full rounded-lg border border-line bg-white px-3.5 text-sm text-ink outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";

export function Teams() {
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [professionals, setProfessionals] = useState<TeamProfessional[]>([]);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<number[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    const [teamData, memberData] = await Promise.all([
      listTeams(showInactive ? "todos" : "ativo"), listTeamProfessionals(),
    ]);
    setTeams(teamData); setProfessionals(memberData);
  }

  useEffect(() => {
    void refresh().catch((err) => setError(err instanceof ApiError ? err.message : "Falha ao carregar equipes."))
      .finally(() => setLoading(false));
  }, [showInactive]);

  function edit(team: TeamRecord) {
    setEditing(team.id); setName(team.name); setMembers(team.professionals); setError("");
  }

  function clearForm() { setEditing(null); setName(""); setMembers([]); setError(""); }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await saveTeam({ name: name.trim(), professionals: members }, editing ?? undefined);
      clearForm(); await refresh(); toast.success(editing ? "Equipe atualizada." : "Equipe cadastrada.");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Falha ao salvar equipe.";
      setError(message); toast.error(message);
    } finally { setSaving(false); }
  }

  async function toggleStatus(team: TeamRecord) {
    const action = team.is_active ? "inativar" : "reativar";
    if (team.is_active && !window.confirm(`Inativar ${team.name}? Os pacientes vinculados ficarão sem equipe.`)) return;
    try { await setTeamStatus(team.id, action); await refresh(); toast.success(team.is_active ? "Equipe inativada e pacientes desvinculados." : "Equipe reativada."); }
    catch (err) { toast.error(err instanceof ApiError ? err.message : "Falha ao alterar equipe."); }
  }

  return <div className="mx-auto max-w-5xl space-y-6">
    <header><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Administração</p><h2 className="mt-2 text-2xl font-semibold text-ink">Equipes</h2><p className="mt-1 text-sm text-muted">Cadastre equipes, escolha profissionais de diferentes profissões e acompanhe seu status.</p></header>
    <form onSubmit={(event) => void submit(event)} className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <h3 className="font-semibold text-ink">{editing ? "Editar equipe" : "Nova equipe"}</h3>
      <label className="block text-sm font-medium">Nome da equipe<input className={`${inputClass} mt-1`} value={name} onChange={(event) => setName(event.target.value)} required maxLength={255} placeholder="Ex.: Equipe Norte" /></label>
      <fieldset><legend className="mb-2 text-sm font-medium">Profissionais membros</legend><div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-line p-3 sm:grid-cols-2">
        {professionals.map((person) => <label key={person.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-background"><input type="checkbox" checked={members.includes(person.id)} onChange={(event) => setMembers((old) => event.target.checked ? [...old, person.id] : old.filter((id) => id !== person.id))} /><span>{person.full_name}<span className="ml-2 text-xs text-muted">{person.profession__name}</span></span></label>)}
        {!professionals.length && <p className="text-sm text-muted">Nenhum profissional ativo cadastrado.</p>}
      </div></fieldset>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2"><button disabled={saving} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Salvando…" : editing ? "Salvar alterações" : "Cadastrar equipe"}</button>{editing && <button type="button" onClick={clearForm} className="min-h-10 rounded-lg border border-line px-4 text-sm">Cancelar edição</button>}</div>
    </form>
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-line p-5"><h3 className="font-semibold text-ink">Equipes cadastradas</h3><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} />Mostrar inativas</label></div>
      {loading ? <p className="p-5 text-sm text-muted">Carregando equipes…</p> : teams.length === 0 ? <p className="p-5 text-sm text-muted">Nenhuma equipe cadastrada.</p> : <ul className="divide-y divide-line">{teams.map((team) => <li key={team.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="font-semibold text-ink">{team.name}</p><span className={`rounded-full px-2 py-0.5 text-xs ${team.is_active ? "bg-primary-light text-primary" : "bg-background text-muted"}`}>{team.is_active ? "Ativa" : "Inativa"}</span></div><p className="mt-1 text-sm text-muted">{team.members.map((m) => `${m.name} · ${m.profession}`).join(", ") || "Sem membros"}</p></div><div className="flex gap-2"><button type="button" onClick={() => edit(team)} disabled={!team.is_active} className="rounded-lg border border-line px-3 py-2 text-sm disabled:opacity-40">Editar</button><button type="button" onClick={() => void toggleStatus(team)} className="rounded-lg border border-line px-3 py-2 text-sm">{team.is_active ? "Inativar" : "Reativar"}</button></div></li>)}</ul>}
    </section>
  </div>;
}
