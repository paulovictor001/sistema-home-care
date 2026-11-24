## Processo 3 — **Necessidades Identificadas** (auditado em 18/11/2026)

> **Implementação das recomendações — 22/11/2026:** DN-1…DN-5 foram decididas e aplicadas. Tipos podem ser criados/editados (nome único obrigatório e descrição opcional) e administrados pelos três perfis; a exclusão é permitida apenas sem vínculo com plano ou histórico; o Gerente mantém a visualização aninhada em avaliações. Rotas, menu, API e documentação foram alinhados. O restante abaixo preserva o registro original de 18/11.

> **Atualização de modelagem — 22/11/2026:** `NeedType`, seu catálogo,
> endpoints e administração pertencem agora ao app `assessments` (TASK-CAD-PAC-045).
> A migração preserva a tabela `need_types`, seus IDs e vínculos existentes;
> referências a `patients.NeedType` abaixo descrevem a auditoria-base.

- `RN`: `docs/regras-de-negocio/regras_negocio_necessidades_identificadas.md` — **sem IDs formais**; a auditoria usa a convenção **`RN-NEC §n` = seção `## n.`** do documento (§2…§11) — declaração da convenção interna (memória §8.3, decisão pendente D3).
- `RF`: `docs/requisitos-do-sistema/requisitos_funcionais_necessidades_identificadas.md` (RF-NEC-001…021)
- `TASK`: `docs/tasks/tasks_necessidades_identificadas.md` (8 seções **sem IDs formais**; 40 `[x]` / 44 `[ ]` — **checkbox não é evidência**, inventário §8.4) + notas de implementação embutidas (TA-73, TA-78, RF-NEC-011/012, RF-NEC-021, RF-NEC-018/021)
- Documento-mãe: `docs/Processos e Modelo de Dados.md` §6 (Processo 3), §8, §9.3, §10, §11, §15
- Decisões complementares: `AGENTS.md` (seção "Patients" — `NeedType`), comentários de código (`TA-42/73/78`, `RF-NEC-*`), migrações `accounts/0006…0009`, `patients/0004/0005`
- Rastreio Jira `TA-73/78/88`: citado nos docs/comentários; **status externo não verificado** (fonte externa = decisão pendente D2 da memória)

---

### 1. Resumo do processo

Registra **o que precisa ser atendido** a partir da avaliação — responde *"O que precisa ser atendido?"* (doc-mãe §6.1: avaliação = o que está acontecendo; necessidade = o que precisa ser atendido). É a **ponte entre a avaliação e o Plano de Cuidados** (§2.3). Fluxo: avaliação criada → necessidades vinculadas (múltiplas por avaliação, registro independente) → consulta/edição/exclusão/inativação/reativação → **entrada do plano de cuidados**.

**Entradas**: avaliação existente, tipo de necessidade ativo (entidade própria, 8 tipos iniciais), descrição (obrigatória), prioridade (obrigatória, 4 valores). **Saída**: `CareNeed` com status `Identificada`, situação ativo/inativo, histórico de inativação/reativação → consumido por `care_plans` (PROTECT + filtro `IDENTIFIED`).

Escopo **não** deste processo (corretamente não antecipado): demais status/transições, frequência, escala, agendamento, visita, atendimento, evolução, estoque/farmácia (RN-NEC §9/§10).

### 2. Status geral

**PARCIAL — backend aderente na ampla maioria (16/18 RN, 17/21 RF), mas a administração de tipos está inoperante no frontend e sem criação/edição no backend.**

O fluxo de necessidades (criar na avaliação → listar → editar → excluir → inativar → reativar → histórico) está **conectado entre frontend e backend com endpoints reais**, matriz de permissões em duas camadas implementada (`assessments/permissions.py`) e **~46 testes backend** (**não executados** → `A VALIDAR`) com **zero testes de frontend**. Divergências centrais: (a) **a página "Manutenção de tipos" (`/tipos`) está inteiramente quebrada** — chama `/api/tipos/`, endpoint que **não existe** (o real é `/api/tipos-necessidade/`), e o backend **não tem** criação/edição de tipos (catálogo é read-only) — RF-NEC-013 **DIVERGENTE**; (b) a rota `/tipos` está **restrita ao Gerente** embora RN-NEC §5/RF-NEC-013/018 permitam os três perfis, e **não há item de menu/atalho** para ela; (c) **exclusão de necessidade vinculada a plano → `ProtectedError` não tratado (500)** (herdado PA-5 do Processo 2); (d) sem testes de frontend e sem execução de testes.

### 3. Requisitos e status de implementação

#### 3.1 Regras de negócio (RN-NEC — seções do doc, sem IDs formais)

| ID | Regra | Status | Evidência / motivo |
|---|---|---|---|
| §2.1 | Toda necessidade vinculada a uma avaliação | **CONCLUÍDO** | `CareNeed.assessment` FK `CASCADE` (`models.py:155-159`); serializer `assessment` **read-only** (`serializers.py:214`); injetado no endpoint aninhado (`views.py:132`) |
| §2.2 | Múltiplas necessidades; registro independente | **CONCLUÍDO** | Relação 1:N sem unicidade; teste `test_list_filter_pagination` e criações múltiplas nos testes |
| §2.3 | Ligação avaliação → futuro plano | **CONCLUÍDO** | `care_plans.CarePlanNeed.care_need` FK `PROTECT` → `CareNeed` + filtro `IDENTIFIED`/ativo/mesmo paciente (`care_plans/views.py:130`) — verificado no Processo 2 (RF-AVL-018) |
| §3 | Criar: Médico e Enfermeiro | **CONCLUÍDO** | `need_permissions("create")` = `IsActiveUser` + `IsClinicalStaff` + `necessidades.create` + `avaliacoes.add_need` (`permissions.py:16-36`, `views.py:81-82`); Gerente **não** recebe `necessidades.create` (seed `accounts/0009`); teste `test_gerente_cannot_create_need` |
| §3 | Visualizar: Médico e Enfermeiro (Gerente "não definido") | **CONCLUÍDO** | `IsClinicalStaff` + `necessidades.view` (seed `0006` só clínicas); Gerente **negado** no endpoint direto. **Ressalva**: o Gerente vê as necessidades **aninhadas na avaliação** (`avaliacoes.view`, `care_needs` no serializer) — decisão registrada nas tasks (§"Autorização backend") × RN §3 ambíguo → ver PN-8/DN-4 |
| §3 | Editar: Médico e Enfermeiro | **CONCLUÍDO** | `NEED_ACTIONS["update"]` → `IsClinicalStaff` + `necessidades.update`; teste `test_clinical_profiles_consult_edit_delete` |
| §3 | Excluir: Médico e Enfermeiro | **PARCIAL** | `destroy` implementado (`views.py:159-174`), mas **exclusão de necessidade vinculada a plano → 500** (`ProtectedError` não tratado, PN-4/`A VALIDAR`) e persistência **física** definida só no código (RN §7 é vaga) → DN-3 (interface com DA-3 do Processo 2) |
| §3 | Inativar: Gerente, Médico e Enfermeiro | **CONCLUÍDO** | `NEED_ACTIONS["inativar"]` → `(IsGerente \| IsClinicalStaff)` + `necessidades.inactivate` (seed `0007` → 3 categorias); resposta mínima `{id, is_active, inactivated_at}` sem dados clínicos (`views.py:217-218`); teste `test_all_authorized_profiles_can_inactivate_with_snapshot` |
| §4 | Dados (tipo, descrição, prioridade, status); descrição e prioridade obrigatórias | **CONCLUÍDO** | `CareNeed` com `description`/`priority` obrigatórias (`models.py:165-166`, `clean()` `:181-187`); serializer `validate_description` (`serializers.py:216-219`); `status`/`is_active`/`inactivated_at` read-only (`:214`) |
| §4 | Prioridades Baixa/Média/Alta/Urgente | **CONCLUÍDO** | `NeedPriority` choices (`models.py:29-35`) espelhado em `NEED_PRIORITIES` (`lib/assessments.ts:101-106`); DRF rejeita valor fora do domínio |
| §5 | Tipo = entidade própria; 8 tipos iniciais | **CONCLUÍDO** | `patients.NeedType` (`models.py:210-245`, `need_types`, nome único) + seed idempotente dos 8 (`patients/migrations/0005`, `INITIAL_NEED_TYPES` `models.py:198-207`) |
| §5 | Administração dos tipos por Gerente, Médico e Enfermeiro | **DIVERGENTE** | Backend: **só** ativar/inativar (`NeedTypeStatusView`, `tipos_necessidade.manage` seed `0009` → 3 categorias) — **sem endpoints de criação/edição** (catálogo `http_method_names=["get"]`, serializer todo read-only `patients/serializers.py:145`). Frontend: página `/tipos` chama **`/api/tipos/` inexistente** (404 em todas as chamadas) e a rota é **só Gerente** (`App.tsx:76-87`) → PN-1/PN-2/PN-3 |
| §5 | Tipo ativo/inativo; inativo não selecionável; vínculos preservados | **CONCLUÍDO** | Catálogo default só ativos (`patients/views.py:220-235`); `validate_need_type` rejeita inativo **exceto o vínculo atual** (`serializers.py:221-229`); FK `PROTECT` em `CareNeed` (`models.py:160-164`); testes `test_need_types_default_only_active`, `test_put_preserves_inactive_historical_type_and_rejects_new_inactive_type` |
| §6 | Status inicial `Identificada`; demais transições para o Plano | **CONCLUÍDO** | `NeedStatus` com valor único + default (`models.py:38-41,169-173`); nenhuma transição implementada; teste `test_medico_creates_need_with_identified_status` |
| §7 | Exclusão × inativação são distintas; inativação preserva registro e histórico | **CONCLUÍDO** | Inativação transacional com `CareNeedHistory` (ator, data, snapshot anterior) e idempotência (`views.py:202-226`); exclusão é operação separada (`DELETE`); `CareNeedHistory.need` `SET_NULL` preserva eventos. Ressalvas: exclusão vinculada a plano → 500 (PN-4) e histórico fica **órfão** após exclusão física (DN-5) |
| §8 | Base para o Plano de Cuidados | **CONCLUÍDO** | `CarePlanNeed` PROTECT + serviços exigindo "necessidade identificada ativa do paciente" (`care_plans/services.py:49-50,195-196`) |
| §9/§10 | Fora do escopo / não antecipar regras operacionais | **CONCLUÍDO** | Nenhuma regra de frequência/escala/agendamento/estoque no app; `status` sem transições; princípio respeitado (como nos processos 1 e 2) |
| §11 | Reativação: 3 perfis, `necessidades.reactivate`, idempotente, snapshot, preserva status e eventos, não altera o tipo | **CONCLUÍDO** | `NEED_ACTIONS["reativar"]` (`permissions.py:26`) + seed `0008` (3 categorias); `_set_active` só grava se houver mudança (idempotente, não duplica evento) e **não toca em `status`/tipo** (`views.py:202-218`); teste `test_reactivated_need_returns_to_active_list_and_repeated_cycles` |

**Tally RN**: 18 itens → **16 CONCLUÍDO, 1 PARCIAL (§3 exclusão), 1 DIVERGENTE (§5 administração)**.

#### 3.2 Requisitos funcionais (RF-NEC)

| ID | Requisito | Status | Observação |
|---|---|---|---|
| RF-NEC-001 | Criar necessidade (médico/enfermeiro) | **CONCLUÍDO** | `POST /api/avaliacoes/<id>/necessidades/`; UI em `AssessmentForm.tsx:590-645` |
| RF-NEC-002 | Vincular à avaliação existente | **CONCLUÍDO** | Endpoint exige avaliação (action detail) + campo read-only |
| RF-NEC-003 | Múltiplas necessidades por avaliação | **CONCLUÍDO** | |
| RF-NEC-004 | Selecionar tipo da entidade própria; só ativos; 8 iniciais | **CONCLUÍDO** | Select via `GET /api/tipos-necessidade/` (default ativos) + seed dos 8; backend rejeita inativo |
| RF-NEC-005 | Descrição obrigatória | **CONCLUÍDO** | Backend + `required` no form e no `NeedEditForm` (botão desabilitado sem descrição) |
| RF-NEC-006 | Prioridade obrigatória (4 valores) | **CONCLUÍDO** | choices no model + select com as 4 opções |
| RF-NEC-007 | Status inicial `Identificada` | **CONCLUÍDO** | Default no model; exibido readonly nos dois formulários |
| RF-NEC-008 | Editar (médico/enfermeiro) | **CONCLUÍDO** | `PATCH /api/necessidades/<id>/` + `NeedEditForm` inline no detalhe; avaliação/status read-only |
| RF-NEC-009 | Visualizar (médico/enfermeiro) | **CONCLUÍDO** | Endpoint direto restrito a clínicos; aninhado na avaliação para os 3 perfis (ressalva PN-8) |
| RF-NEC-010 | Excluir | **PARCIAL** | `DELETE` funcional (trata 204 sem ler JSON, `lib/assessments.ts:231-237`); **500 se vinculada a plano** (PN-4, `A VALIDAR`) e persistência física sem regra documentada (DN-3) |
| RF-NEC-011 | Inativar (3 perfis) | **CONCLUÍDO** | Endpoint idempotente + botão com confirmação no detalhe (`AssessmentDetail.tsx:254-258`) |
| RF-NEC-012 | Preservar histórico na inativação | **CONCLUÍDO** | `CareNeedHistory` transacional com snapshot; `SET_NULL`; UI exibe "Inativada em …" |
| RF-NEC-013 | Administrar tipos (3 perfis) | **DIVERGENTE** | Página `/tipos` **inoperante** (endpoints `/api/tipos/` inexistentes — PN-1), **sem criar/editar no backend** (PN-2) e **só Gerente** na rota (PN-3) |
| RF-NEC-014 | Ativar/inativar tipos; inativos fora de novos cadastros | **PARCIAL** | Backend **CONCLUÍDO** (`/api/tipos-necessidade/<id>/inativar\|reativar/`, idempotentes, `tipos_necessidade.manage`); UI **quebrada** (chama `/api/tipos/…` → 404) |
| RF-NEC-015 | Preservar vínculos históricos do tipo inativado | **CONCLUÍDO** | `PROTECT` + edição mantém tipo inativo atual; testes dedicados |
| RF-NEC-016 | Não implementar transições futuras de status | **CONCLUÍDO** | `NeedStatus` com valor único; nenhuma action de transição |
| RF-NEC-017 | Estrutura preparada para o Plano | **CONCLUÍDO** | `CarePlanNeed` PROTECT + filtros de consumo |
| RF-NEC-018 | Matriz de controle de acesso | **PARCIAL** | Matriz **implementada no backend** para todas as linhas (`assessments/permissions.py` + seeds `0006-0009`; testes `tests_need_permissions.py` cobrem anônimo/perfil indevido/categoria sem permissão/usuário inativo). **Falha na linha "Administrar tipos"**: a UI do `/tipos` só abre para o Gerente (médico/enfermeiro bloqueados) e a própria página não opera; criação do uso na tela da avaliação está correta (`canAddNeeds = clinical && necessidades.create && avaliacoes.add_need`, `AssessmentForm.tsx:121-122`) |
| RF-NEC-019 | Validar obrigatórios (avaliação, tipo, descrição, prioridade) | **CONCLUÍDO** | Os 4 validados (campo por campo + `clean()`); erros por campo no frontend via `parseFieldErrors` |
| RF-NEC-020 | Manter dados (origem, tipo, descrição, prioridade, status, criação/atualização) | **CONCLUÍDO** | Todos os campos existem em `CareNeed` (`created_at`/`updated_at`) |
| RF-NEC-021 | Reativar com histórico (3 perfis, idempotente, sem duplicar eventos) | **CONCLUÍDO** | Endpoint + botão "Reativar" no detalhe para perfis com permissão (`AssessmentDetail.tsx:259-263`); histórico exibe `INACTIVATE`/`REACTIVATE` com ator/data (`:269-276`); testes de ciclos/idempotência/rollback |

**Tally RF**: 21 itens → **17 CONCLUÍDO, 3 PARCIAL (010, 014, 018), 1 DIVERGENTE (013)**.

#### 3.3 Tasks (8 seções, sem IDs formais)

Status por evidência de código (checkbox **não** é evidência — inventário §8.4; confirmou-se que os `[ ]` descrevem tanto trabalho pendente quanto trabalho já feito). Notas de implementação embutidas citam TA-73 (model), TA-78 (status), TA-88 (autorização de tipos) — **status Jira externo não verificado**.

| Seção | Conteúdo | Status |
|---|---|---|
| 1. Modelagem | tipos, necessidade, vínculos, prioridades, status inicial | **CONCLUÍDO** (`CareNeed`/`NeedType` existem e estão completos; os 6 `[ ]` estão desatualizados) |
| 2. Tipos | 8 tipos seed, ativação/inativação, vínculos PROTECT | **PARCIAL** — seed/PROTECT/status **CONCLUÍDOS**; **criação/edição de tipos NÃO INICIADA** (2 `[ ]` confirmados) |
| 3. Backend — necessidades | criação, validações, status automático, consulta, edição, exclusão, inativação, histórico, autorização | **CONCLUÍDO** (os 6 `[ ]` de criação/validações estão implementados — desatualizados) |
| 4. Frontend — necessidades | seção na avaliação, lista, form, tipos ativos, prioridades, status, edição/exclusão/inativação por perfil, info históricas | **CONCLUÍDO** (inclusive "exibir informações históricas" via `AssessmentDetail`, `[ ]` desatualizado) |
| 5. Administração dos tipos | tela, criação/edição, ativação, indicador de estado, restrição de perfis | **NÃO INICIADO / DIVERGENTE** — tela existe mas **inoperante** (endpoints errados) e **sem criar/editar** no backend; indicador de estado existente na tabela; restrição de perfis errada (só Gerente) |
| 6. Autorização | perfis × ações, "não assumir permissões não definidas" | **CONCLUÍDO** (backend; a permissão `tipos_necessidade.manage` foi criada pela `0009` conforme nota da seção "Autorização backend") |
| 7. Testes | 13 itens | **A VALIDAR** — ~46 testes backend existem e cobrem os itens principais (**não executados**); **nenhum teste de frontend** |
| 8. Fora do escopo | 10 itens "não implementar" | **CONCLUÍDO (limites respeitados)** — nenhum item proibido foi implementado (os `[ ]` aqui significam "corretomente não feito") |

### 4. Evidências do backend

- **App principal**: `backend/sistema_home_care/assessments/` (+ `patients` para `NeedType`):
  - `CareNeed` (`models.py:147-194`): `assessment` CASCADE, `need_type` PROTECT → `patients.NeedType`, `description`/`priority` obrigatórias (com `clean()`), `status` default `IDENTIFIED`, `is_active`/`inactivated_at`, ordering `-created_at`.
  - `CareNeedHistory` (`models.py:197-209`): `need`/`actor` `SET_NULL`, `actor_name` denormalizado, `action` (`INACTIVATE`/`REACTIVATE`), `snapshot` JSON.
  - `NeedType` (`patients/models.py:210-245`): `name` único com strip, `description`, `status` ACTIVE/INACTIVE, ordering `name`.
- **Migrations**: `assessments/0001…0003` (`0003` cria `is_active`/`inactivated_at`); `patients/0004_needtype`, `0005_alter_needtype_status` (RunPython idempotente dos 8 tipos); `accounts/0006` (`necessidades.view/update/delete` → só Médico/Enfermeiro), `0007` (`inactivate` → 3), `0008` (`reactivate` → 3), `0009` (`create` → só categorias clínicas com `avaliacoes.add_need`, **sem ampliar o Gerente**; `tipos_necessidade.manage` → 3).
- **Serializers**: `CareNeedSerializer` (`serializers.py:196-229` — `assessment`/`status`/`is_active`/`inactivated_at` read-only; `validate_description`; `validate_need_type` permite manter tipo inativo atual e rejeita troca para inativo); `CareNeedReadSerializer` (`need_type_name`); `CareNeedHistorySerializer`; `NeedTypeCatalogSerializer` (`patients/serializers.py:136-145` — **todos os campos read-only**).
- **Views/endpoints**:
  - `POST /api/avaliacoes/<id>/necessidades/` — criação (clínico + `necessidades.create` + `avaliacoes.add_need`), `views.py:125-139`
  - `GET /api/necessidades/` — list, 20/página, filtros `?situacao=ativo|inativo|todos` (default `ativo`, inválido → 400) e `?assessment=<id>` (`views.py:183-200`) — **não usado pelo frontend** (usa a lista aninhada na avaliação)
  - `GET/PUT/PATCH/DELETE /api/necessidades/<id>/` — consulta/edição/exclusão (`views.py:159-174`)
  - `POST /api/necessidades/<id>/inativar|reativar/` — idempotentes, transacionais, com snapshot (`views.py:202-226`)
  - `GET /api/necessidades/<id>/historico/` — eventos (`views.py:228-231`)
  - `GET /api/tipos-necessidade/` — catálogo read-only, default só ativos, `avaliacoes.view` (`patients/views.py:207-235`)
  - `POST /api/tipos-necessidade/<id>/inativar|reativar/` — `type_management_permissions()` (`patients/views.py:237-266`)
  - **Inexistente**: `POST/PATCH /api/tipos-necessidade/` (criar/editar) e **qualquer rota `/api/tipos/`** — ver PN-1/PN-2
- **Services**: **não há** `assessments/services.py` — regras em serializers/views/permissions (mesmo padrão dos processos 1 e 2; risco de manutenção registrado na etapa técnica).
- **Validações**: descrição obrigatória (serializer + `clean()`), prioridade no domínio (choices), tipo ativo (exceto vínculo atual), avaliação injetada e imutável, filtros `situacao`/`assessment` com 400, `status`/situação read-only, idempotência das actions.
- **Permissões**: matriz centralizada em `assessments/permissions.py` — `NEED_ACTIONS` (perfil × permissão granular, com coluna `allow_manager`), `IsActiveUser` (bloqueia usuário inativo), `DenyUnknownAction` (ação desconhecida → negada), `type_management_permissions()`. Duas camadas: grupo (`IsGerente`/`IsClinicalStaff`) + `RequirePermission("necessidades.*"|"tipos_necessidade.manage")`.
- **Relacionamentos**: `CareNeed` ← `care_plans.CarePlanNeed` (PROTECT, bloqueia exclusão); `CareNeed` → `PatientAssessment` (CASCADE — excluir avaliação excluiria necessidades, mas avaliação não tem delete); `CareNeed` → `NeedType` (PROTECT); `CareNeedHistory` `SET_NULL` nos dois FKs.
- **Regras de negócio**: conforme §3.1 — sem services dedicados; regras espalhadas em `CareNeedSerializer`, `_set_active` e `need_permissions`.
- **Admin**: `CareNeedAdmin` com `is_active`/`inactivated_at` read-only; `CareNeedHistoryAdmin` (histórico somente leitura conforme nota das tasks) — `admin.py:25-45`.
- **Testes**: **~46 métodos `test_*` relacionados** — `assessments/tests_needs_api.py` (9: CRUD, filtros/paginação, tipo inativo, read-only, permissões), `tests_need_permissions.py` (8: anônimo, perfil indevido, gerente bloqueado em ações clínicas, usuário inativo, permissão legada de criação, administração de tipos), `tests_need_inactivation.py` (11: ciclos, idempotência, snapshot, filtros, rollback), `tests_api.py` (5: criação, tipo inativo, gerente não cria, catálogos), `tests.py` (2: FK PROTECT/seed), `patients/tests.py` `NeedTypeModelTests`+`NeedTypeStatusAPITests` (11). **Não executados nesta etapa → A VALIDAR.**

### 5. Evidências do frontend

- **Páginas/componentes**: `pages/NeedTypes.tsx` (266 l., "Manutenção de tipos" — **inoperante**, ver PN-1); seção de necessidades em `pages/AssessmentForm.tsx:566-647` (criação) e `pages/AssessmentDetail.tsx:222-281` (consulta/ações); `components/NeedEditForm.tsx` (89 l., edição inline); lib `src/lib/assessments.ts` (298 l.).
- **Rotas/guardas** (`App.tsx`): `/tipos` dentro de `GerenteOnly` (`RequireGerente`, `App.tsx:76-87`) — **médico/enfermeiro não acessam** (diverge de RN-NEC §5/RF-NEC-013/018); **não há item de menu nem link** para `/tipos` (`AppLayout.tsx:100-115` só Usuários/Categorias/Profissões) — página **inalcançável por navegação**.
- **Criação** (na tela da avaliação): gating `canAddNeeds = clinical && necessidades.create && avaliacoes.add_need` (`AssessmentForm.tsx:121-122`) — **correto** (Gerente bloqueado, sem OR com permissão que ele possui; ao contrário do PA-1 da avaliação); select **só tipos ativos** (`listNeedTypes()` → `/api/tipos-necessidade/`), prioridades do domínio, status readonly "Identificada", bloqueio "Salve a avaliação para adicionar necessidades", erros de catálogo/inclusão na seção.
- **Listagem**: exibida aninhada na avaliação (form e detalhe) com tipo/descrição/prioridade/status/**situação ativa-inativa** e data de inativação; **registros inativos aparecem** (não filtrados no cliente) — RF-NEC-012/015.
- **Edição**: `NeedEditForm` inline no detalhe com select de tipos ativos + opção "(atual)" para tipo inativo histórico, prioridade, descrição, `Status: Identificada · Situação` readonly, erros por campo (`parseFieldErrors`), catálogo falho não bloqueia manter o tipo atual.
- **Ações no detalhe** (`AssessmentDetail.tsx:245-266`), cada uma com gating fino por grupo + permissão granular: Editar (`necessidades.update`, clínico), Excluir (`necessidades.delete`, clínico, com `window.confirm` e mensagem "Para preservar o registro, use Inativar"), Inativar (`necessidades.inactivate`, equipe clínica completa), Reativar (`necessidades.reactivate`), Histórico (`necessidades.view`, clínico) — tudo desabilitado durante edição/requisição em andamento.
- **Histórico**: eventos exibidos com ação (`Inativada`/`Reativada`), ator, data e snapshot (`AssessmentDetail.tsx:269-276`).
- **Integração com a API**: `lib/assessments.ts` espelha os endpoints (`addNeed`, `updateNeed`, `deleteNeed` com tratamento de 204, `inactivateNeed`, `reactivateNeed`, `getNeedHistory`, `listNeedTypes`); `deleteNeed` usa `api()` e não `apiJson()` (evita erro ao ler corpo vazio). **Fluxo conectado** para necessidades (criar → listar → editar → excluir → inativar → reativar → histórico). **Fluxo quebrado** para administração de tipos (`NeedTypes.tsx` → `/api/tipos/*` → 404).
- **Validações client-side**: `required` do HTML, trim, botão desabilitado sem descrição/tipo; sem validação extra (backend rejeita).
- **Tratamento de erros**: mensagens por seção (`needError`/`needMessage`), 403 de exclusão com mensagem específica, erro de catálogo de tipos não bloqueia a edição.
- **Testes**: **nenhum** para o processo (`frontend/.../tests/` só `carePlans.test.mjs`, `careScales.test.mjs`, `careScales.browser.mjs`) → PN-6.

### 6. Entidades e relacionamentos

```
PatientAssessment ──1:N CASCADE──► CareNeed           (excluir avaliação excluiria as necessidades; sem delete de avaliação)
NeedType (app patients) ──FK PROTECT──► CareNeed      (tipo inativo preserva vínculo histórico)
CareNeed ──1:N──► CareNeedHistory                     (need SET_NULL, actor SET_NULL, snapshot JSON, action INACTIVATE/REACTIVATE)
CareNeed ◄──FK PROTECT── care_plans.CarePlanNeed      (exclusão bloqueada enquanto vinculada a plano → 500 hoje)
CareNeed.status = IDENTIFIED (único) · is_active/inactivated_at (situação, não status clínico)
NeedType: name único · status ACTIVE/INACTIVE · 8 tipos iniciais seed (patients/0005)
```

Conforme doc-mãe §6.2 (`care_needs`: `id, assessment_id, type, description, priority, status, created_at`): **todos os campos existem**; o código acrescenta `updated_at`, `is_active`, `inactivated_at` (necessários para RF-NEC-011/012/021 — extensão documentada nas tasks) e usa `need_type` FK em vez do campo `type` (nomenclatura; coerente com o modelo relacional). Divergência de escopo conhecida: `NeedType` modelada no app `patients` (P8 do Cadastro).

### 7. Regras implementadas e pendentes

**Implementadas**: RN-NEC §2 (3 itens), §3 (criar/visualizar/editar/inativar), §4 (dados e prioridades), §5 (entidade/seed/ativos/reativação de tipo), §6, §7 (distinção e preservação), §8, §9/§10, §11; RF-NEC-001…009, 011, 012, 015…017, 019…021 (ver §3).

**Pendências de definição herdas do doc (respeitadas — não implementadas por inferência)**:
1. Persistência da exclusão: "conforme a persistência definida na implementação" (RN §7) — hoje física, sem regra documentada;
2. Demais status e transições (corretamente adiados ao Plano);
3. Escopo exato de "administrar tipos" (criar/editar × só situação) — as tasks cobram criação/edição, o backend não tem;
4. Granularidade da "administração" dos tipos (RN §5 é vaga além de perfis);
5. Regras de frequência/escala/agendamento/visita/atendimento/evolução/estoque (fora do escopo — correto).

**Pendências novas desta auditoria**: ver §9 (DN-1…DN-5).

### 8. Problemas encontrados

| # | Problema | Tipo | Evidência |
|---|---|---|---|
| PN-1 | **Página "Manutenção de tipos" inteiramente inoperante**: `NeedTypes.tsx` chama `GET/POST /api/tipos/`, `PATCH /api/tipos/<id>/` e `POST /api/tipos/<id>/inativar\|reativar/` — **nenhum endpoint `/api/tipos/` existe** no backend (o real é `/api/tipos-necessidade/`) → 404 em todas as chamadas, inclusive o carregamento inicial | **Problema de integração (frontend × backend)** — funcionalidade não concluída | `NeedTypes.tsx:23,67,75,103` × `patients/urls.py:15-29` (único registro de tipos) |
| PN-2 | Backend **não possui criação/edição de tipos** (catálogo `GET` apenas, serializer todo read-only) — RF-NEC-013/tasks §5 exigem; a página tenta `POST`/`PATCH` inexistentes | Regra ausente / funcionalidade não implementada | `patients/views.py:217` (`http_method_names=["get"]`), `patients/serializers.py:145` |
| PN-3 | Rota `/tipos` **restrita ao Gerente** (`GerenteOnly`) e **sem item de menu/atalho** — RN-NEC §5/RF-NEC-013/018 permitem os três perfis; página inalcançável por navegação (só digitando a URL, e ainda assim falha por PN-1) | Divergência doc×código + controle de acesso/UX | `App.tsx:76-87` × `AppLayout.tsx:100-115` (sem link para `/tipos`) |
| PN-4 | **Excluir necessidade vinculada a plano → 500**: `CareNeed.care_need` é `PROTECT` em `care_plans` e `CareNeedViewSet.destroy` não trata `ProtectedError`; o botão "Excluir" não checa vínculo (herdado do PA-5 do Processo 2, agora auditado como RF-NEC-010/RN §7) | Problema de integração/erro não tratado (**A VALIDAR**) | `care_plans/models.py:73` × `assessments/views.py:159-174` × `AssessmentDetail.tsx:251-253` |
| PN-5 | **Zero testes de frontend** para necessidades (criação, gating, edição, exclusão, inativação/reativação, histórico) e para a página de tipos | Falta de testes | `frontend/.../tests/` só carePlans/careScales |
| PN-6 | **~46 testes backend não executados** nesta etapa → toda validação de execução fica `A VALIDAR` | Validação | Decisão do usuário (somente leitura) |
| PN-7 | `NeedType` modelada no app `patients` (outro processo) — a entidade central deste processo fica em app de cadastro (herdado do P8 do Cadastro; agravado: todo o catálogo vive em `patients/views.py`) | Modelagem/escopo | `patients/models.py:210`, `patients/views.py:207-266` |
| PN-8 | **Ambiguidade da visualização do Gerente**: RN-NEC §3/RF-NEC-009 dizem "não definida neste escopo", mas o Gerente **vê todas as necessidades aninhadas na avaliação** (`care_needs` no `PatientAssessmentSerializer`, gating `avaliacoes.view`) enquanto é **bloqueado** em `GET /api/necessidades/` — comportamento documentado só nas tasks, não nas RNs | Divergência doc×código (ambiguidade do doc) | `serializers.py:105,132` × `permissions.py:16-27` × `regras…necessidades.md:19` |
| PN-9 | **Exclusão física torna o histórico inacessível**: `CareNeedHistory.need` é `SET_NULL` — excluída a necessidade, os eventos ficam órfãos (preservados no banco, mas sem UI que os exiba); a tela só mostra histórico enquanto o registro existe | Regra ausente/decisão (interface com DN-3) | `models.py:200` × `AssessmentDetail.tsx:264-276` |
| PN-10 | `tasks_necessidades_identificadas.md` **desatualizado nos dois sentidos**: 6 tasks de modelagem e 6 de backend marcadas `[ ]` mas implementadas; 10 itens da seção "Fora do escopo" marcados `[ ]` embora "não fazer" seja o objetivo — **checkbox não reflete o estado real** (confirmação do inventário §8.4) | Divergência doc×código (doc stale) | `tasks_necessidades_identificadas.md:6-12,34-39,94-103` |
| PN-11 | `GET /api/necessidades/` com filtros `situacao`/`assessment` e paginação **não é usado pelo frontend** (ele consome a lista aninhada `care_needs`) — endpoint testado no backend mas sem consumo real; risco de divergência futura entre os dois caminhos de listagem | Observação/consistência (menor) | `lib/assessments.ts` (sem `listNeeds`) × `views.py:183-200` |

**Não são problemas (confirmados corretos)**: gating da criação na UI usa os dois perfis + as duas permissões (sem o OR problemático do PA-1); `status`/`assessment` read-only; tipo inativo mantido no vínculo atual e rejeitado na troca; idempotência de inativar/reativar com snapshot; resposta da inativação mínima para o Gerente não expor dados clínicos; exclusão tratando 204 sem ler JSON; histórico exibindo ator/data/snapshot; princípio de não antecipação respeitado (nenhuma transição de status, regra de escala ou estoque); seed dos 8 tipos idempotente; usuário inativo bloqueado em todas as ações.

### 9. Decisões pendentes no levantamento original (resolvidas em 22/11/2026)

Decisões aplicadas nesta implementação:
- **DN-1:** criar/editar nome e descrição de tipos; nome obrigatório e único.
- **DN-2:** Gerente, Médico e Enfermeiro administram tipos com `tipos_necessidade.manage`.
- **DN-3:** permitir exclusão sem vínculo com plano; retornar 400 claro quando houver vínculo protegido.
- **DN-4:** manter visualização aninhada do Gerente; consulta direta permanece clínica. RN e RF atualizados.
- **DN-5:** bloquear exclusão quando houver histórico, evitando eventos órfãos.

As linhas abaixo descrevem as perguntas pendentes no levantamento original, não o estado atual.

Novas para decisão humana (além das pendências do doc §7 e das decisões D1–D4/DA-1–DA-6/memória §8):
- **DN-1**: **escopo de "administrar tipos"** — criar/editar tipos é deste processo? As tasks cobram (`§2`, `§5`), a RN §5 fala em "administração" sem detalhar e o backend não tem. Definir endpoints (POST/PATCH), campos (nome/descrição) e validações (unicidade) — ou remover a expectativa das tasks/UI.
- **DN-2**: **perfis da página de tipos** — hoje só Gerente (rota `GerenteOnly`), docs dizem Gerente+Médico+Enfermeiro. Definir e alinhar rota, menu e permissões.
- **DN-3**: **persistência da exclusão de necessidade** (herda/encobre a DA-3 do Processo 2) — RN §7 é vaga ("conforme a persistência definida na implementação"); hoje é física e quebra com 500 quando vinculada a plano. Definir: exclusão bloqueada com 400, inativação obrigatória, ou exclusão livre.
- **DN-4**: **visualização do Gerente** — atualizar RN-NEC §3/RF-NEC-009 para refletir o comportamento atual (vê aninhado na avaliação, não vê no endpoint direto) ou restringir o aninhado; hoje doc e código discordam em silêncio.
- **DN-5**: **destino do histórico após exclusão física** (PN-9) — manter eventos órfãos, impedir exclusão quando houver eventos, ou expor histórico por outro caminho.

### 10. Dependências com outros processos

- **Avaliação inicial** (processo anterior): criação **só** pelo endpoint aninhado da avaliação (`POST /api/avaliacoes/<id>/necessidades/`) + permissões `avaliacoes.add_need`/`avaliacoes.view`; `CareNeed.assessment` CASCADE. **Dependência satisfeita**; efeito colateral: excluir avaliação (se algum dia existir delete) excluiria as necessidades — hoje impossível (sem delete de avaliação).
- **Plano de cuidados** (processo seguinte): consome `CareNeed` (PROTECT + `IDENTIFIED` + ativo + mesmo paciente) → **dependência satisfeita** (RF-NEC-017); efeito colateral: **bloqueia a exclusão física → 500** (PN-4, interface com DN-3/DA-3). Pendências do doc §8 ("este documento não define criação/aprovação do plano") respeitadas.
- **Cadastro do paciente**: `NeedType` modelada no app `patients` (PN-7) — dependência de modelagem a resolver (herança de TASK-CAD-PAC-045/P8).
- **Escala/agendamento/visita/atendimento/evolução**: sem código e sem regras (correto); as necessidades não antecipam frequência/profissional (RN §9.3 do doc-mãe).
- **Usuários**: matriz depende dos grupos (GERENTE/MEDICO/ENFERMEIRO) e das categorias com permissões granulares (seeds `accounts/0006-0009`). **Satisfeita**.
- **Recursos**: fora deste processo (DA-5 do Processo 2 permanece).

### 11. Tasks recomendadas

Novas tasks sugeridas para backlog (não implementadas nesta auditoria; prefixo `TASK-NEC-*` é **interno desta auditoria** — o doc de tasks não tem IDs formais):

1. **TASK-NEC-001 — Corrigir os endpoints da página de tipos** (PN-1): apontar `NeedTypes.tsx` para `/api/tipos-necessidade/` (+ `?status=todos` para ver inativos) e para as actions `/inativar|reativar/` corretas; validar o restante conforme DN-1/DN-2.
2. **TASK-NEC-002 — Implementar criação/edição de tipos no backend** (PN-2/DN-1): `POST`/`PATCH /api/tipos-necessidade/` com serializer gravável (nome único, descrição), permissão `tipos_necessidade.manage` + perfis definidos, testes — ou registrar formalmente "só situação" e remover o form da UI.
3. **TASK-NEC-003 — Ampliar o acesso à manutenção de tipos** (PN-3/DN-2): rota fora de `GerenteOnly` conforme a matriz, item de menu/atalho visível aos perfis autorizados.
4. **TASK-NEC-004 — Tratar exclusão de necessidade vinculada a plano** (PN-4/DN-3): capturar `ProtectedError` → 400 com mensagem clara (hoje: 500) + esconder/bloquear o botão quando vinculada; depende da decisão DN-3/DA-3.
5. **TASK-NEC-005 — Definir persistência da exclusão e destino do histórico** (DN-3/DN-5, PN-9): registro de decisão + ajuste documental (`RN-NEC §7`) e, se mantida a exclusão física, regra para eventos órfãos.
6. **TASK-NEC-006 — Testes de frontend do processo** (PN-5): gating de criação/edição/exclusão/inativação/reativação/historico + página de tipos (padrão `node:test`, `carePlans.test.mjs`).
7. **TASK-NEC-007 — Executar suíte backend de `assessments` + `patients`** (PN-6): `python manage.py test assessments patients accounts --noinput` e registrar resultado (fecha os `A VALIDAR`).
8. **TASK-NEC-008 — Alinhar a documentação de visualização do Gerente** (PN-8/DN-4): atualizar RN-NEC §3 e RF-NEC-009 com o comportamento real (ou restringir) — sem inventar regra antes da decisão.
9. **TASK-NEC-009 — Atualizar `tasks_necessidades_identificadas.md`** (PN-10): marcar modelagem/backend/front-end concluídos, corrigir a seção "Fora do escopo" e registrar as tasks realmente pendentes (criação/edição de tipos).
10. **TASK-NEC-010 — Avaliar movimento de `NeedType` para o app de necessidades** (PN-7, herança de TASK-CAD-PAC-045) — *baixa prioridade, higiene de modelagem; verificar impacto em migrations.*

---
