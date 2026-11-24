## Processo 4 — **Plano de Cuidados** (auditado em 18/11/2026)

### Atualização de decisões e implementação — 22/11/2026

As decisões anteriormente listadas como DPC-1…DPC-7 foram consolidadas com o usuário e substituem os apontamentos históricos abaixo: (1) plano ativo obrigatório antes da criação de escala; (2) ativação pelo Médico é a aprovação; (3) planos encerrados permanecem editáveis; (4) não se remove a última necessidade vigente; (5) datas não têm validação de ordem e encerramento pode ser antecipado; (6) profissional necessário deve estar ativo; (7) Médico e Enfermeiro podem vincular/configurar/remover necessidades. O documento-mãe §7/§15 foi atualizado.

O catálogo de recursos **já estava disponível** na API `/api/recursos/` e na interface `/recursos`, com manutenção pelo gerente (`avaliacoes.manage_resources`); a cobertura existente foi confirmada, sem necessidade de reconstruir esse módulo. A regra de plano ativo antes da escala foi implementada no serviço de criação da escala. As demais regras foram implementadas na Etapa 1.

**Etapa 1 concluída em 22/11/2026 — regras de domínio e permissões:** criada a permissão granular `planos_cuidados.manage_needs` para Médico e Enfermeiro; os serviços e a interface permitem a esses perfis gerir vínculos, preservando edição geral do plano só para Médico; remoção da última necessidade bloqueada no backend e na tela; profissional necessário limitado a ativo no serializer e catálogo; criação de escala exige plano ativo. Planos encerrados continuam editáveis e datas seguem sem validação de ordem, conforme decisões. Validação: `care_plans` 61/61 testes; `care_scales` 38/38; frontend `carePlans.test.mjs` 4/4 e `npm run build` aprovado.

**Etapa 2 concluída em 22/11/2026 — transparência e integração:** detalhe do plano agora exibe datas e nomes dos autores; histórico apresenta nome do autor, tipo de evento e snapshots expansíveis; exclusão física de necessidade protegida retorna HTTP 400 com mensagem clara (comportamento existente confirmado por teste). Validação: `care_plans` + `assessments` — 159 testes aprovados; `npm run build` aprovado.

**Etapa 3 concluída em 22/11/2026 — fechamento da auditoria:** comentário obsoleto no admin substituído por descrição do fluxo atual; referências remanescentes a pendências resolvidas foram ajustadas. Não há tarefa de implementação restante deste processo nesta auditoria. PC-9 (atalho de navegação sem item de menu próprio) permanece observação de UX, sem violar requisito. Validação documental: busca por estados/pendências e revisão cruzada das decisões, regras e dependências; nenhum código funcional alterado nesta etapa.

**Matriz atualizada (substitui os status históricos abaixo):** PC-1 e RF05 concluídos com datas/autores renderizados; PC-2 concluído com autor legível, tipo e dados do evento no histórico; PC-3/PC-4/PC-5/PC-6 concluídos pelas decisões consolidadas e implementação da Etapa 1; PC-8 concluído pela atualização do documento-mãe §7/§15; PC-11 concluído, `CareNeedViewSet.destroy` captura `ProtectedError` e o teste `test_delete_is_blocked_when_plan_linked_or_history_exists` valida HTTP 400 e preservação do registro. O catálogo de recursos já existente foi confirmado na Etapa 1. PC-7 validado: Etapa 1 rodou care_plans 61/61, care_scales 38/38, frontend 4/4/build; Etapa 2 rodou care_plans + assessments 159/159 e novo build aprovado.

**Evidências da Etapa 2:** `PlanSerializer` expõe `created_by_name`/`updated_by_name`; `PlanHistory` UI usa `actor_name`, `event_type`, `previous_data` e `new_data`. Testes adicionados para o contrato HTTP de autores e histórico. A exclusão protegida é exercida pelo teste de API de necessidades. A seção §2 e as tabelas seguintes preservam o retrato histórico da auditoria original; em caso de divergência de status, prevalece esta matriz atualizada e as decisões/implementações descritas neste adendo.

- `RN`: `docs/regras-de-negocio/regras_negocio_plano_cuidados.md` — **sem IDs formais**; a auditoria usa a convenção **`RN-PLC §n` = seção `## n.`** do documento (§1…§10) — declaração da convenção interna (memória §8.3, decisão pendente D3; mesmo critério do `RN-NEC §n`)
- `RF`: `docs/requisitos-do-sistema/requisitos_funcionais_plano_cuidados.md` (RF01…RF14 — numerados no doc, sem prefixo `-PLC`)
- `TASK`: `docs/tasks/tasks_plano_cuidados.md` (25 tasks em 7 seções, **sem IDs formais e sem checkboxes**; notas de implementação embutidas apenas em TASK 01/02/03) — checkbox não é evidência (inventário §8.4; aqui nem existe)
- Documento-mãe: `docs/Processos e Modelo de Dados.md` §7 (Processo 4), §8, §9.2, §9.4, §10, §11 (bloco "Plano de cuidados"), §12 (decomposição exemplo), §14, §15
- Decisões complementares: `docs/tasks/execucao_tasks_rubens.md` (§"Contrato implementado do plano" — contrato API, matriz de permissões, validação declarada de 235/246 testes), `docs/tasks/execucao_tasks_a_fazer.md` §"Decisões de domínio" (escala × plano: profissão compatível copiada do profissional necessário; remoção explícita da escala antes do plano), `tasks_plano_cuidados.md` TASK 01 (prioridade das regras do Plano sobre o modelo geral do doc-mãe: **sem status Suspenso, sem vínculo obrigatório com avaliação**), `AGENTS.md` (sem seção específica deste processo)
- Rastreio Jira `TA-96…111` / PRs `#22–#36`: citado nos docs de execução (TA-96 "já em main"; PRs descritas como **sem merge**); código **presente no repositório local** — status externo não verificado (fonte externa = decisão pendente D2 da memória)

---

### 1. Resumo do processo

Organiza **como** as Necessidades Identificadas do paciente serão atendidas — responde *"Como a empresa vai atender as necessidades identificadas?"* (doc-mãe §7.1). Define, por necessidade, o profissional necessário, a frequência e os recursos; e o período de validade/objetivo do acompanhamento. É a **ponte entre as Necessidades e a Escala/Agendamento** (doc-mãe §8; §9.4: profissional necessário ≠ profissional escalado).

Fluxo: paciente com ≥1 necessidade identificada → **Médico** cria o plano (status inicial Rascunho) → vincula necessidades → configura profissional/frequência/recursos por vínculo → ativa (Médico) → acompanha → encerra/reativa (Médico ou Enfermeiro) → histórico preservado → **entrada da escala**.

**Entradas**: paciente existente, necessidades com status `Identificada` ativas, profissionais cadastrados (`Professional`), recursos cadastrados (`Resource`), data de início. **Saída**: `CarePlan` (Rascunho/Ativo/Encerrado) com vínculos configurados (`CarePlanNeed` + recursos) e `CarePlanHistory` → consumido por `care_scales` (`CareScale.care_plan`, `ScaleNeed.plan_need`).

Escopo **não** deste processo (corretamente não antecipado): escala, agendamento, visita, atendimento, evolução, estoque/farmácia/logística (RN-PLC §10; tasks §7).

### 2. Status geral

**PARCIAL — processo mais alinhado dos quatro auditados: backend aderente em praticamente todas as RNs/RFs e fluxo frontend↔backend conectado e com gating consistente; pendências pontuais de exibição, casos-limite não definidos na documentação e validação por execução.**

RN-PLC: **26 CONCLUÍDO, 1 PARCIAL (§4.1 — remoção da última necessidade vigente), 1 NÃO INICIADO (§3.1 — plano obrigatório após necessidades)**. RF01–RF14: **13 CONCLUÍDO, 1 PARCIAL (RF05 — informações de criação/atualização não exibidas na UI)**. Diferente dos processos 1–3, **não há página quebrada nem gating frontend×backend divergente**: `canPlan()` replica exatamente a matriz do seed `accounts/0010` + grupos, a rota tem gate próprio de página (mensagem de permissão em vez de 404/403 genérico) e a paginação usa `next` do DRF. Ressalvas: (a) a **UI do detalhe não exibe criação/atualização** (RF05) e mostra o **autor do histórico como `Usuário #id`** embora `actor_name` seja serializado; (b) **casos-limite não definidos nos docs** e permitidos pelo código — editar/vincular em plano **encerrado**, remover a **última** necessidade de um plano ativo, `end_date < start_date`, profissional **inativo**; (c) o **doc-mãe §7 está desatualizado** face ao modelo implementado (decisão registrada nas tasks, doc não atualizado); (d) **56 testes backend + 3 frontend existem mas não foram executados** (`A VALIDAR`) e as afirmações de 235/246/279/290 verdes são documentadas, não verificadas.

### 3. Requisitos e status de implementação

#### 3.1 Regras de negócio (RN-PLC — seções do doc, sem IDs formais)

| ID | Regra | Status | Evidência / motivo |
|---|---|---|---|
| §2.1 | Somente Médico cria | **CONCLUÍDO** | `permissions.py:19` (`create` → `IsMedico`) + `require_role(actor,'MEDICO')` (`services.py:180`) + seed `accounts/0010:10`; teste `test_required_fields_and_profiles` |
| §2.2 | Somente Médico edita | **CONCLUÍDO** | `update/vincular/configurar/remover` → `IsMedico` (`permissions.py:20-24`) + `require_role` nos serviços; RN não especifica perfis das ações aninhadas — código adota Médico (coerente com "editar"; ver DPC-6) |
| §2.3 | Visualização: Médico, Enfermeiro, Gerente | **CONCLUÍDO** | `list/retrieve/historico/…` → `IsGerente \| IsClinicalStaff` (`permissions.py:12-17`) + `planos_cuidados.view` (seed → 3 categorias); testes `test_every_profile_read_and_forbidden_writes…` |
| §2.4 | Plano vinculado a um paciente | **CONCLUÍDO** | `CarePlan.patient` FK `PROTECT` (`models.py:26`); `PlanCreateSerializer.patient` obrigatório |
| §3.1 | Plano **obrigatório** após identificação das necessidades | **NÃO INICIADO** | Nenhum ponto do sistema exige/verifica que paciente com necessidade tenha plano (nada alerta/bloqueia); única materialização indireta: escala exige `CarePlan` FK. Ponto de aplicação indefinido → DPC-1 (sem regra antecipada) |
| §3.2 | Criação exige ≥1 Necessidade Identificada | **CONCLUÍDO** | `create_plan` acumula erro `needs` (`services.py:187-190`) + `allow_empty=False` (`serializers.py:62`) + cada need precisa `is_active` e `status='IDENTIFIED'` do paciente (`services.py:194-196`); catálogo do form filtra idem (`views.py:130`); teste `test_rejects_duplicate_inactive_and_wrong_patient_needs` |
| §3.3 | Só **um plano ativo** por paciente | **CONCLUÍDO** | `UniqueConstraint` parcial `unique_active_plan_patient` (`models.py:42-43`, migration `care_plans/0005`) + `clean()` (`models.py:53-56`); testes `test_only_one_active_but_many_draft_and_closed_plans`, `test_activation_conflict…` |
| §3.4 | Planos anteriores preservados no histórico | **CONCLUÍDO** | Sem `DELETE` em `CarePlanViewSet` (`http_method_names`, `views.py:36`); listagem retorna todos os status |
| §4.1 | Plano relacionado a **uma ou mais** necessidades | **PARCIAL** | Criação e **ativação** exigem ≥1 (`services.py:187,84-85`), **porém a remoção da última necessidade vigente é permitida** em qualquer status → plano ativo pode ficar sem vínculos atuais (`services.py:104-125` sem checagem de mínimo; sem teste) → PC-3/DPC-4 |
| §4.2 | Mesma necessidade em diferentes planos ao longo do tempo | **CONCLUÍDO** | Remoção é lógica (`removed_at`) e nova associação cria novo registro; unicidade só para vínculos não removidos (`models.py:98-99`); teste `test_removal_preserves_record_and_allows_new_link` |
| §4.3 | Apenas **um plano ativo** por necessidade | **CONCLUÍDO** | `CarePlan.clean` + `CarePlanNeed.clean` (`models.py:57-62,118-122`) + `validate_need` nos serviços (com `select_for_update`/lock, `services.py:51-53`); testes `test_only_one_active_plan_per_need`, `tests_http_exclusivity`. Ressalva: **sem constraint de banco** neste caso (diferente do §3.3) — garantia em model/serviço |
| §4.4 | Remoção do plano não exclui nem inativa a necessidade | **CONCLUÍDO** | `remove_need` só grava `removed_at/ motivo/ autor` no vínculo (`services.py:117-121`); `CareNeed` intocado; teste `test_remove_with_reason_preserves_need_link…` |
| §4.5 | Remoção preserva o histórico | **CONCLUÍDO** | `record(...,'REMOVE_NEED')` com snapshot antes/depois (`services.py:124`); `CarePlanNeed` permanece no banco |
| §4.6 | Motivo da remoção obrigatório | **CONCLUÍDO** | `RemovalSerializer` `allow_blank=False` (`serializers.py:81-82`) + `remove_need` rejeita vazio (`services.py:107-109`) + constraint `care_plan_need_removal_metadata`/`clean()` (`models.py:100-111`); UI exige (`PlanNeedRemoval.tsx:12`); teste `test_required_reason_and_snapshot…` |
| §4.7 | Encerramento mantém necessidades ativas (não exclui/inativa) | **CONCLUÍDO** | `close_plan` altera só `plan.status` (`services.py:99-101`); teste `test_doctor_and_nurse_close_preserving_dates_needs_and_links` |
| §4.8 | Necessidade ativa pode ir a outro plano respeitando exclusividade | **CONCLUÍDO** | `validate_need` só bloqueia se houver outro **ativo**; após encerrar, reuso liberado (testes `test_closed_plan_allows_reuse…`, `tests_http_exclusivity`) |
| §5.1 | Profissional necessário = **profissional específico já cadastrado** | **CONCLUÍDO** | `required_professional` FK → `professionals.Professional` (`models.py:77-78`); `NeedConfigurationSerializer` exige PK existente (rejeita dict/None/inexistente — `serializers.py:16`, teste `test_only_existing_specific_professional_and_not_user_or_profession`); UI lista profissionais. Ressalva: aceita profissional **inativo** (PC-6/DPC-5; RN não restringe) |
| §5.2 | Frequência = quantidade + período (Dia/Semana/Mês) | **CONCLUÍDO** | `frequency_quantity` ≥1 + `FrequencyPeriod` choices (`models.py:79-81,19-22`) com constraints de banco (`models.py:93-97`); serializer `min_value=1`/`ChoiceField` (`serializers.py:17-18`); ativação exige os dois (`services.py:88-89`); testes `tests_configuration.py` |
| §5.3 | Recursos opcionais, do cadastro, com recurso+quantidade+observação | **CONCLUÍDO** | `CarePlanNeedResource` (0..N por vínculo, `resource` FK PROTECT, `quantity`>1 constraint, `models.py:152-171`); `resources` `required=False` no serializer (`serializers.py:19`); catálogo `GET .../recursos/` (`views.py:124-126`); testes `tests_resources.py` |
| §6 | Descrição/objetivo geral **opcional** | **CONCLUÍDO** | `objective` `blank=True` (`models.py:31`), `required=False` no create/update (`serializers.py:61,68`) |
| §7 | Status: Rascunho, Ativo, Encerrado (**3 valores**) | **CONCLUÍDO** | `CarePlanStatus` (`models.py:13-16`) + `CheckConstraint care_plan_valid_status` (`models.py:44-46`); default `DRAFT`; **sem Suspenso** — decisão registrada em `tasks_plano_cuidados.md` TASK 01 (RN/tasks prevalecem sobre doc-mãe §7.3; PC-8) |
| §7.1a | Rascunho → Ativo: **somente Médico** | **CONCLUÍDO** | `ativar` exige status `DRAFT` (`views.py:96-105`) + `permissions.py:25` (`activate` → `IsMedico`, seed só Médico) + `require_role('MEDICO')` na transição (`services.py:74`); teste `test_manager_and_nurse_cannot_activate_draft` |
| §7.1b | Ativo → Encerrado e Encerrado → Ativo: **Médico ou Enfermeiro** | **CONCLUÍDO** | `permissions.py:26-27` (`close`/`reativar` → `IsClinicalStaff`, seed → Médico+Enfermeiro) + papéis em `services.py:75-76`; transição inválida → 400; testes `tests_closing.py`, `tests_status.py` |
| §7.1c | Reativação usa o **mesmo registro**; histórico de status preservado | **CONCLUÍDO** | Nenhuma criação de registro nas transições; `record(...,'STATUS')` com snapshot (`services.py:90-95`); teste `test_cycle_same_record_and_history_authorized_roles` |
| §8 | Datas: início obrigatório; encerramento opcional (podendo antecipado); `created_at`/`updated_at` automáticos | **CONCLUÍDO** | `start_date` sem blank (`models.py:28`), `end_date` null/blank com comentário (`models.py:29-30`), `auto_now_add/auto_now` (`models.py:36-37`); erros acumulados (`services.py:183-190`); teste `test_end_date_can_be_provided_in_advance_without_closing` |
| §8 | Criado por / Atualizado por | **CONCLUÍDO** | `created_by`/`updated_by` SET_NULL (`models.py:32-35`), preenchidos em criação (`services.py:198`) e em toda operação (`services.py:64,92,122,137,172`); expostos no serializer (`serializers.py:52-53`) — **mas não exibidos na UI** (PC-1) |
| §9 | Histórico: status, remoções, motivo e alterações no registro | **CONCLUÍDO** | `record()` com `event_type` (`CREATE/UPDATE/STATUS/ADD_NEED/CONFIGURE_NEED/REMOVE_NEED`) e `previous_data`/`new_data` (`services.py:15-38`); endpoint `GET <id>/historico/` (`views.py:116-118`); testes `tests_history.py`. Ressalva: UI exibe só `description` + `Usuário #id` (PC-2) |
| §10 | Fora do escopo: escala/agendamento/visita/atendimento/evolução | **CONCLUÍDO** | Nenhuma regra desses processos no app; apenas leitura do requisito via `contracts.planned_requirement` (`contracts.py:5-16`, "sem atribuir execução") + teste `tests_contracts.py`; decisão de domínio da escala (profissão compatível/remoção explícita) registrada em `execucao_tasks_a_fazer.md` |

**Tally RN**: 28 itens → **26 CONCLUÍDO, 1 PARCIAL (§4.1), 1 NÃO INICIADO (§3.1)**. **Nenhuma DIVERGENTE** entre RN-PLC e o código (divergências existentes são do **doc-mãe §7** — ver §6/PC-8).

#### 3.2 Requisitos funcionais (RF01…RF14)

| ID | Requisito | Status | Observação |
|---|---|---|---|
| RF01 | Criar plano (Médico; ≥1 necessidade identificada; início obrigatório; descrição/encerramento opcionais; status inicial Rascunho) | **CONCLUÍDO** | `POST /api/planos-cuidados/` + form `CarePlans.tsx:64-74` (required no início, opcionais marcados, seleção múltipla de necessidades; botão desabilitado sem necessidades) |
| RF02 | Vincular necessidades (1+, existentes, vínculos ao longo do tempo, não 2 ativos) | **CONCLUÍDO** | `POST <id>/necessidades/` (`views.py:75-80`, `attach_need` valida paciente/ativo/IDENTIFIED/exclusividade); UI "Vincular necessidade" (`CarePlanDetail.tsx:94-95`) com catálogo já filtrando as já vinculadas (`:54`) |
| RF03 | Configurar por vínculo: profissional específico, quantidade+período (3), 0..N recursos (recurso+qtd+obs) | **CONCLUÍDO** | `POST <id>/necessidades/<link>/configurar/` (`views.py:82-87`); form `PlanNeedConfiguration.tsx` com validação client-side (`:28-30`) espelhando o backend; "Lista vazia limpa, ausência preserva" conforme contrato (`execucao_tasks_rubens.md:37`; `services.py:168-171`) |
| RF04 | Editar plano (Médico); atualiza `updated_at`/`updated_by` | **CONCLUÍDO** | `update_plan` restringe a `start_date/end_date/objective` (`services.py:131-132`, `serializers.py:70-74`) e grava autor (`:137`); botão "Editar plano" só `canPlan('update')` (`CarePlanDetail.tsx:91`) |
| RF05 | Visualizar (3 perfis) com a lista mínima de dados | **PARCIAL** | Paciente/status/datas/objetivo/necessidades/profissional/frequência/recursos ✓ (`CarePlanDetail.tsx:97-100`); **"informações de criação e atualização" não são exibidas** — `PlanSerializer` as traz (`serializers.py:52-53`) mas a UI não renderiza `created_at/updated_at/created_by/updated_by` (PC-1) |
| RF06 | Alterar status conforme permissões (3 transições) | **CONCLUÍDO** | Backend: `ativar/encerrar/reativar` + matriz; frontend: `allowedStatusActions()` replica perfil×estado (`carePlans.ts:48-53`), botões desabilitados durante operações (`CarePlanDetail.tsx:83`) |
| RF07 | Encerrar (Médico/Enfermeiro); necessidades permanecem ativas | **CONCLUÍDO** | `encerrar` → `IsClinicalStaff`+`close`; só a partir de `ACTIVE` (transição inválida → 400); confirmação na UI menciona preservação (`CarePlanDetail.tsx:67`) |
| RF08 | Reativar (Médico/Enfermeiro); mesmo registro; histórico; 1 ativo/paciente; 1 ativo/necessidade | **CONCLUÍDO** | `reativar` exige `CLOSED` (`views.py:112-114`); `plan.full_clean()` na transição revalida as duas exclusividades (`services.py:93`, `models.py:51-62`); testes `tests_http_status.py`, `tests_http_exclusivity.py` |
| RF09 | Remover necessidade do plano (deixa o plano; permanece ativa; não exclui/inativa; motivo obrigatório; histórico) | **CONCLUÍDO** | `POST <id>/necessidades/<link>/remover/` (`views.py:89-94`); `PlanNeedRemoval.tsx` com motivo required + aviso "não exclui nem inativa" (`:19`); bloqueio se a necessidade estiver em escala (400, `services.py:114-116`, teste `care_scales/tests_plan_consistency.py`) |
| RF10 | Impedir criação sem necessidade identificada vinculada | **CONCLUÍDO** | Idem RF01/§3.2 |
| RF11 | Impedir 2 planos ativos por paciente | **CONCLUÍDO** | Constraint de banco (migration `0005`) + `clean()`; erro amigável via `execute()` (`views.py:25-26`) |
| RF12 | Impedir necessidade em 2 planos ativos | **CONCLUÍDO** | Model/serviço + locks (ver §3.1 §4.3); **sem constraint de banco** — ressalva registrada |
| RF13 | Registrar auditoria (criação/atualização/autores + histórico das alterações relevantes) | **CONCLUÍDO** | Campos automáticos + autores + `CarePlanHistory` transacional (todo `record()` é atômico com a operação — rollback se falhar, testes `test_creation_rolls_back_when_history_fails`, `test_configuration_rolls_back_if_history_fails`) |
| RF14 | Separar plano × escala/agendamento (profissional necessário ≠ escalado) | **CONCLUÍDO** | Modelo sem datas/horários/agendamento; `contracts.planned_requirement` só lê o requisito (`contracts.py`); teste `test_read_contract_keeps_planned_professional_distinct_from_future_assignment`; decisão da escala: "Mudanças no plano não sobrescrevem a escala" (`execucao_tasks_a_fazer.md:53`) |

**Tally RF**: 14 itens → **13 CONCLUÍDO, 1 PARCIAL (RF05)**.

#### 3.3 Tasks (25 em 7 seções; sem IDs formais, sem checkboxes)

Status por evidência de código. Notas de implementação embutidas citam **TA-96** (modelagem config — "já em main") e, nos docs de execução, **TA-97…111** (PRs #22–#36) — **status externo não verificado** (A VALIDAR).

| Seção | Tasks | Status |
|---|---|---|
| 1. Modelagem (01–04) | CarePlan/CarePlanHistory, CarePlanNeed, configuração (TA-96), recursos | **CONCLUÍDO** — todas implementadas com migrations `care_plans/0001…0006` |
| 2. Regras (05–12) | validação de criação, exclusividade por paciente/necessidade, profissional, frequência, status, remoção, encerramento | **CONCLUÍDO** (com a ressalva da §4.1/PC-3 na remoção) |
| 3. Backend (13–14) | endpoints completos + autorização | **CONCLUÍDO** — 11 rotas/actions + catálogos; matriz dupla (grupo + granular) |
| 4. Frontend (15–18) | tela, configuração, remoção com motivo, ações de status | **CONCLUÍDO** (ressalva: exibição de criação/atualização — RF05/PC-1) |
| 5. Auditoria (19) | histórico de criação/alterações/status/vínculos/remoções/motivos/autor/data | **CONCLUÍDO** (6 `event_type`s; exibição limitada — PC-2) |
| 6. Testes (20–24) | permissões, criação, exclusividade, remoção, ciclo de status | **A VALIDAR** — **56 métodos `test_*` em 17 arquivos** backend + **3 testes frontend** (`tests/carePlans.test.mjs`) existem e cobrem os itens; **não executados** nesta etapa |
| 7. Dependências/escopo (25) | preparar integração com escala/agendamento; não implementar escala/agendamento/visita/atendimento/evolução | **CONCLUÍDO** — `contracts.py` + limites respeitados; integração com escala já real (FKs PROTECT + bloqueio de remoção) |

### 4. Evidências do backend

- **App** `backend/sistema_home_care/care_plans/` — 4 entidades + 2 TextChoices:
  - `CarePlan` (`models.py:25-67`): `patient` PROTECT, `status` default `DRAFT` com `CheckConstraint`, `start_date` obrigatória, `end_date` opcional, `objective`, autores `created_by/updated_by` SET_NULL, timestamps; **`UniqueConstraint` parcial de 1 plano ativo por paciente**; `clean()` valida exclusividade por status; `save()` chama `clean()` sempre.
  - `CarePlanNeed` (`models.py:70-129`): vínculo `PROTECT` nos dois lados (plano e necessidade), `required_professional` PROTECT nullable, frequência nullable (dados legados) com constraints `>0`/período válido, **remoção lógica** (`removed_at/removed_by/removal_reason`) com constraint de metadados e `clean()` (motivo obrigatório, necessidade do mesmo paciente, exclusividade se o plano estiver ativo), unicidade `unique_current_plan_need` (par não removido).
  - `CarePlanHistory` (`models.py:132-149`): `care_plan` PROTECT, `changed_by` SET_NULL + `actor_name` denormalizado, `event_type`, `description`, `previous_data`/`new_data` JSON.
  - `CarePlanNeedResource` (`models.py:152-174`): `plan_need` PROTECT, `resource` PROTECT → `assessments.Resource`, `quantity` >1 (constraint), `observation`; gravação via configuração (substituição total do conjunto).
  - `CarePlanStatus` (3 valores) e `FrequencyPeriod` (DAY/WEEK/MONTH) — **sem Suspenso** (decisão TASK 01).
- **Migrations**: 6 (`care_plans/0001_initial` … `0006_careplanhistory_actor_name_and_more`; `0003` campos de frequência TA-96, `0004` recursos TA-97, `0005` unicidade do plano ativo TA-99) + seed **`accounts/0010_seed_care_plan_permissions`** (`view`→3 categorias, `create/update/activate`→Médico, `close/reactivate`→Médico+Enfermeiro). `makemigrations --check` declarado limpo nos docs (**não executado** → A VALIDAR).
- **Services** (`services.py`, 15 funções — padrão `care_plans` tem serviço dedicado, diferente de `patients`/`assessments`): transacionais com `select_for_update` (`lock_plan`), `require_role` (papéis), `snapshot`/`record` (histórico antes/depois), `validate_need`, `create_plan` (erros acumulados numa única 400), `attach_need`, `configure_need` (revalida o payload dentro da transação), `remove_need` (motivo + **bloqueio se vinculada a escala ativa**), `update_plan` (só 3 campos), `change_status`/`close_plan` (grafo de transições + configuração completa exigida na ativação).
- **Serializers** (7, `serializers.py`): `PlanSerializer` (leitura completa com `need_links` aninhados + `patient_name`), `PlanCreateSerializer`/`PlanUpdateSerializer` (update rejeita campos fora de início/encerramento/objetivo), `AttachNeedSerializer`, `NeedConfigurationSerializer` (profissional obrigatório — PK existente —, qtd ≥1, período no domínio, recursos opcionais), `RemovalSerializer` (motivo), `HistorySerializer` (inclui `actor_name`).
- **Views/endpoints** (`views.py`, router `urls.py` → `/api/planos-cuidados/`):
  - `GET /api/planos-cuidados/?patient=<id>&page=` — listagem 20/página (`PlanPagination`), **escopo por patient só quando o parâmetro é informado** (sem `?patient`, retorna todos — inofensivo hoje, os 3 perfis podem ver todos)
  - `POST /api/planos-cuidados/` — Médico + `planos_cuidados.create`
  - `GET/PUT/PATCH <id>/` — view 3 perfis; update só Médico + `update` (restrito a 3 campos)
  - `POST <id>/necessidades/`, `POST <id>/necessidades/<link>/configurar/`, `POST <id>/necessidades/<link>/remover/` — Médico (`vincular/configurar/remover`)
  - `POST <id>/ativar|encerrar|reativar/` — matriz por transição (ver §3.1); `GET <id>/historico/` — view
  - Catálogos: `GET <id>/profissionais/`, `GET <id>/recursos/` (view) e `GET <id>/necessidades-disponiveis/?patient=` (**só Médico** — `permissions.py:18`), coerente com o gating do frontend
  - `execute()` converte `ValidationError` do model → 400, `PermissionDenied` → 403, `IntegrityError` → 400 amigável (`views.py:18-26`) — **evita 500 de conflito de unicidade**
- **Permissões**: duas camadas — `plan_permissions()` (`permissions.py:31-36`) = `IsActiveUser` (bloqueia usuário inativo) + perfil do grupo + `RequirePermission('planos_cuidados.*')`; ação desconhecida → `DenyAction` (nega por default). Matriz idêntica ao seed `0010` e ao `canPlan()` do frontend.
- **Contratos/integração**: `contracts.planned_requirement(link)` (`contracts.py`) — leitura do requisito planejado para escala/agendamento, sem atribuir execução; `care_scales` importa `FrequencyPeriod`, `CarePlan`, `CarePlanNeed` (FKs `PROTECT`) e **exige remoção explícita da escala antes de remover do plano** (`services.py:114-116`).
- **Admin** (`admin.py`): `CarePlan`, `CarePlanHistory`, `CarePlanNeed` registrados **somente leitura** (`has_add/change/delete = False`); edição e auditoria ocorrem pelos serviços/endpoints clínicos.
- **Testes**: **56 métodos `test_*` em 17 arquivos** (`tests.py` 17, `tests_api` 5, `tests_services` 4, `tests_status` 4, `tests_permissions` 3, `tests_configuration` 3, `tests_removal` 2, `tests_closing` 2, `tests_exclusivity` 2, `tests_need_links` 3, `tests_resources` 2, `tests_history` 1, `tests_contracts` 1, `tests_http_*` 4, demais 1 cada) cobrindo modelo, ciclo de status, exclusividade (paciente e necessidade), remoção, configuração, recursos, histórico, autorização (grupo + granular + HTTP + anônimo/inativo), contratos e integração. **Não executados nesta etapa → A VALIDAR.** (Docs declaram 235/246/279/290 verdes — afirmação documentada, não verificada.)

### 5. Evidências do frontend

- **Páginas/componentes**: `pages/CarePlans.tsx` (78 l. — listagem por paciente + criação), `pages/CarePlanDetail.tsx` (110 l. — dados, edição, necessidades, ações de status, histórico), `components/PlanNeedConfiguration.tsx` (59 l.), `components/PlanNeedRemoval.tsx` (26 l.); lib `src/lib/carePlans.ts` (54 l. — espelha todos os endpoints + gating).
- **Rotas/guardas** (`App.tsx:54-55`): `/pacientes/:patientId/planos-cuidados` e `/planos-cuidados/:id` dentro do layout protegido (`ProtectedLayout` → `RequireAuth`); **gating fino dentro das páginas** com mensagem própria ("Você não tem permissão para visualizar planos", `CarePlans.tsx:58`, `CarePlanDetail.tsx:76`) — **não depende de 403 genérico** (diferente do PA-7 da Avaliação).
- **Controle de acesso**: `canPlan(user, action)` (`carePlans.ts:22-27`) = grupo correto **+** permissão granular, espelhando exatamente `accounts/0010`; `allowedStatusActions()` (`:48-53`) restringe botões por perfil×estado (Gerente vê sem ações; Enfermeiro só encerrar/reativar; Médico tudo) — **sem divergência frontend×backend** (contraste com PA-1/PA-2/PN-3).
- **Criação** (`CarePlans.tsx`): botão só para `canPlan('create')`; carrega necessidades via `necessidades-disponiveis` (endpoint só Médico — coerente); seleção múltipla com checkboxes; início `required`; encerramento/objetivo opcionais; aviso quando não há necessidade ativa; erros do backend exibidos.
- **Listagem**: nome do paciente, status, data de início, contagem de necessidades **vigentes** (`filter(!removed_at)`); paginação usa **`next` do DRF** (evita o problema PA-11); estados loading/erro/vazio.
- **Detalhe**: dados do plano + edição inline (3 campos) para Médico; necessidades vinculadas com prioridade, profissional, frequência, recursos e **vínculos removidos visíveis com data e motivo** (`CarePlanDetail.tsx:99`); ações por vínculo (Configurar/Remover) só `canPlan('update')` e desabilitadas entre operações; **ações de status com `window.confirm`** explicando o efeito; histórico sob demanda.
- **Configuração** (`PlanNeedConfiguration.tsx`): select de profissionais (marca `(inativo)`), quantidade `min=1`, período (3 opções), recursos 0..N com quantidade/observação; validação client-side espelhando o backend; mensagens quando não há profissional/recurso cadastrado.
- **Remoção** (`PlanNeedRemoval.tsx`): motivo obrigatório (required + checagem) e aviso textual de que a remoção **não exclui nem inativa** a necessidade (exigência do RF09/RN §4.4).
- **Integração com a API**: `lib/carePlans.ts` espelha as 11 rotas (`getPlan/listPlans/createPlan/updatePlan/attachPlanNeed/configurePlanNeed/removePlanNeed/changePlanStatus/planHistory/planProfessionals/planResources/availableNeeds`) com `apiJson` + `credentials:"include"` (refresh silencioso de `lib/api.ts`). **Fluxo conectado**: paciente → planos → novo plano → detalhe → vincular → configurar → ativar → editar → remover → encerrar/reativar → histórico.
- **Acesso/navegação**: **sem item de menu** para planos no `AppLayout` (grep sem ocorrência) — entrada apenas pelo atalho "Plano de cuidados" no `PatientDetail.tsx:208`, condicionado a `canPlan('view')` (observação PC-9, mesmo padrão do PA-14; não viola RN).
- **Validações client-side**: `required` do HTML, `min=1`/inteiros, trim do motivo, desabilitação de botões — backend rejeita o restante (erros exibidos por seção).
- **Testes**: `tests/carePlans.test.mjs` — **3 casos** (`node:test`): gating de acesso exige perfil mesmo com todas as permissões granulares; payload de criação (múltiplas necessidades + encerramento opcional); botões de status por perfil×estado. **Não executados → A VALIDAR**; cobrem só a lib (páginas/componentes sem teste — PC-7).

### 6. Entidades e relacionamentos

```
Patient ──FK PROTECT──► CarePlan                    (1:N; UniqueConstraint: 1 plano ACTIVE por paciente)
CarePlan ──1:N PROTECT──► CarePlanNeed              (remoção lógica removed_at/reason/by; unicidade do par não removido)
assessments.CareNeed ──FK PROTECT──► CarePlanNeed   (necessidade nunca é tocada pela remoção do vínculo)
professionals.Professional ──FK PROTECT──► CarePlanNeed.required_professional  (nullable p/ vínculos legados)
CarePlanNeed ──1:N PROTECT──► CarePlanNeedResource ──FK PROTECT──► assessments.Resource   (0..N recursos)
CarePlan ──1:N PROTECT──► CarePlanHistory           (changed_by SET_NULL + actor_name; previous/new_data JSON)
CarePlan.created_by/updated_by ──SET_NULL── accounts.User
CarePlan ◄──FK PROTECT── care_scales.CareScale      (escala exige plano)
CarePlanNeed ◄──FK PROTECT── care_scales.ScaleNeed  (necessidade precisa ser removida da escala antes do plano)
```

**Doc-mãe §7/§15 × código (divergências conhecidas — RN/tasks prevalecem, decisão em TASK 01)**: doc-mãe prevê `care_plans.assessment_id` (avaliação que originou), `responsible_professional_id`, `observations`, status **com Suspenso**, entidade `care_plan_items` com status próprio/nome/datas, `care_plan_professionals` com `professional_type`, `care_plan_resources` com `resource_type` e frequência; o código implementa **sem** vínculo obrigatório com avaliação, **sem** Suspenso, sem status por item, com profissional/frequência **dentro** do vínculo e recursos sem tipo/frequência — tudo coerente com `regras_negocio_plano_cuidados.md` e `tasks_plano_cuidados.md` (mais recentes). Nomes reais das tabelas: `care_plans`, `care_plan_needs`, `care_plan_need_resources`, `care_plan_history` (§15 lista `care_plan_items/professionals/resources` — não existem). **Doc-mãe não atualizado → PC-8/DPC-7 documental.**

### 7. Regras implementadas e pendentes

**Implementadas**: RN-PLC §2 (4 itens), §3.2–3.4, §4, §5, §6, §7 + §7.1 (3), §8 (2), §9, §10; RF01–RF14 (ver matriz atualizada no adendo e retrato histórico em §3).

**Pendências de definição herdadas dos docs (fora do escopo já decidido ou ainda sem regra de domínio)**:
1. **Recursos que exigem estoque/logística** (doc-mãe §11) — **não definido**; o catálogo está disponível para cadastro na interface/API e não há regra de estoque (correto);
2. Regras de escala/agendamento/visita/atendimento/evolução (RN §10, tasks §7) — fora do escopo, respeitado.

**Pendências históricas desta auditoria**: ver §9; decisões já consolidadas no adendo inicial.

### 8. Problemas encontrados

| # | Problema | Tipo | Evidência |
|---|---|---|---|
| PC-1 | **RF05 parcial**: a visualização não apresenta "informações de criação e atualização" — `PlanSerializer` traz `created_at/updated_at/created_by/updated_by` mas `CarePlanDetail` não renderiza nenhum dos quatro | Funcionalidade incompleta (exibição) | `serializers.py:52-53` × `CarePlanDetail.tsx:84-92` (dl só início/encerramento/objetivo) |
| PC-2 | Histórico exibe **`Usuário #id`** ("Autor excluído") em vez de `actor_name` (denormalizado e serializado justamente para sobreviver à exclusão do autor), e mostra só `description` — sem `event_type` nem dados anteriores/novos, que existem no backend | Funcionalidade incompleta (exibição) / RN §9 parcial na UI | `CarePlanDetail.tsx:107` × `serializers.py:88` (`actor_name`, `previous_data`, `new_data`) × `PlanHistory` type (`carePlans.ts:21` — só 4 campos) |
| PC-3 | **Remoção da última necessidade vigente é permitida** em plano Ativo/Rascunho (nenhuma checagem de mínimo em `remove_need`, nenhum teste) → plano ativo fica sem necessidades atuais, contrariando a leitura contínua de RN-PLC §4.1 ("relacionado a uma ou mais"); ativação exige ≥1, remoção não | Regra ausente/caso-limite (depende de DPC-4) | `services.py:104-125` (sem checagem) × `models.py:57-62` × `CarePlanDetail.tsx:101` (sem guarda) |
| PC-4 | **Edição, vínculo, configuração e remoção funcionam em plano Encerrado** (nenhum serviço checa status além das transições; UI mostra os botões para qualquer status) — docs não definem se plano encerrado é editável | Definição ausente (não é divergência com RN) → DPC-3 | `services.py:129-175` (sem checagem de status) × `CarePlanDetail.tsx:91,94,101` |
| PC-5 | **`end_date` anterior a `start_date` não é validado** nem no backend nem no frontend — RN §8 não define coerência (registrado como definição ausente, não como bug) | Definição ausente → DPC-5 | `serializers.py:57-74` (sem cross-field) × `CarePlans.tsx:66-67` |
| PC-6 | **Profissional inativo pode ser configurado** como profissional necessário (select exibe "(inativo)", serializer aceita qualquer `Professional`) — RN-PLC §5.1 não restringe a ativo; a escala, do lado dela, exige profissional ativo (decisão em `execucao_tasks_a_fazer.md:57`) | Definição ausente → DPC-6 | `PlanNeedConfiguration.tsx:42` × `serializers.py:16` (`Professional.objects.all()`) |
| PC-7 | **Validação por execução pendente**: 56 testes backend (17 arquivos) e 3 testes frontend **não foram executados**; cobertura de frontend cobre só a lib (`canPlan`, payload, status) sem páginas/componentes; afirmações de 235/246/279/290 testes verdes nos docs são **documentadas, não verificadas** | Falta de testes / validação | `care_plans/tests*.py`, `tests/carePlans.test.mjs` × `execucao_tasks_rubens.md:49`, `execucao_tasks_a_fazer.md:61-62` |
| PC-8 | **Doc-mãe §7/§15 desatualizado** face ao modelo implementado (campo de avaliação, responsável do plano, `observations`, Suspenso, `care_plan_items` com status próprio, `professional_type`, `resource_type`/frequência, nomes das tabelas) — decisão de priorizar a RN/tasks está registrada em `tasks_plano_cuidados.md` TASK 01, mas o doc-mãe não foi atualizado | Divergência doc×código (doc stale) | `Processos e Modelo de Dados.md:593-727,1088-1098` × `care_plans/models.py` |
| PC-9 | **Sem item de menu** para planos no `AppLayout` — acesso apenas pelo atalho do detalhe do paciente (corretamente condicionado a `canPlan('view')`); não viola RN, registrado como observação de navegação (mesmo padrão do PA-14) | UX/observação | `AppLayout.tsx` (sem ocorrência de "plano") × `PatientDetail.tsx:208` |
| PC-10 | Comentário desatualizado no admin | **RESOLVIDO na Etapa 3**: comentário descreve os endpoints/serviços atuais | `care_plans/admin.py` |
| PC-11 | **Herdado (interface)**: excluir necessidade vinculada a plano continua retornando **500** no lado da necessidade (`ProtectedError` não tratado — PA-5/PN-4/DA-3/DN-3); do lado do plano o fluxo está resolvido (PROTECT + remoção explícita + bloqueio de escala com 400) | Problema de integração (**A VALIDAR**) | `care_plans/models.py:73` × `assessments/views.py:159-174` (processo 3) |

**Não são problemas (confirmados corretos)**: gating frontend×backend idêntico (grupo + granular, sem OR problemático); rota com gate próprio de página (mensagem de permissão, não erro genérico); paginação usando `next` do DRF; remoção lógica que preserva necessidade, recursos e histórico; remoção bloqueada quando a necessidade está em escala (400, com teste); criação/edição com erros acumulados em 400 única; `IntegrityError` convertido em 400 (não 500); histórico transacional (rollback junto com a operação); encerramento não toca em necessidades nem preenche `end_date` automaticamente (decisão registrada); ausência de delete de plano; principio de não antecipação respeitado (nenhuma regra de escala/agendamento/visita/evolução no app); profissional necessário modelado como `Professional` específico conforme RN §5.1 (não como tipo de profissão).

### 9. Decisões pendentes

Novas para decisão humana (além das pendências do doc-mãe §11, das D1–D4/DA-1–DA-6/DN-1–DN-5 e da memória §8):
**Situação atual:** não há decisões pendentes deste processo. DPC-1 a DPC-7 estão resolvidas e implementadas nas Etapas 1–2; PC-8 foi atualizado; PC-10 foi corrigido na Etapa 3. PC-9 permanece observação de UX sem pendência funcional.

### 10. Dependências com outros processos

- **Necessidades identificadas** (processo anterior): `CarePlanNeed.care_need` FK **PROTECT** → `assessments.CareNeed`; criação/vínculo exigem necessidade identificada, ativa e do mesmo paciente; remoção do vínculo não toca na necessidade. A exclusão física protegida retorna HTTP 400, com teste de API cobrindo preservação do registro (Etapa 2/PC-11).
- **Avaliação inicial**: indireta — `necessidades-disponiveis` filtra por `assessment__patient` (`views.py:130`); o plano não guarda `assessment_id` (decisão TASK 01 × doc-mãe §7.3, PC-8).
- **Cadastro do paciente**: `CarePlan.patient` FK PROTECT; entrada pelo atalho do `PatientDetail` (condicionado a `canPlan('view')`). **Satisfeita**.
- **Escala** (`care_scales`, já implementada): **dependência bidirecional consolidada** — `CareScale.care_plan` PROTECT e `ScaleNeed.plan_need` PROTECT; decisões de domínio: profissão compatível copiada do profissional necessário do plano, "mudanças no plano não sobrescrevem a escala", **remoção explícita da escala antes de retirar a necessidade do plano** (400 com mensagem, `services.py:114-116`, teste `care_scales/tests_plan_consistency.py:7`), cada necessidade vigente exige frequência + profissional ativo compatível para ativar a escala. **Satisfeita** (testes não executados → A VALIDAR).
- **Usuários/Profissionais** (`accounts`/`professionals`): `required_professional` aponta para `Professional`; o catálogo usado pelo plano exige profissional ativo. A gestão de profissionais continua vinculada ao módulo de usuários.
- **Recursos** (`assessments.Resource`): catálogo disponível na interface/API de recursos, com gestão pelo gerente; o plano consome os recursos cadastrados e não define regras de estoque/logística.
- **Agendamento/visita/atendimento/evolução**: sem código e sem regras (correto); `contracts.planned_requirement` + `care_scales.contracts.scheduling_requirement` preparados para integração (TASK 25 ✓).
- **Auditoria de sistema**: sem log próprio de usuário (diferente de `patients`/`accounts`) — `CarePlanHistory` cumpre o RF13; se um `UserAuditLog` de plano for exigido, é decisão futura (não há RN exigindo — corretamente não inventado).

### 11. Tasks recomendadas

Backlog histórico da auditoria original; todas as tarefas 001–010 foram resolvidas nas Etapas 1–3 e a 011 foi verificada. Não há implementação restante neste processo. O prefixo `TASK-PLC-*` é interno desta auditoria — o doc de tasks não tem IDs formais:

1. **TASK-PLC-001 — Exibir criação/atualização no detalhe do plano** (PC-1/RF05): resolver `created_by/updated_by` em nome no serializer (campo aninhado read-only) e renderizar `created_at/updated_at/autores` na tela.
2. **TASK-PLC-002 — Exibir corretamente o histórico na UI** (PC-2): usar `actor_name` em vez de `Usuário #id` e considerar expor `event_type` + dados anteriores/novos na listagem de eventos.
3. **TASK-PLC-003 — Definir e implementar a regra da última necessidade** (PC-3/DPC-4): impedir a remoção que deixe o plano sem vínculos vigentes (ou ajustar a RN-PLC §4.1) + teste de regressão — **depende da decisão**.
4. **TASK-PLC-004 — Definir comportamento de plano encerrado** (PC-4/DPC-3): registrar a decisão e, se for o caso, bloquear edição/vínculo/configuração/remoção em `CLOSED` (backend + gating da UI) + testes.
5. **TASK-PLC-005 — Validar coerência início × encerramento** (PC-5/DPC-5): doc + serializer + frontend, se a decisão for validar.
6. **TASK-PLC-006 — Definir elegibilidade do profissional inativo** (PC-6/DPC-6): decisão + ajuste no catálogo `GET .../profissionais/` e no select, se exigir ativo.
7. **TASK-PLC-007 — Executar a suíte backend de `care_plans`** (PC-7): `python manage.py test care_plans accounts --noinput` e registrar resultado (fecha os `A VALIDAR` de RF/testes; confere ou refuta os 235/246/279/290 declarados).
8. **TASK-PLC-008 — Ampliar testes frontend de planos** (PC-7): páginas `CarePlans`/`CarePlanDetail` + componentes de configuração/remoção + gating de status (padrão `node:test`, hoje só 3 casos na lib).
9. **TASK-PLC-009 — Registrar decisões de obrigatoriedade e aprovação do plano** (DPC-1/DPC-2): conclusão das pendências do doc-mãe §11 — **sem implementar antes da decisão**.
10. **TASK-PLC-010 — Atualizar o doc-mãe §7/§15 ao modelo implementado** (PC-8/DPC-7 documental): refletir `care_plan_needs`/`care_plan_need_resources`, ausência de Suspenso e de vínculo com avaliação, e remover `care_plan_items/profissionais/resources` — ou formalizar que RN/tasks prevalecem; incluir o comentário obsoleto de `admin.py` (PC-10).
11. **TASK-PLC-011 — Acompanhar a decisão DA-5 (cadastro de recursos)**: **concluída/verificada** — cadastro de recursos existe na interface/API; sem implementação adicional nesta etapa.

---
