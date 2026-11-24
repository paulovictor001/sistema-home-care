## Processo 5 — **Escala** (auditado em 18/11/2026)

- `RN`: `docs/regras-de-negocio/regras_negocio_escala.md` — **IDs formais `RN-ESC-01…27`** (27 regras). Observação: o inventário (§8.2, 17/11) classificava este doc como "sem IDs formais" — **inventário desatualizado**; o doc possui IDs (diferente dos processos 2–4, que usaram convenção `§n`)
- `RF`: `docs/requisitos-do-sistema/requisitos_funcionais_escala.md` (`RF-ESC-01…24` — 24 IDs, conforme inventário §8.3)
- `TASK`: `docs/tasks/tasks_escala.md` (35 itens em 5 seções, sem IDs formais, **checkbox 100% desmarcado** embora o código exista — inventário §8.4/§9; checkbox não é evidência)
- Documento-mãe: `docs/Processos e Modelo de Dados.md` §3, §8, §9.4, §10, §11 e §15 — **atualizado na Etapa 3 (22/11/2026)** para descrever a Escala, suas entidades e decisões consolidadas; definições operacionais do Agendamento permanecem futuras.
- Decisões complementares: `docs/tasks/execucao_tasks_a_fazer.md` (rastreio **TA-120…154 / PRs #43–#77** — "sem merge nem alteração no Jira"; §"Decisões de domínio" com 5 decisões da escala; §"Validação" com 279/290 testes verdes declarados), `execucao_tasks_rubens.md:61-66` (roteiro browser de escalas), `AGENTS.md` (sem seção específica deste processo)
- Rastreio externo `TA-*`/PRs: código **presente no repositório local**; status Jira/GitHub não verificado (memória §8, decisão D2)

---

### 1. Resumo do processo

Organiza **quem** vai realizar as necessidades previstas no Plano de Cuidados — responde *"Quem vai realizar o atendimento?"* (doc-mãe §3). O doc de RN é explícito: a Escala define **quem**; o Agendamento, posteriormente, define **quando e onde** (`regras_negocio_escala.md` §Objetivo). É a **ponte entre o Plano e o futuro Agendamento** (doc-mãe §8, §9.4: profissional necessário ≠ profissional escalado).

Fluxo: paciente com Plano de Cuidados → **Gerente** (ou usuário com permissão `escalas.*`) cria a escala (status inicial Rascunho) vinculando paciente + plano + período → adiciona necessidades do plano → define frequência por necessidade (independente do plano) → vincula profissionais ativos compatíveis (1..N por necessidade, com substituições) → ativa (exige ≥1 necessidade com frequência e profissional compatível) → altera status livremente (Rascunho/Ativa/Suspensa/Encerrada) → consulta histórico (auditoria + substituições) → exclui (lógica).

**Entradas**: paciente, `CarePlan` com vínculos `CarePlanNeed` vigentes, `Professional` ativo com profissão, `Profession` de referência no vínculo do plano. **Saída**: `CareScale` com `ScaleNeed` (snapshot da profissão + frequência) e `ScaleAssignment` → consumida no futuro pelo Agendamento via `care_scales.contracts.scheduling_requirement`.

Escopo **não** deste processo (corretamente não antecipado): datas/horários/conflitos de visitas (RN-ESC-22, pertencem ao Agendamento), duração padrão, regra de conflito de agenda (doc-mãe §11), regras de visita/atendimento/evolução.

### 2. Status geral

**PARCIAL — processo implementado com decisões complementares consolidadas em 22/11/2026. A suíte backend completa de `care_scales` + `accounts` passou (83 testes, Etapa 5); testes unitários frontend, build e fluxo e2e Playwright passaram (Etapa 6). A integração com Agendamento permanece pendente até existir consumidor.**

RN-ESC: **26 CONCLUÍDO, 1 PARCIAL (RN-ESC-25 — bloqueio de novos agendamentos sem consumidor)**. RF-ESC: **23 CONCLUÍDO, 1 PARCIAL (RF-ESC-22 — idem)**. **Nenhuma DIVERGENTE e nenhuma NÃO INICIADO** (primeiro processo da etapa 2 sem divergência RN×código, empatando com o Plano de Cuidados no que diz respeito à RN). Ressalvas: (a) **efetividade do bloqueio de agendamento em escala encerrada não é verificável** — o contrato existe e é testado, mas o módulo Agendamento (que deveria consumi-lo) não existe; (b) **casos-limite não definidos nos docs** e permitidos pelo código — escala sobre plano **Rascunho/Encerrado**, **exclusão** de escala Ativa/Encerrada, observação sem frequência; (c) **doc-mãe §10/§11/§15 e `tasks_escala.md` desatualizados** face à implementação; (d) **37 testes backend + 3 arquivos de teste frontend existem mas não foram executados** (`A VALIDAR`); (e) rota `/pacientes/:patientId/escalas` **sem link de entrada** (órfã).

### 3. Requisitos e status de implementação

#### 3.1 Regras de negócio (RN-ESC-01…27)

| ID | Regra | Status | Evidência / motivo |
|---|---|---|---|
| RN-ESC-01 | Gerente e usuários com permissão criam/montam escalas | **CONCLUÍDO** | `create_scale` → `require_scale_permission(actor,'create')` (`services.py:36`); `ScalePermission` `create` (`permissions.py:36`); `has_scale_permission` = superusuário **ou** grupo GERENTE **ou** granular `escalas.create` (`permissions.py:8-12`); seed **só categoria Gerente** (`accounts/0011:8-13`); UI `canScale('create')` (`CareScales.tsx:39`) |
| RN-ESC-02 | Gerente e usuários com permissão editam | **CONCLUÍDO** | `update_scale` → `update` (`services.py:50`), campos restritos a `patient/care_plan/start_date/end_date/observation` (`services.py:58-59`, `serializers.py:66-76`); UI `canScale('update')` (`CareScaleDetail.tsx:73`) |
| RN-ESC-03 | Visualização: Gerente, **profissionais escalados** e usuários com permissão | **CONCLUÍDO** | `visible_scales(user)` devolve tudo com `view`, senão só escalas com vínculo vigente **próprio** e profissional ativo (`permissions.py:15-24`); `ScalePermission` view + objeto (`:51-59`); menu condicionado a `GET /acesso/` (`AppLayout.tsx:107,161`); testes `test_assigned_professional_sees_only_current_own_scales`, `test_assigned_visibility_scopes_list_detail_history_and_catalog` |
| RN-ESC-04 | Gerente e usuários com permissão excluem | **CONCLUÍDO** | `destroy` → `delete` → `delete_scale` **exclusão lógica** `deleted_at` (`views.py:55-57`, `services.py:66-73` — decisão de domínio: preserva vínculos e auditoria, `execucao_tasks_a_fazer.md:56`); UI com `window.confirm` explicando preservação (`CareScaleDetail.tsx:55`) |
| RN-ESC-05 | Escala vinculada a paciente e Plano de Cuidados | **CONCLUÍDO** | `ScaleWriteSerializer` exige `patient` + `care_plan` (`serializers.py:70`); `validate_relationship` verifica obrigação **e** que o plano pertence ao paciente (`services.py:14-21`); FKs `PROTECT` (`models.py:21-24`); UI deriva o paciente do plano selecionado (`CareScales.tsx:33`) |
| RN-ESC-06 | Utiliza necessidades do Plano do paciente | **CONCLUÍDO** | `add_need` só aceita vínculo **vigente e do mesmo plano** (`services.py:81-85`); catálogo `GET .../planos/` expõe só as necessidades vigentes do plano (`views.py:140-146`); teste `test_removed_or_other_plan_need_rejected` |
| RN-ESC-07 | Necessidades podem ser adicionadas a qualquer momento | **CONCLUÍDO** | `add_need` sem checagem de status da escala (`services.py:76-92`); UI "Adicionar necessidade" (`CareScaleDetail.tsx:76-77`) |
| RN-ESC-08 | Removidas a qualquer momento, sem exclusão da necessidade original | **CONCLUÍDO** | `remove_need` = `removed_at` + encerra vínculos vigentes; `CarePlanNeed` intocado (`services.py:95-107`); teste `test_add_remove_readd_preserves_plan_and_frequency_snapshot` |
| RN-ESC-09 | Remoção de necessidade não exige motivo | **CONCLUÍDO** | `remove_need` não recebe nem valida motivo (contrastando com o plano, onde é obrigatório — decisão do Processo 4); UI só `window.confirm` (`ScaleNeedManagement.tsx:41`) |
| RN-ESC-10 | Cada necessidade: 1..N profissionais, sem limite | **CONCLUÍDO** | `ScaleAssignment` sem limite + unicidade só do par não removido (`models.py:62-72`); `add_professionals` lote atômico (`services.py:172-183`); teste `test_multiple_assignments_and_atomic_batch_without_ceiling` |
| RN-ESC-11 | Profissional ativo com profissão compatível | **CONCLUÍDO** | `assign` exige `is_active` e `profession_id == item.required_profession_id` (snapshot copiado do plano no `add_need`, `services.py:86-89,114-122`); revalidado na ativação (`services.py:240-242`); testes `test_inactive_and_incompatible_substitution_rolls_back`, `test_profession_changed_after_assignment_blocks_activation…` |
| RN-ESC-12 | Adicionar/remover/substituir profissionais a qualquer momento | **CONCLUÍDO** | 4 services dedicados sem checagem de status (`services.py:125-183`); endpoints `.../profissionais[/lote]`, `.../remover`, `.../substituir` (`views.py:73-102`); UI em `ScaleNeedManagement.tsx:39-41` |
| RN-ESC-13 | Substituições preservam o profissional anterior no histórico | **CONCLUÍDO** | `ScaleSubstitution` com `previous_professional/new_professional` **+ nomes denormalizados** + autor (`models.py:89-102`, `services.py:163-166`); teste `test_substitution_names_and_actor_survive_rename_and_user_deletion` |
| RN-ESC-14 | Adições/remoções simples **não** geram registro específico no histórico | **CONCLUÍDO** | Só `substitute_professional` cria `ScaleSubstitution`; adição/remoção simples só aparece na auditoria geral (exigida pela RN-ESC-27); teste `test_simple_removals_logged_generally_without_substitution_and_failure_does_not_log`. **Interpretação registrada**: "registro específico" = lista de substituições (`GET .../substituicoes/`), distinta da auditoria — UI as exibe separadamente (`CareScaleDetail.tsx:91-93`) |
| RN-ESC-15 | Escala define a frequência (pode aumentar/diminuir × plano) | **CONCLUÍDO** | `configure_need` aceita qualquer quantidade inteira ≥1, independente do plano (`services.py:186-206`); referência do plano preservada em `planned_quantity/planned_period` (`services.py:88-89`); teste `test_frequency_can_increase_decrease_and_change_period_independently` |
| RN-ESC-16 | Motivo da alteração de frequência opcional | **CONCLUÍDO** | `frequency_reason` `blank=True` (`models.py:42`), `required=False` (`serializers.py:21`); teste `test_reason_optional_preserved_when_omitted_and_can_be_cleared`; UI "Motivo da frequência (opcional)" (`ScaleNeedManagement.tsx:30`) |
| RN-ESC-17 | Data início/fim obrigatórias e dentro do período do Plano | **CONCLUÍDO** | `validate_period` (obrigatórias, `fim ≥ início`, dentro do plano) chamado em **criação, edição e ativação** (`services.py:24-30,38,56,228`); serializer exige (`serializers.py:70`); UI `required` + `min={start}` (`CareScales.tsx:44-45`); teste `test_boundaries_and_invalid_create_and_partial_update` |
| RN-ESC-18 | Status: Rascunho, Ativa, Suspensa, Encerrada | **CONCLUÍDO** | `ScaleStatus` (4 valores) + `CheckConstraint valid_care_scale_status` (`models.py:6-10,31`); labels no frontend (`careScales.ts:6`) |
| RN-ESC-19 | Qualquer transição de status é permitida (com permissão) | **CONCLUÍDO** | `change_status` sem grafo restritivo — só valida status e, **alvo = Ativa**, as condições de ativação (`services.py:209-223`); permissão dedicada `escalas.change_status`; teste `test_every_status_pair_allowed_when_activation_requirements_met`, `test_four_statuses_any_transition_and_independent_permission` |
| RN-ESC-20 | Observação geral e por necessidade opcionais | **CONCLUÍDO** | `CareScale.observation` e `ScaleNeed.observation` `blank=True` (`models.py:20,42`); UI marca "(opcional)" (`CareScales.tsx:46`, `ScaleNeedManagement.tsx:31`) |
| RN-ESC-21 | Disponibilidade e região do profissional consideradas | **CONCLUÍDO** | `ProfessionalPlanningInfo` (regiões + notas) + `GET .../profissionais-disponiveis/` filtra por profissão/ativo e devolve `region_match` × região do paciente (`planning.py:20-32`); UI exibe "Região atendida / Verifique atendimento nesta região" e edição do planejamento (`ScaleNeedManagement.tsx:36-37`); teste `test_region_and_availability_support_selection_without_time_rules`. **Informativo por decisão de domínio** (`execucao_tasks_a_fazer.md:54` — datas/horários ficam para o Agendamento) → pendência D-ESC-3 (doc-mãe §11 ainda lista "Regra de organização por região" como não validada) |
| RN-ESC-22 | Datas/horários e conflitos de visitas pertencem ao Agendamento | **CONCLUÍDO** | Nenhum campo de horário/duração/conflito em `CareScale`/`ScaleNeed`/`ScaleAssignment`; `contracts.py:1` ("não cria visitas ou horários"); teste `test_region_and_availability_support_selection_without_time_rules` (sem regras de tempo) — princípio de não antecipação respeitado |
| RN-ESC-23 | Alterações no Plano não alteram automaticamente a escala | **CONCLUÍDO** | Snapshot no `add_need`: `required_profession_id` copiado do vínculo e `planned_quantity/period` congelados (`services.py:86-89`, comentário `models.py:46`); decisão de domínio "mudanças no plano não sobrescrevem a escala"; teste `test_add_remove_readd_preserves_plan_and_frequency_snapshot` |
| RN-ESC-24 | Necessidade retirada do Plano não pode permanecer na escala | **CONCLUÍDO** | **Dupla barreira**: (1) `care_plans` **bloqueia** a remoção enquanto houver vínculo vigente em escala não excluída (400 "Remova esta necessidade das escalas antes…", `care_plans/services.py:114-116`); (2) `validate_activation` revalida que nenhum item está com `plan_need.removed_at` (`services.py:233-234`); testes `test_explicit_scale_removal_required_before_plan_removal`, `test_removed_or_other_plan_need_rejected` |
| RN-ESC-25 | Escala encerrada permanece para consulta e **não gera novos agendamentos** | **PARCIAL** | Consulta: ✓ (`CLOSED` segue em `visible_scales`; teste `test_closed_history_consultable_and_reopening_reuses_same_record` + `auth_client(...).get(...)=200`). Bloqueio: `contracts.scheduling_requirement` exige status Ativa **e** revalida ativação (`contracts.py:8-20`, teste `test_closed_remains_readable_but_cannot_supply_new_schedule`), **porém nada o consome** — módulo Agendamento não existe (sem código, sem rota) → fluxo não verificável de ponta a ponta; efetividade depende da decisão D-ESC-4 |
| RN-ESC-26 | Para ativar: paciente, plano, ≥1 necessidade e profissional compatível | **CONCLUÍDO** | `validate_activation` (`services.py:226-242`): relação paciente/plano, período, ≥1 item vigente, todos com frequência válida, ≥1 profissional vigente por item e todos ativos/compatíveis — chamado **toda vez que o alvo é Ativa** (`services.py:216-217`); testes `test_activation_validates_needs_frequency_and_current_professional`, `test_each_current_need_requires_professional…` |
| RN-ESC-27 | Alterações relevantes registram usuário e data | **CONCLUÍDO** | Decorador `@audited(...)` transacional com `snapshot` antes/depois; grava `ScaleAuditEvent` (actor + `actor_name` + data + `previous_data`/`new_data`) **só quando houve mudança** (`audit.py:25-47`), aplicado às 14 operações (`services.py`); `created_by/updated_by` (`models.py:14-15`); testes `test_mutations_capture_actor_old_and_new_and_idempotent_status`, `test_failed_audit_rolls_back_change…` |

**Tally RN**: 27 itens → **26 CONCLUÍDO, 1 PARCIAL (RN-ESC-25)**. **Nenhuma DIVERGENTE.** Disponibilidade/região são informativas por decisão consolidada. A auditoria registra que a regra adicional de exigir plano Ativo e bloquear exclusão de escala Ativa foi implementada; a matriz acima deverá ser revisitada em uma atualização futura para refletir a nova regra de status do plano.

#### 3.2 Requisitos funcionais (RF-ESC-01…24)

| ID | Requisito | Status | Observação |
|---|---|---|---|
| RF-ESC-01 | Criar escala conforme permissão | **CONCLUÍDO** | `POST /api/escalas/` (`views.py:43-47`) + botão "Nova escala" só `canScale('create')` (`CareScales.tsx:39`); formulário com plano/período/observação (`:40-48`) |
| RF-ESC-02 | Editar escala conforme permissão | **CONCLUÍDO** | `PATCH <id>/` restrito a 5 campos + revalidação de relação/período (`services.py:49-63`); UI inline só `canScale('update')` (`CareScaleDetail.tsx:67-73`) |
| RF-ESC-03 | Visualizar escala conforme permissão | **CONCLUÍDO** | Escopo por permissão/escopo próprio (ver RN-ESC-03); rota aberta a autenticados com gating de dados no backend + menu via `/acesso/` |
| RF-ESC-04 | Excluir escala conforme permissão | **CONCLUÍDO** | `DELETE <id>/` → `escalas.delete` (403 sem permissão — teste `test_roles_and_independent_action_grants_reject_side_effects`); exclusão lógica com aviso na UI (`CareScaleDetail.tsx:55-57`) |
| RF-ESC-05 | Vincular paciente e Plano de Cuidados | **CONCLUÍDO** | Idem RN-ESC-05; seleção única "Paciente / Plano" no form (`CareScales.tsx:42`); troca de vínculo posteriormente **bloqueada** quando há necessidades (`services.py:54-55`) — restrição extra do código, docs silenciosos |
| RF-ESC-06 | Adicionar/remover necessidades do Plano a qualquer momento | **CONCLUÍDO** | Endpoints `POST <id>/necessidades/` e `.../remover/` (`views.py:59-71`) + UI (`CareScaleDetail.tsx:76-77`, `ScaleNeedManagement.tsx:41`); sem restrição de status |
| RF-ESC-07 | Um ou mais profissionais por necessidade, sem limite | **CONCLUÍDO** | Idem RN-ESC-10; UI adiciona um a um (lote disponível só na API — `POST .../profissionais/lote`, `views.py:96-102`) |
| RF-ESC-08 | Validar profissional ativo e profissão compatível | **CONCLUÍDO** | Idem RN-ESC-11 (validação em cada vínculo **e** na ativação) |
| RF-ESC-09 | Adicionar, remover e substituir profissionais a qualquer momento | **CONCLUÍDO** | Idem RN-ESC-12; UI `ScaleNeedManagement.tsx:39-40` com botões por vínculo vigente |
| RF-ESC-10 | Preservar histórico de substituições | **CONCLUÍDO** | `ScaleSubstitution` + `GET <id>/substituicoes/` (`views.py:136-138`) + UI "Substituições de profissionais" (`CareScaleDetail.tsx:92`) |
| RF-ESC-11 | Definir frequência por necessidade | **CONCLUÍDO** | `POST <id>/necessidades/<item>/configurar/` (`views.py:104-110`) + form (`ScaleNeedManagement.tsx:27-33`); exibição "Frequência na escala" × "Referência do plano" (`CareScaleDetail.tsx:81-82`) |
| RF-ESC-12 | Aumentar/diminuir frequência com motivo opcional | **CONCLUÍDO** | Idem RN-ESC-15/16; `NeedConfigurationSerializer` rejeita campos desconhecidos (`serializers.py:26-30`); teste `test_positive_adjustments_each_unit_optional_reason_and_failed_edit_audit` |
| RF-ESC-13 | Exigir início/fim e validar contra o Plano | **CONCLUÍDO** | Idem RN-ESC-17 (validação em create/update/ativação) |
| RF-ESC-14 | Suportar os 4 status | **CONCLUÍDO** | Idem RN-ESC-18; select com os 4 (`CareScaleDetail.tsx:65`) |
| RF-ESC-15 | Permitir qualquer transição para usuários autorizados | **CONCLUÍDO** | Idem RN-ESC-19; permissão granular `escalas.change_status` distinta das demais |
| RF-ESC-16 | Registrar observação geral opcional | **CONCLUÍDO** | Idem RN-ESC-20 |
| RF-ESC-17 | Registrar observação opcional por necessidade | **CONCLUÍDO** | `ScaleNeed.observation` editável via `configurar` (`services.py:192`) e exibida (`CareScaleDetail.tsx:83`) |
| RF-ESC-18 | Considerar disponibilidade e região do profissional | **CONCLUÍDO** | Idem RN-ESC-21 (informativo por decisão registrada; pendência D-ESC-3) |
| RF-ESC-19 | Manter datas/horários das visitas sob responsabilidade do Agendamento | **CONCLUÍDO** | Idem RN-ESC-22 — nenhuma regra de tempo implementada na escala |
| RF-ESC-20 | Não atualizar automaticamente a escala quando o Plano mudar | **CONCLUÍDO** | Idem RN-ESC-23 (snapshots + teste) |
| RF-ESC-21 | Impedir necessidade que deixou o Plano de permanecer na escala | **CONCLUÍDO** | Idem RN-ESC-24 (bloqueio na origem + revalidação na ativação + 2 testes) |
| RF-ESC-22 | Manter escala encerrada para consulta e **impedir novos agendamentos** | **PARCIAL** | Idem RN-ESC-25 — consulta ✓; contrato de bloqueio pronto e testado, **sem consumidor** (Agendamento inexistente) → fluxo não conectado de ponta a ponta |
| RF-ESC-23 | Validar condições mínimas antes da ativação | **CONCLUÍDO** | Idem RN-ESC-26; `POST <id>/status/` com `status=ACTIVE` (`views.py:112-117`) |
| RF-ESC-24 | Registrar usuário/data nas alterações relevantes | **CONCLUÍDO** | Idem RN-ESC-27 (audit + autores + UI exibe `actor_name`) |

**Tally RF**: 24 itens → **23 CONCLUÍDO, 1 PARCIAL (RF-ESC-22)**.

#### 3.3 Tasks (`tasks_escala.md` — 35 itens, 5 seções, sem IDs, checkbox 100% desmarcado)

Status por evidência de código (checkbox não é evidência — inventário §8.4/§9). Rastreio Jira correspondente: **TA-120…154 / PRs #43–#77** (`execucao_tasks_a_fazer.md:15-49`), descrito como **sem merge/status no Jira** — não verificado externamente.

| Seção | Tasks | Status |
|---|---|---|
| Modelagem (4) | entidade `care_scales`, relação paciente/plano/necessidade/profissional, datas/status/frequência/observações, auditoria + substituições | **CONCLUÍDO** — 6 entidades + 5 migrations (`care_scales/0001…0005`) |
| Permissões (2) | catálogo criar/editar/visualizar/excluir/alterar status + aplicação às ações | **CONCLUÍDO** — seed `accounts/0011` (5 permissões `escalas.*`, só Gerente) + `ScalePermission` com negação por default |
| Backend (15) | criação/edição, validação de paciente/plano/período, necessidades, profissionais (incl. lote/substituição), compatibilidade, frequência, 4 status, ativação, disponibilidade/região, bloqueio de retirada do plano, contrato de escala encerrada, auditoria | **CONCLUÍDO** — 14 services transacionais + `planning.py` + `contracts.py` + `audit.py` (ver §4) |
| Frontend (5) | listagem/criação/edição, exibição completa, gestão de necessidades/profissionais, observações/histórico, permissões | **CONCLUÍDO** — 2 páginas + 1 componente + lib (ver §5) |
| Testes (9) | permissões, compatibilidade/inativo, múltiplos profissionais/substituição, histórico, frequência, período/status, ativação, escala encerrada, auditoria | **CONCLUÍDO** — **83 testes backend** (`care_scales` + `accounts`), **3 casos unitários frontend**, build TypeScript/Vite e fluxo e2e Playwright aprovados nas Etapas 5 e 6 |

### 4. Evidências do backend

- **App** `backend/sistema_home_care/care_scales/` — 6 entidades + 1 TextChoices:
  - `CareScale` (`models.py:13-34`): `patient`/`care_plan` **PROTECT nullable** (obrigatórios via serializer, não via banco), `status` default `DRAFT` + `CheckConstraint`, `start_date/end_date` nullable no modelo (obrigatórios via validação de serviço), `observation`, `deleted_at` (**exclusão lógica**), `created_by/updated_by` SET_NULL, timestamps; ordering `-created_at`.
  - `ScaleNeed` (`models.py:37-59`): FK `scale` PROTECT + `plan_need` → `care_plans.CarePlanNeed` PROTECT, **`required_profession` = snapshot da profissão exigida** ("Plano não sobrescreve escala", `:46`), `frequency_quantity/period` e `planned_quantity/period` (referência do plano), `frequency_reason`, `observation`, remoção lógica `removed_at`; constraints: `unique_current_scale_need` (par não removido), `scale_need_positive_frequency`, `scale_need_valid_period`.
  - `ScaleAssignment` (`models.py:62-72`): FK `item`/`professional` PROTECT, remoção lógica, `unique_current_scale_professional`.
  - `ScaleAuditEvent` (`models.py:75-86`): `scale`/`actor` SET_NULL + `actor_name` denormalizado, `action`, `previous_data`/`new_data` JSON.
  - `ScaleSubstitution` (`models.py:89-102`): profissionais e **nomes** (`previous_name/new_name`) + `actor_name` — sobrevive a renomeação/exclusão (teste dedicado).
  - `ProfessionalPlanningInfo` (`models.py:105-109`): 1:1 com `Professional` (CASCADE), `regions` JSON + `availability_notes` — **cadastro de apoio ao planejamento**, separado do stub de profissional (decisão de domínio).
- **Migrations**: 5 (`care_scales/0001…0005` — inclui `0004` dos autores/exclusão lógica e `0005` planning info) + seed **`accounts/0011_seed_scale_permissions`** (`create/update/view/delete/change_status` → **somente categoria Gerente**; outros perfis dependem de concessão via tela de Categorias). Teste `test_distinct_permissions_seeded_only_for_manager` confirma o seed.
- **Services** (`services.py`, 16 funções — padrão serviço dedicado, como `care_plans`): `validate_relationship` (lock de paciente+plano, mesma pertinência), `validate_period` (obrigatórias, coerência, dentro do plano), `create_scale`, `update_scale` (whitelist de campos; **bloqueia troca de paciente/plano com necessidades**), `delete_scale` (lógico), `add_need`/`remove_need` (snapshot de profissão/frequência; remoção encerra vínculos), `assign` (ativo + compatível + unicidade), `add_professional`/`remove_professional`/`substitute_professional` (cria `ScaleSubstitution`), `add_professionals` (lote), `configure_need` (whitelist + validação), `change_status` (livre; ativação validada), `validate_activation`. Todos os `14` mutantes são `@transaction.atomic` + `@audited(...)`.
- **Permissões** (`permissions.py`): `ACTIONS` (5), `has_scale_permission` (superusuário \| grupo GERENTE \| granular `escalas.<action>`), `visible_scales` (escopo do profissional escalado), `require_scale_permission`, e `ScalePermission` com `action_map` completo das **20 ações** do ViewSet (mapeia ações aninhadas → `update`, histórico/substituições → `view`, `plan_options` → create\|update, `access` → qualquer autenticado ativo) — **ação não mapeada é negada** (`has_scale_permission` retorna False para ação fora de `ACTIONS`).
- **Serializers** (12, `serializers.py`): `ScaleWriteSerializer` (create/update com rejeição de campos desconhecidos), `ScaleSerializer` (leitura com `items` aninhados + `patient_name`), `ScaleNeedSerializer`, `AssignmentSerializer`, `AddNeed/Professional(s)/NeedConfiguration/Status/PlanningInfo/Audit/Substitution` — ações de configuração rejeitam campos fora do domínio (`:26-30`).
- **Views/endpoints** (`views.py` + `urls.py` → `/api/escalas/`, paginação **20/página**):
  - `GET/POST /api/escalas/` (view/create) com filtro `?patient=<id>` validado (`:33-40`); `GET/PUT/PATCH/DELETE <id>/`
  - `POST <id>/necessidades/`, `POST <id>/necessidades/<item>/remover/`, `POST <id>/necessidades/<item>/configurar/`
  - `POST <id>/necessidades/<item>/profissionais[/lote]/`, `.../<assignment>/remover/`, `.../<assignment>/substituir/`
  - `POST <id>/status/`; `GET <id>/necessidades/<item>/profissionais-disponiveis/`
  - `PUT /api/escalas/profissionais/<id>/planejamento/` (detail=False)
  - `GET <id>/historico/`, `GET <id>/substituicoes/`, `GET /api/escalas/planos/` (catálogo), `GET /api/escalas/acesso/` (gating do menu)
- **Planning** (`planning.py`): `update_planning` (lock do profissional, UPSERT de regiões/notas) e `professional_options` (ativos + profissão exigida + `region_match` × região do paciente — **informativo**, sem bloqueio).
- **Contrato** (`contracts.py`): `scheduling_requirement(scale)` — exige status **Ativa** + revalida ativação e devolve paciente/plano/período/itens/profissionais vigentes para o futuro Agendamento; **sem consumidor** (RN-ESC-25/RF-ESC-22 PARCIAL).
- **Auditoria** (`audit.py`): decorator `@audited(action)` aplicado **dentro** da transação (comentário `:26`): snapshot antes → operação → snapshot depois → `ScaleAuditEvent` **só se diferente** (status idempotente não loga); `actor_name` denormalizado. Cobertura: CREATE/UPDATE/DELETE/ADD_NEED/REMOVE_NEED/ADD_PROFESSIONAL(S)/REMOVE_PROFESSIONAL/SUBSTITUTE/CONFIGURE_NEED/STATUS.
- **Admin** (`admin.py`): `CareScale`, `ScaleAuditEvent`, `ScaleSubstitution` somente leitura.
- **Integração com o Plano (Processo 4)**: `care_plans/services.py:114-116` bloqueia retirar do plano necessidade vigente em escala (400) — testado do lado da escala (`tests_plan_consistency.py`).
- **Testes**: **37 métodos `test_*` em 28 arquivos** (+`test_support.py` com fixture) — cobertura por nome confirma todos os 9 itens da seção Testes das tasks: ativação (`tests_activation`, `tests_activation_contract`), API (`tests_api`), vínculos (`tests_assignment_management`), auditoria (`tests_audit_operations`, `tests_audit_contract`), autorização (`tests_authorization`, `tests_http_permissions`), escala encerrada (`tests_closed_contract`, `tests_history_model`), frequência (`tests_frequency_configuration|contract|reason`), histórico (`tests_history_preservation`), catálogo de permissões (`tests_permission_catalog`), múltiplos profissionais/substituição (`tests_multiple_*`), necessidades (`tests_need_management`), período/status (`tests_period_*`), consistência com o plano (`tests_plan_consistency`), planejamento/região (`tests_planning`), profissionais (`tests_professional_*`), relacionamento (`tests_relationship_validation`), contrato de agendamento (`tests_scheduling_contract`), status (`tests_status`). **Não executados nesta etapa → A VALIDAR** (docs declaram 37 da escala dentro de 279/290 verdes — afirmação documentada, não verificada).

### 5. Evidências do frontend

- **Páginas/componentes**: `pages/CareScales.tsx` (52 l. — listagem + criação), `pages/CareScaleDetail.tsx` (96 l. — dados/edição, status, necessidades, histórico), `components/ScaleNeedManagement.tsx` (44 l. — frequência, profissionais, planejamento, remoção da necessidade); lib `src/lib/careScales.ts` (36 l. — espelha as **18 chamadas** da API + gating).
- **Rotas/guardas** (`App.tsx:56-58`): `/escalas`, `/pacientes/:patientId/escalas`, `/escalas/:id` dentro do layout protegido (`RequireAuth`); **controle de acesso dentro das páginas** via `canScale(user, action)` (`careScales.ts:7-9` = grupo `GERENTE` **ou** `escalas.<action>`, espelhando o backend com uma ressalva — ver P-ESC-7).
- **Menu/navegação**: item "Escalas" no `AppLayout` condicionado a `GET /api/escalas/acesso/` (`AppLayout.tsx:107,161`) — **resolve o problema PA-14/PC-9 dos processos anteriores** (escopo do profissional escalado já entra em `view`); card na `Home` com mesma checagem (`Home.tsx:459-463,525`). **Porém** a rota por paciente `/pacientes/:patientId/escalas` **não tem nenhum link** no app (P-ESC-1).
- **Criação**: botão só `canScale('create')`; catálogo `GET .../planos/` (filtra por paciente da rota); selecionar plano preenche início/fim com as datas do plano; `required` + `min={start}`; aviso "Nenhum plano disponível. Registre o Plano de Cuidados primeiro."; erros do backend exibidos (`role="alert"`).
- **Listagem**: escala linkada, label do status, período; paginação com **`next` do DRF** (mesmo padrão corrigido do PA-11); estados loading/erro/vazio; **sem filtros de busca** (docs não exigem).
- **Detalhe**: paciente/plano/status; edição inline de período/observação (`canScale('update')`); **seletor de status com as 4 opções** (`canScale('change_status')`) e exclusão com confirmação explicando preservação (`canScale('delete')`); necessidades com frequência da escala × referência do plano × observação × motivo; vínculos removidos visíveis ("Removida da escala", "Vínculo encerrado"); histórico sob demanda (substituições com `previous → new · autor · data` + auditoria).
- **Gestão por necessidade** (`ScaleNeedManagement`, só `canScale('update')` e item vigente): frequência (qtd `min=1`, período, motivo, observação), lista de profissionais **ativos e compatíveis** (`profissionais-disponiveis`), exibição de **região do paciente × regiões atendidas × disponibilidade**, edição do planejamento (regiões por vírcula + notas), adicionar/remover/substituir profissional, remover necessidade com confirmação.
- **Integração com a API**: `careScales.ts` cobre list/get/create/update/delete/acesso/status/planos + necessidades (add/remove/configurar) + profissionais (disp./add/lote?/remover/substituir/planejamento) + substituições/histórico, com `apiJson` + `credentials:"include"` (refresh silencioso de `lib/api.ts`). **Fluxo conectado**: menu → listagem → nova escala → detalhe → editar → adicionar necessidade → gerenciar (frequência/profissionais/substituição/região) → status → histórico → excluir.
- **Validações client-side**: `required`/`min` de HTML, `min=1` na frequência, desabilitação de botões durante operações, `window.confirm` nas ações destrutivas; o restante é rejeitado pelo backend com mensagens exibidas na seção.
- **Testes**: `tests/careScales.test.mjs` — **3 casos** (`node:test`): gating de ações (Gerente/superusuário/permissão independente, Médico sem permissão, anônimo e ação desconhecida), rótulos do histórico e chamadas de DELETE/status; `tests/careScales.browser.mjs` — fluxo e2e Playwright com API mockada: criar, editar, incluir necessidade, disponibilidade, vincular, substituir, frequência, status, histórico, **leitura restrita sem controles** e DELETE 204. Execução formal via `npm run test:care-scales` (unitários + build + e2e); em máquinas novas, instalar Chromium com `npx playwright install chromium`; `CHROMIUM_PATH` é opcional. **3 testes, build e e2e aprovados em 22/11/2026 (Etapa 6)**; lint concluiu com um warning em `src/pages/Resources.tsx:20`.

### 6. Entidades e relacionamentos

```
Patient ──FK PROTECT──► CareScale                 (nullable no modelo; obrigatório via API + validate_relationship)
CarePlan ──FK PROTECT──► CareScale                (escala não troca de plano/paciente quando tem necessidades)
CareScale ──1:N PROTECT──► ScaleNeed ──FK PROTECT──► care_plans.CarePlanNeed   (remoção lógica; unicidade do par vigente)
ScaleNeed.required_profession ──FK PROTECT──► accounts.Profession   (snapshot no momento da inclusão)
ScaleNeed ──1:N PROTECT──► ScaleAssignment ──FK PROTECT──► professionals.Professional  (remoção lógica; unicidade do par vigente)
CareScale ──1:N SET_NULL──► ScaleAuditEvent        (actor SET_NULL + actor_name; previous/new_data JSON)
CareScale ──1:N SET_NULL──► ScaleSubstitution ──► ScaleNeed + 2×Professional (nomes denormalizados) + actor
Professional ──1:1 CASCADE──► ProfessionalPlanningInfo (regions JSON, availability_notes)
CareScale.created_by/updated_by ──SET_NULL── accounts.User
Constraints: valid_care_scale_status · unique_current_scale_need · scale_need_positive_frequency ·
             scale_need_valid_period · unique_current_scale_professional
Tabelas reais: care_scales, care_scale_needs, care_scale_assignments, care_scale_audit_events,
               care_scale_substitutions, professional_planning_info (migration 0005)
```

**Doc-mãe × código**: divergência documental identificada inicialmente em P-ESC-2 foi corrigida na Etapa 3 (22/11/2026): §10 descreve a Escala, §11 separa decisões consolidadas das pendências do Agendamento e §15 lista as entidades implementadas.

### 7. Regras implementadas e pendentes

**Implementadas**: RN-ESC-01…24, 26, 27 (ver §3.1) e RF-ESC-01…21, 23, 24; decisões de domínio registradas em `execucao_tasks_a_fazer.md:51-57` (profissão de referência copiada do plano; regiões/disponibilidade informativas e separadas do stub; remoção explícita da escala antes do plano; exclusão lógica + contrato de agendamento; frequência + profissional compatível obrigatórios só para ativação).

**Pendências de definição herdadas dos docs (respeitadas — não implementadas por inferência)**:
1. Doc-mãe §11 "Escala e agendamento": horários de disponibilidade, **regras de conflito de agenda**, **regra de organização por região**, duração padrão, diferença escala×agendamento — **não definidos**; código manteve disponibilidade/região **informativas** conforme decisão de domínio (D-ESC-3);
2. "Como substituições serão tratadas" (doc-mãe §11) — **resolvido** pela RN-ESC-13 (`ScaleSubstitution` com snapshot de nomes), doc não atualizado;
3. Datas/horários/conflitos: **fora do escopo** corretamente (RN-ESC-22); contrato `scheduling_requirement` prepara o Agendamento (D-ESC-4);
4. **Status do plano** para criar/ativar escala e **exclusão de escala ativa**: decisões consolidadas em 22/11/2026 — exigir plano Ativo e bloquear exclusão de escala Ativa; encerrá-la ou suspendê-la antes. Essas regras já foram implementadas e testadas (Etapa 1);
5. Regras de escala × agendamento/visita/atendimento/evolução: fora do escopo, respeitado (nenhuma regra antecipada no app).

**Pendências novas desta auditoria**: ver §9 (D-ESC-1…D-ESC-7).

### 8. Problemas encontrados

| # | Problema | Tipo | Evidência |
|---|---|---|---|
| P-ESC-1 | **Rota órfã**: `/pacientes/:patientId/escalas` existe mas **nenhum lugar do app linka para ela** — `PatientDetail` não tem atalho de escala; entrada só pelo menu/card globais (que listam todas as escalas visíveis) | Funcionalidade incompleta (navegação) | `App.tsx:57` × grep `/escalas` em `src/` sem ocorrência de link com `patientId` × `PatientDetail.tsx` sem "escala" |
| P-ESC-2 | **Doc-mãe §10/§11/§15 desatualizado**: escala implementada (6 models, app completo) mas §15 não lista entidades, §10 diz "será detalhada", §11 mantém pendência já resolvida (substituições) | Divergência doc×código (doc stale) | `Processos e Modelo de Dados.md:856-866,896-903,1084-1100` × `care_scales/models.py` |
| P-ESC-3 | **`tasks_escala.md` 100% desmarcado** (35 itens) embora a escala esteja implementada e testada — docs de tasks sem status confiável (mesma constatação do inventário §8.4/§9) | Divergência doc×código (doc stale) | `docs/tasks/tasks_escala.md` (todos `- [ ]`) × §4/§5 desta seção |
| P-ESC-4 | **Escalas podem ser criadas e ativadas sobre planos em qualquer status** (Rascunho/Encerrado) — `plan_options` não filtra status; docs não definem se exige plano Ativo | Regra ausente/caso-limite (não diverge da RN) → D-ESC-1 | `views.py:140-146` (todos os `CarePlan`) × `services.py:226-242` (sem checagem de `plan.status`) |
| P-ESC-5 | **Exclusão (lógica) de escala em qualquer status**, inclusive Ativa/Encerrada, sem restrição — RN-ESC-25 diz que a encerrada "permanece para consulta", mas o DELETE a remove da listagem (404); docs não definem restrição | Regra ausente/caso-limite → D-ESC-2 | `services.py:66-73` (sem checagem de status) × `CareScaleDetail.tsx:65` (botão só por permissão) |
| P-ESC-6 | **`configure_need` exige frequência positiva mesmo quando só observação/motivo mudam**: item incluído sem frequência (plano sem frequência) não permite salvar observação isolada — erro `frequency_quantity` inesperado | Regra ausente/validação pontual → D-ESC-5 | `services.py:195-200` (valida `quantity`/`period` mesclados sempre) × `serializers.py:20-30` (campos opcionais) |
| P-ESC-7 | **`canScale()` (frontend) não considera `is_superuser`**, que o backend aceita (`permissions.py:11`) — superusuário sem grupo GERENTE/permissão veria os controles ocultos embora a API aceitasse (impacto baixo: `createsuperuser` assume categoria Gerente) | Divergência frontend×backend (menor) | `careScales.ts:7-9` × `permissions.py:8-12` |
| P-ESC-8 | **Histórico exibe códigos de ação crus** (`ADD_NEED`, `SUBSTITUTE`, `CONFIGURE_NEED`) sem tradução e **não usa `previous_data`/`new_data`**, que o backend já serializa — a UI mostra só ação/autor/data | Funcionalidade incompleta (exibição) | `CareScaleDetail.tsx:93` × `serializers.py:90-93` (`previous_data`, `new_data`) |
| P-ESC-9 | Validação por execução pendente: suíte backend, testes frontend e e2e sem execução; Playwright sem dependência e Chrome fixo em caminho Linux | **Concluída nas Etapas 5 e 6** — 83 backend + 3 unitários frontend + build + e2e aprovados; script reproduzível e Chromium configurável | `care_scales/tests*.py`, `tests/careScales*.mjs`, `package.json` |
| P-ESC-10 | Sem cobertura frontend das telas de escala | **Concluída na Etapa 6** — fluxo Playwright cobre listagem/criação, detalhe/edição, necessidades, profissionais, status, histórico e permissões | `tests/careScales.browser.mjs` |
| P-ESC-11 | **Seed `escalas.*` só para a categoria Gerente**: médico/enfermeiro **não visualizam escalas por padrão** (RN-ESC-03 só inclui Gerente, profissionais escalados e "usuários com permissão") — qualquer outro perfil depende de concessão manual na tela de Categorias, do processo **Usuários ainda não auditado** | Dependência (a validar) | `accounts/0011:12-13` × teste `test_distinct_permissions_seeded_only_for_manager` |
| P-ESC-12 | **`GET .../planos/` expõe todos os planos de todos os pacientes** (nome do paciente + necessidades), sem filtro de status, paciente ou permissão de leitura de planos — requer apenas `escalas.create\|update` | Observação de escopo (aceitável hoje; definir) → D-ESC-6 | `views.py:140-146` × `permissions.py:49-50` |

**Não são problemas (confirmados corretos)**: gating frontend×backend espelha o seed (`canScale` × `has_scale_permission` × `accounts/0011`, sem OR problemático do PA-1 nem grupos clínicos presumidos do PA-2/PN-3); menu próprio com estado de permissão (resolve PA-14/PC-9); paginação com `next` do DRF (resolve PA-11); nenhuma página chamando endpoint inexistente (contrastando com o PN-1 de `/tipos`); **dupla barreira** da RN-ESC-24 (origem + ativação) com teste; auditoria transacional com rollback junto da operação e sem log de operação idempotente; substituições preservando nomes até após exclusão do usuário; exclusão lógica preservando auditoria e vínculos; princípio de não antecipação **integralmente respeitado** (sem horários, duração, conflitos, agendamento, visita ou evolução; `planning.py` explicitamente informativo); criação com períodos validados três vezes (create/update/ativação); erro de ação/permissão desconhecida negado por default.

### 9. Decisões pendentes

Decisões consolidadas pelo usuário em 22/11/2026:
- D-ESC-1: exigir Plano de Cuidados Ativo para criação/ativação.
- D-ESC-2: bloquear exclusão de escala Ativa; encerrar/suspender antes.
- D-ESC-3: disponibilidade e região permanecem informativas.
- D-ESC-4: integração com Agendamento aguarda a existência do processo consumidor.
- D-ESC-5: permitir observação sem frequência.
- D-ESC-6: catálogo mantém todos os planos, conforme comportamento atual.
- D-ESC-7: manter `ProfessionalPlanningInfo` dentro da Escala.

Novas para decisão humana (além das pendências do doc-mãe §11, das D1–D4/DA-1–DA-6/DN-1–DN-5/DPC-1–DPC-7 e da memória §8):
- **D-ESC-1**: **status do Plano × criação/ativação de escala** — permitir escala sobre plano Rascunho/Encerrado (comportamento atual, P-ESC-4) ou exigir plano Ativo? Doc não define — **não implementar sem definição**.
- **D-ESC-2**: **exclusão de escala Ativa/Encerrada** — manter livre (comportamento atual, P-ESC-5) ou restringir (ex.: exigir encerrar antes)? Interage com RN-ESC-25 ("permanece para consulta").
- **D-ESC-3**: **disponibilidade/região** — manter informativas (decisão de domínio registrada + RN-ESC-21) ou virar validação/bloqueio (doc-mãe §11 ainda lista "regra de organização por região" como pendente)?
- **D-ESC-4**: **integração do contrato `scheduling_requirement` com o Agendamento** — quando/onde o módulo futuro consumirá o bloqueio de escala não ativa (RN-ESC-25/RF-ESC-22 só se efetivam aí); definir se o RF pode ser dado como concluído nessa etapa ou fica aguardando o Agendamento.
- **D-ESC-5**: **frequência obrigatória × observação isolada** — permitir salvar só observação/motivo em item sem frequência (P-ESC-6) ou exigir frequência sempre (ajustando a RN/UI)?
- **D-ESC-6**: **escopo do catálogo `planos`** — listar todos os planos (atual), filtrar por status, ou exigir também permissão de leitura de planos (P-ESC-12)?
- **D-ESC-7**: **destino do `ProfessionalPlanningInfo`** — manter como cadastro de apoio dentro da escala (hoje, editável pela UI de necessidade) ou migrá-lo para o futuro módulo oficial de Profissionais?
- *Documental (não bloqueante)*: atualizar doc-mãe §10/§11/§15 e `tasks_escala.md` (P-ESC-2/P-ESC-3).

### 10. Dependências com outros processos

- **Plano de Cuidados** (processo anterior): `CareScale.care_plan` e `ScaleNeed.plan_need` FKs **PROTECT**; necessidade deve ser **vigente do mesmo plano** (`services.py:81-85`); **remoção do plano bloqueada** enquanto a necessidade estiver na escala (`care_plans/services.py:114-116`, 400); profissão de referência copiada de `CarePlanNeed.required_professional` — **sem profissão de referência não é possível vincular profissional nem ativar** (decisão de domínio; `assign` exige `required_profession_id`). **Dependência satisfeita** (vista do lado do Processo 4: PC-11/§10). Ressalva: escala sobre plano **Rascunho/Encerrado** é possível (D-ESC-1).
- **Cadastro do paciente**: `CareScale.patient` FK PROTECT; **sem atalho do `PatientDetail`** para escalas (P-ESC-1) — entrada só pelo menu.
- **Usuários/Categorias/Profissionais** (`accounts`/`professionals`): permissões `escalas.*` concedidas por categoria (só Gerente no seed → P-ESC-11, depende do processo **Usuários**); `ScaleAssignment` aponta para o **stub** `Professional` (1:1 com `User` nullable — pool de profissionais sem acesso); escopo de visualização depende de `Professional.user` preenchido e `is_active`. **Dependência estrutural do módulo oficial de Profissionais** (mesma natureza dos processos 1–4).
- **Avaliação inicial / Necessidades**: indiretas — a escala só toca necessidades via vínculo do plano (`plan_need`), nunca `CareNeed` diretamente; observação da RN-NEC/PA-5: excluir necessidade vinculada a plano/escala continua com `ProtectedError` **500** no processo 3 (PC-11/PA-5/PN-4 herdados — permanece).
- **Agendamento/visita/atendimento/evolução**: sem código (correto); `care_scales.contracts.scheduling_requirement` **pronto e testado, sem consumidor** (P-ESC-9/RN-ESC-25 PARCIAL, D-ESC-4); datas/horários corretamente fora da escala (RN-ESC-22).
- **Auditoria de sistema**: `ScaleAuditEvent` cumpre RN-ESC-27 com `actor_name` denormalizado e snapshot antes/depois (padrão `care_plans`/`patients`); admin somente leitura.

### 11. Tasks recomendadas

Novas tasks sugeridas para backlog (não implementadas nesta auditoria; prefixo `TASK-ESC-*` é **interno desta auditoria** — o doc de tasks não tem IDs formais):

1. **TASK-ESC-001 — Atualizar `tasks_escala.md` ao estado real** (P-ESC-3): **concluída na Etapa 3**, com estados e pendências alinhados à implementação e às decisões consolidadas.
2. **TASK-ESC-002 — Atualizar o doc-mãe §10/§11/§15 com a escala implementada** (P-ESC-2): **concluída na Etapa 3**, incluindo entidades, escopo e decisões de domínio.
3. **TASK-ESC-003 — Criar atalho de escalas no detalhe do paciente** (P-ESC-1): link "Escalas" no `PatientDetail` para a rota já existente `/pacientes/:patientId/escalas` (gating `canScale('view')`, mesmo padrão do atalho de planos).
4. **TASK-ESC-004 — Definir e implementar a regra de status do plano para escala** (P-ESC-4/D-ESC-1): **concluída na Etapa 1**; plano Ativo exigido, com testes.
5. **TASK-ESC-005 — Definir restrição de exclusão de escala** (P-ESC-5/D-ESC-2): **concluída na Etapa 1**; exclusão de escala Ativa bloqueada, com testes.
6. **TASK-ESC-006 — Permitir observação/motivo sem frequência** (P-ESC-6/D-ESC-5): **concluída na Etapa 4**; `configure_need` salva observação/motivo com frequência e período ausentes, exige quantidade e período em conjunto quando configurados e mantém a frequência obrigatória para ativação. Cobertura em `tests_frequency_configuration.py` (4 testes direcionados aprovados).
7. **TASK-ESC-007 — Traduzir e enriquecer a exibição do histórico** (P-ESC-8): **concluída na Etapa 2**, com rótulos e snapshots anteriores/novos.
8. **TASK-ESC-008 — Executar a suíte backend de `care_scales`** (P-ESC-9): **concluída na Etapa 5**; `python manage.py test care_scales accounts --noinput` — **83 testes aprovados**, sem erros e sem avisos no system check. Fixtures do teste de auditoria e do seed demonstrativo foram alinhadas às regras consolidadas.
9. **TASK-ESC-009 — Formalizar os testes frontend de escala** (P-ESC-9/P-ESC-10): **concluída na Etapa 6**; Playwright declarado em `devDependencies`, scripts `test:care-scales*`, preview iniciado pelo próprio roteiro, Chromium padrão ou `CHROMIUM_PATH`, fluxo das telas validado.
10. **TASK-ESC-010 — Alinhar `canScale` ao backend para superusuário** (P-ESC-7): **concluída na Etapa 2**, incluindo cobertura da lib.
11. **TASK-ESC-011 — Formalizar disponibilidade/região e a integração com o Agendamento** (D-ESC-3/D-ESC-4): **concluída na Etapa 3** na documentação; implementação do consumidor fica pendente até existir o processo Agendamento.

---

**Próximo processo a ser analisado** (registrado em `00_AUDITORIA_MEMORIA.md`): **Usuários**. Concluídos nesta etapa: Cadastro do Paciente, Avaliação Inicial, Necessidades Identificadas, Plano de Cuidados, Escala (5 de 8).
