import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useNavigate, useParams } from "react-router-dom";
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

const featureLabels: Record<string, string> = {
  pacientes: "Pacientes",
  usuarios: "Usuários",
  categorias: "Categorias",
  profissoes: "Profissões",
  medicos: "Médicos",
  permissoes: "Permissões de acesso",
  avaliacoes: "Avaliações iniciais",
  necessidades: "Necessidades de cuidado",
  tipos_necessidade: "Tipos de necessidade",
  recursos: "Recursos",
  agendamentos: "Agendamentos",
  visitas: "Visitas domiciliares",
  atendimentos: "Atendimentos",
  escalas: "Escalas de cuidado",
  planos_cuidados: "Planos de cuidado",
};

const permissionCopy: Record<string, [string, string]> = {
  "pacientes.view": ["Consultar pacientes", "Ver a lista e os dados dos pacientes cadastrados."],
  "pacientes.create": ["Cadastrar pacientes", "Adicionar um novo paciente ao sistema."],
  "pacientes.update_clinical": ["Editar dados do paciente", "Atualizar as informações cadastrais e clínicas do paciente."],
  "pacientes.update_manager": ["Definir responsáveis pelo paciente", "Alterar o médico e a equipe responsáveis pelo paciente."],
  "pacientes.inactivate": ["Inativar pacientes", "Retirar o paciente das listagens de ativos sem apagar seu histórico."],
  "pacientes.reactivate": ["Reativar pacientes", "Voltar a incluir o paciente nas listagens de ativos."],
  "usuarios.view": ["Consultar usuários", "Ver os usuários e seus dados de acesso."],
  "usuarios.create": ["Criar usuários", "Cadastrar uma nova pessoa com acesso ao sistema."],
  "usuarios.update": ["Editar usuários", "Atualizar os dados e a categoria de um usuário."],
  "usuarios.inactivate": ["Inativar usuários", "Bloquear o acesso de um usuário sem apagar seu cadastro."],
  "usuarios.reactivate": ["Reativar usuários", "Restabelecer o acesso de um usuário inativo."],
  "usuarios.delete": ["Excluir usuários", "Apagar definitivamente um usuário do sistema."],
  "categorias.view": ["Consultar categorias", "Ver as categorias de acesso cadastradas."],
  "categorias.create": ["Criar categorias", "Adicionar uma nova categoria de acesso."],
  "categorias.update": ["Editar categorias", "Alterar o nome de uma categoria de acesso."],
  "categorias.manage_permissions": ["Configurar acessos da categoria", "Escolher quais ações os usuários da categoria podem realizar."],
  "profissoes.view": ["Consultar profissões", "Ver as profissões cadastradas."],
  "profissoes.create": ["Cadastrar profissões", "Adicionar uma profissão ao sistema."],
  "profissoes.update": ["Editar profissões", "Alterar os dados de uma profissão."],
  "profissoes.inactivate": ["Inativar profissões", "Retirar uma profissão de uso sem apagar seu histórico."],
  "profissoes.delete": ["Excluir profissões", "Apagar uma profissão sem profissionais vinculados."],
  "profissoes.transfer": ["Transferir profissionais", "Mover profissionais vinculados para outra profissão."],
  "medicos.view": ["Consultar médicos", "Ver médicos disponíveis para vincular a pacientes."],
  "permissoes.view": ["Consultar opções de acesso", "Ver as ações que podem ser liberadas para cada categoria."],
  "avaliacoes.create": ["Criar avaliações", "Registrar uma nova avaliação inicial do paciente."],
  "avaliacoes.view": ["Consultar avaliações", "Ver avaliações iniciais já registradas."],
  "avaliacoes.update": ["Editar avaliações", "Atualizar os dados de uma avaliação inicial."],
  "avaliacoes.change_professional": ["Alterar responsável pela avaliação", "Trocar o profissional responsável por uma avaliação."],
  "avaliacoes.add_need": ["Adicionar necessidades de cuidado", "Registrar necessidades identificadas durante a avaliação."],
  "avaliacoes.add_resource": ["Associar recursos à avaliação", "Vincular recursos cadastrados às necessidades do paciente."],
  "avaliacoes.manage_resources": ["Gerenciar recursos", "Cadastrar e manter os recursos disponíveis para as avaliações."],
  "necessidades.create": ["Criar necessidades", "Registrar uma necessidade de cuidado para o paciente."],
  "necessidades.update": ["Editar necessidades", "Atualizar os dados de uma necessidade de cuidado."],
  "necessidades.view": ["Consultar necessidades", "Ver as necessidades de cuidado registradas."],
  "necessidades.inactivate": ["Inativar necessidades", "Retirar uma necessidade de uso sem apagar seu histórico."],
  "necessidades.reactivate": ["Reativar necessidades", "Voltar a disponibilizar uma necessidade inativa."],
  "tipos_necessidade.manage": ["Gerenciar tipos de necessidade", "Cadastrar e manter os tipos usados para classificar necessidades."],
  "recursos.view": ["Consultar recursos", "Ver os recursos disponíveis no sistema."],
  "recursos.manage": ["Gerenciar recursos", "Cadastrar, editar ou remover recursos disponíveis."],
  "planos_cuidados.view": ["Consultar planos de cuidado", "Ver os planos de cuidado dos pacientes."],
  "planos_cuidados.create": ["Criar planos de cuidado", "Montar um plano de cuidado para o paciente."],
  "planos_cuidados.update": ["Editar planos de cuidado", "Atualizar informações de um plano de cuidado."],
  "planos_cuidados.manage_needs": ["Configurar necessidades do plano", "Incluir ou organizar necessidades no plano de cuidado."],
  "planos_cuidados.activate": ["Ativar planos de cuidado", "Tornar um plano de cuidado ativo."],
  "planos_cuidados.close": ["Encerrar planos de cuidado", "Finalizar um plano de cuidado ativo."],
  "planos_cuidados.reactivate": ["Reativar planos de cuidado", "Voltar a disponibilizar um plano de cuidado encerrado."],
  "agendamentos.view": ["Consultar agendamentos", "Ver os agendamentos cadastrados."],
  "agendamentos.create": ["Criar agendamentos", "Agendar uma visita ou atendimento domiciliar."],
  "agendamentos.update": ["Editar agendamentos", "Alterar os dados de um agendamento."],
  "agendamentos.delete": ["Excluir agendamentos", "Remover um agendamento do sistema."],
  "agendamentos.status": ["Alterar situação do agendamento", "Atualizar a situação de um agendamento."],
  "visitas.view": ["Consultar visitas", "Ver os dados e o histórico das visitas domiciliares."],
  "visitas.update": ["Editar visitas", "Alterar os dados de uma visita agendada."],
  "visitas.confirm": ["Confirmar visitas", "Confirmar que uma visita será realizada."],
  "visitas.cancel": ["Cancelar visitas", "Cancelar uma visita agendada, informando o motivo."],
  "visitas.start": ["Iniciar visitas", "Registrar o início de uma visita domiciliar."],
  "visitas.finish": ["Concluir visitas", "Registrar a conclusão de uma visita domiciliar."],
  "visitas.not_realized": ["Registrar visita não realizada", "Informar que a visita não ocorreu e registrar o motivo."],
  "atendimentos.view": ["Consultar atendimentos", "Ver os cuidados registrados durante as visitas."],
  "atendimentos.create": ["Registrar atendimentos", "Registrar os cuidados realizados em uma visita."],
  "atendimentos.update": ["Editar atendimentos", "Atualizar o registro dos cuidados realizados."],
  "atendimentos.delete": ["Excluir atendimentos", "Remover um registro de atendimento."],
  "escalas.view": ["Consultar escalas de cuidado", "Ver as escalas de cuidado cadastradas."],
  "escalas.create": ["Criar escalas de cuidado", "Montar uma escala de cuidado para o paciente."],
  "escalas.update": ["Editar escalas de cuidado", "Alterar os dados de uma escala de cuidado."],
  "escalas.delete": ["Excluir escalas de cuidado", "Remover uma escala de cuidado."],
  "escalas.change_status": ["Alterar situação da escala", "Ativar ou inativar uma escala de cuidado."],
};

function permissionLabel(permission: GranularPermission) {
  return permissionCopy[permission.codename]?.[0]
    ?? `${featureLabels[permission.feature] ?? permission.feature} · ${permission.action}`;
}

function permissionDescription(permission: GranularPermission) {
  return permissionCopy[permission.codename]?.[1] ?? permission.description;
}

export function Categories() {
  const { id: categoryId } = useParams();
  const navigate = useNavigate();
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
    if (categoryId) {
      const category = cats.results.find((item) => item.id === Number(categoryId));
      if (category) {
        setEditing(category);
        setSelected(category.permissions.map((p) => p.id));
      }
    }
  }

  useEffect(() => {
    Promise.resolve()
      .then(refresh)
      .catch((err) => { const message = err instanceof ApiError ? err.message : "Falha ao carregar."; setError(message); toast.error(message); })
      .finally(() => setLoading(false));
  }, [categoryId]);

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
      toast.success("Categoria criada com sucesso!");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao criar categoria.");
      setError(
        err instanceof ApiError ? err.message : "Falha ao criar categoria.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openEditor(category: Category) {
    setError(null);
    navigate(`/categorias/${category.id}/permissoes`);
  }

  function toggle(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleFeature(ids: number[], enabled: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => enabled ? next.add(id) : next.delete(id));
      return [...next];
    });
  }

  async function handleSavePermissions() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      await setCategoryPermissions(editing.id, selected);
      setSuccess("Permissões atualizadas com sucesso!");
      toast.success("Permissões atualizadas com sucesso!");
      navigate("/categorias");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Falha ao salvar permissões.");
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
      toast.success("Categoria excluída com sucesso!");
      await refresh();
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : String(err);

      setError(mensagem || "Falha ao excluir.");
      toast.error(mensagem || "Falha ao excluir.");
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
      {categoryId ? (
        <>
          <Link to="/categorias" className="mb-5 inline-flex text-sm font-medium text-primary hover:underline">← Voltar para categorias</Link>
          {error && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </>
      ) : (
      <>
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
      </>
      )}

      {categoryId && editing && (
        <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
          <div className="flex flex-col gap-4 border-b border-line bg-background/70 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-widest text-primary uppercase">Controle de acesso</p>
              <h3 className="mt-1 text-lg font-semibold text-ink">Permissões de “{editing.name}”</h3>
              <p className="mt-1 text-sm text-muted">Escolha quais ações os usuários desta categoria podem realizar.</p>
            </div>
            <div className="flex items-center gap-3 self-start rounded-xl border border-line bg-white px-4 py-2.5 sm:self-auto">
              <span className="text-2xl font-semibold leading-none text-primary">{selected.length}</span>
              <span className="max-w-24 text-xs leading-4 text-muted">permissões selecionadas</span>
            </div>
          </div>
          <div className="p-5">
            <p className="mb-4 text-xs text-muted">Um gerente pode alterar inclusive as permissões da categoria de outro gerente.</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupByFeature(catalog).map(([feature, perms]) => {
              const ids = perms.map((permission) => permission.id);
              const count = ids.filter((id) => selected.includes(id)).length;
              const allSelected = count === ids.length;
              return (
              <fieldset
                key={feature}
                className={`rounded-xl border p-4 transition-colors ${count ? "border-primary/40 bg-primary/[0.03]" : "border-line bg-white hover:border-primary/30"}`}
              >
                <legend className="px-2">
                  <span className="text-sm font-semibold text-ink">{featureLabels[feature] ?? feature.replaceAll("_", " ")}</span>
                  <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-[11px] font-medium text-muted">{count}/{perms.length}</span>
                </legend>
                <button type="button" onClick={() => toggleFeature(ids, !allSelected)} className="mb-2 ml-2 text-xs font-medium text-primary hover:underline">
                  {allSelected ? "Desmarcar todas" : "Selecionar todas"}
                </button>
                {perms.map((p) => (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-colors mb-1 ${selected.includes(p.id) ? "bg-white shadow-sm" : "hover:bg-background"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(p.id)}
                      onChange={() => toggle(p.id)}
                      className="mt-0.5 size-4 shrink-0 accent-primary"
                    />
                    <span>
                      <span className="font-medium text-ink">
                        {permissionLabel(p)}
                      </span>
                      <span className="line-clamp-2 block text-xs text-muted">
                        {permissionDescription(p)}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
            );})}
          </div>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-line bg-background/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted">As alterações passam a valer após salvar.</span>
            <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              disabled={saving}
              onClick={() => navigate("/categorias")}
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
        </section>
      )}
    </div>
  );
}
