## Processo 2 — **Avaliação Inicial** (auditado em 18/11/2026)

> **Atualização de modelagem — 22/11/2026:** `NeedType` foi transferida
> de `patients` para `assessments` pela TASK-CAD-PAC-045. A migração de
> estado mantém a tabela `need_types`, os IDs e as FKs; referências a
> `patients.NeedType` abaixo descrevem a auditoria-base.

- `RN`: `docs/regras-de-negocio/regras_negocio_avaliacao_inicial.md` (RN-AVL-001…017 + §8 informações clínicas, §9 histórico)
- `RF`: `docs/requisitos-do-sistema/requisitos_funcionais_avaliacao_inicial.md` (RF-AVL-001…023)
- `TASK`: `docs/tasks/tasks_avaliacao_inicial.md` (TASK-AVL-MOD-001…007, BE-001…008, AUTH-001…004, FE-001…007, TEST-001…006 — **sem checkboxes**; nota de implementação embutida p/ TA-40…46)
- Documento-mãe: `docs/Processos e Modelo de Dados.md` §5 (Processo 2), §8, §9, §10, §11 (bloco "Avaliação"), §15
- Decisões complementares: `AGENTS.md` (seção "Key Details" — Avaliação Inicial), comentários de código (`TA-47…64`), migrações `accounts/0005…0009`
- Rastreio Jira `TA-40…64`: referenciado no código/docs; **status externo não verificado** (fonte externa = decisão pendente D2 da memória)

---

### 1. Resumo do processo

Registra a **situação atual do paciente** após solicitação de atendimento — responde *"Qual é a situação atual do paciente e o que ele precisa?"* (doc-mãe §5.1). É registro próprio: **não substitui nem altera** o cadastro permanente nem avaliações anteriores (RN-AVL-006, §9.1). Fluxo: paciente já cadastrado → avaliação criada por médico/enfermeiro → necessidades e recursos identificados → **entrada do plano de cuidados** (§9.2).

**Entradas**: paciente existente, profissional responsável, data/hora, tipo (único), motivo da solicitação, queixa principal, origem (opcional), campos clínicos livres, tipos de necessidade cadastrados, recursos cadastrados. **Saídas**: avaliação própria e imutável no histórico + necessidades identificadas (status inicial `Identificada`) + recursos associados → consumidos por `care_plans`.

Escopo **não** deste processo (corretamente não antecipado): reavaliação, evolução de status da necessidade, escala/agendamento/visita/atendimento/evolução, estoque/farmácia/logística, interpretação automática (RN-AVL §11/§12).

### 2. Status geral

**PARCIAL — fluxo conectado. PA-1 a PA-13 foram resolvidos ou registrados; decisões DA-1 a DA-6 foram confirmadas e implementadas nesta rodada.**

O fluxo criado → histórico → detalhe → editar → adicionar necessidade → associar recurso está conectado entre frontend e backend. Nesta rodada foram implementadas as decisões DA-1 a DA-6 e resolvidos PA-1 a PA-13. Passaram 197 testes backend na suíte base e 45 testes focados nas mudanças desta rodada; build frontend e teste de permissões também passaram.

### 3. Requisitos e status de implementação

#### 3.1 Regras de negócio (RN-AVL)

| ID | Regra | Status | Evidência / motivo |
|---|---|---|---|
| 001 | Tipo único "Avaliação inicial" (sem reavaliação) | **CONCLUÍDO** | `AssessmentType` só `INITIAL` (`models.py:23-26`); `validate_assessment_type` rejeita outros (`serializers.py:152-157`); frontend campo fixo desabilitado (`AssessmentForm.tsx:407-414`); teste `test_create_rejects_other_assessment_type` |
| 002 | Só médico/enfermeiro criam | **CONCLUÍDO** | Backend restringe por grupo + granular; frontend usa o mesmo gate e não mostra criação ao gerente (PA-1 corrigido) |
| 003 | Campos obrigatórios (paciente, profissional, data, hora, tipo, motivo, queixa) | **CONCLUÍDO** | Create acumula erros; update valida os valores resultantes e rejeita limpeza de obrigatórios (PA-3 corrigido) |
| 004 | Origem em lista padronizada (5 valores) | **CONCLUÍDO** | `RequestOrigin` TextChoices com os 5 rótulos (`models.py:44-56`; migração `assessments/0002` padronizou o campo antes livre); rejeita valor desconhecido (teste `test_create_rejects_unknown_request_origin`); select espelhado em `REQUEST_ORIGINS` (`lib/assessments.ts:90-96`). Ressalva: limpeza da origem na edição não funciona (PA-10) |
| 005 | Profissional responsável (existente e alterável) | **CONCLUÍDO** | FK validada como MEDICO/ENFERMEIRO; gerente autorizado altera na UI (PA-2 corrigido); detalhe e histórico mostram o nome resolvido pela API (PA-4 corrigido) |
| 006 | Múltiplas avaliações, registro próprio, sem sobrescrever | **CONCLUÍDO** | Sem delete em `AssessmentViewSet` (`http_method_names`, `views.py:59`); testes `test_multiple_assessments_preserved`, `test_history_lists_multiple_without_overwrite`; histórico paginado por paciente |
| 007 | Médicos e enfermeiros editam | **CONCLUÍDO** | `IsCareTeam` + `avaliacoes.update` (`views.py:76-80`) — no backend o gerente é aceito no view mas **bloqueado no serializer** (só `professional`, 403); testes `test_medico_can_edit`, `test_enfermeiro_can_edit` |
| 008 | Gerente altera o profissional responsável | **DIVERGENTE** | Backend **CONCLUÍDO** (`GERENTE_ALLOWED_UPDATE_FIELDS=("professional",)` + granular `avaliacoes.change_professional`, `serializers.py:35,180-193`; teste `test_gerente_can_change_professional`). Frontend **impede**: em edição o select do profissional recebe `disabled={readOnlyMain}` como todos os campos (`AssessmentForm.tsx:204,423`) — banner e tooltip dizem "Gerente altera apenas este campo" mas ele está desabilitado (PA-2) |
| 009 | Visualização: gerente+médico+enfermeiro | **CONCLUÍDO** | `IsCareTeam = IsGerente \| IsMedico \| IsEnfermeiro` + `avaliacoes.view` (`views.py:46,88-93`); testes `test_all_profiles_can_view`, `test_sem_grupo_cannot_view` |
| 010 | Avaliação sem status próprio | **CONCLUÍDO** | Nenhum campo status no model; teste `test_assessment_has_no_status` |
| 011 | Necessidade criada dentro da tela da avaliação e vinculada | **CONCLUÍDO** | `POST /api/avaliacoes/<id>/necessidades/` injeta `assessment` (`views.py:125-139`); sub-form na tela da avaliação (`AssessmentForm.tsx:566-647`, habilita só após salvar); teste `test_medico_creates_need_with_identified_status` |
| 012 | Dados da necessidade (tipo, descrição, prioridade, status) | **CONCLUÍDO** | `CareNeed` com `need_type` FK PROTECT, `description`/`priority` obrigatórias (`models.py:147-194`), `status` read-only default (`serializers.py:214`) |
| 013 | Prioridade Baixa/Média/Alta/Urgente | **CONCLUÍDO** | `NeedPriority` (`models.py:29-35`) espelhado em `NEED_PRIORITIES` (`lib/assessments.ts:101-106`); testes `test_all_priorities_accepted`, `test_invalid_priority_rejected` |
| 014 | Status inicial "Identificada" | **CONCLUÍDO** | `NeedStatus` com valor único + default (`models.py:38-41,169-173`); exibido readonly no form; evolução corretamente pendente |
| 015 | Avaliação identifica; atendimento pertence ao plano | **CONCLUÍDO** | Nenhuma regra de frequência/escala no app; `care_plans` consome `CareNeed` (ver RF-018/§10) — princípio de não antecipação respeitado |
| 016 | Recursos de avaliação só de cadastro existente | **CONCLUÍDO** | Associação usa apenas recursos cadastrados; gerente pode manter o catálogo pela API e pela tela `/recursos` |
| 017 | Dados do recurso: recurso, quantidade, observação | **CONCLUÍDO** | `quantity` ≥ 1 validado nos dois lados (`models.py:234-238`, `extra_kwargs min_value=1` `serializers.py:251`, `min={1}` no form); teste `test_rejects_zero_quantity` |
| §8 | Informações clínicas registradas sem interpretação | **CONCLUÍDO** | 12 campos `TextField` livres, exibidos como texto no detalhe; nenhum processamento |
| §9 | Histórico preserva todas as avaliações | **CONCLUÍDO** | Rota `/pacientes/:patientId/avaliacoes` + `GET /api/avaliacoes/?patient=`; sem sobrescrever; teste `test_history_lists_multiple_without_overwrite` |

> IDs `§8`/`§9` são seções do doc sem ID formal (conforme inventário §8.2 — convenção de identificadores = decisão pendente D3 da memória).

#### 3.2 Requisitos funcionais (RF-AVL)

| ID | Requisito | Status | Observação |
|---|---|---|---|
| RF-AVL-001 | Criar avaliação vinculada a paciente (médico/enfermeiro) | **CONCLUÍDO** | Rota `/pacientes/:patientId/avaliacoes/nova`; `POST /api/avaliacoes/` |
| RF-AVL-002 | Validar campos obrigatórios | **CONCLUÍDO** | Create e update rejeitam valores obrigatórios ausentes ou limpos (PA-3 corrigido) |
| RF-AVL-003 | Selecionar tipo (único: Avaliação inicial) | **CONCLUÍDO** | Campo fixo desabilitado com tooltip "Tipo único (RN-AVL-001)"; backend rejeita outros valores |
| RF-AVL-004 | Registrar origem (5 valores) | **CONCLUÍDO** | Select com as 5 opções; ver PA-10 (não limpa) |
| RF-AVL-005 | Definir profissional responsável | **CONCLUÍDO** | Select `GET /api/clinicos/` (equipe clínica ativa) com fallback `Profissional #id` |
| RF-AVL-006 | Alterar profissional responsável (também gerente) | **CONCLUÍDO** | UI permite a troca ao gerente autorizado; demais campos permanecem bloqueados |
| RF-AVL-007 | Registrar os 12 dados da avaliação | **CONCLUÍDO** | Todos os campos do RF existem no model, no form e no detalhe (`initial_need_description`, `need_start_date`, anamnese, HDA, situação, observações, administrativas, relevantes, conclusão, recomendação, motivo, queixa) |
| RF-AVL-008 | Criar uma ou mais necessidades na tela da avaliação, vinculadas | **CONCLUÍDO** | Sub-form + endpoint aninhado; `addNeed` pós-criação |
| RF-AVL-009 | Dados da necessidade | **CONCLUÍDO** | Tipo (select de catálogo ativo), descrição, prioridade, status (readonly) |
| RF-AVL-010 | Prioridade com 4 valores | **CONCLUÍDO** | |
| RF-AVL-011 | Status inicial "Identificada" | **CONCLUÍDO** | |
| RF-AVL-012 | Associar recursos existentes (recurso, qtd, obs) | **PARCIAL** | Associação respeita grupo e granular permission; cadastro do catálogo permanece pendente de DA-5 |
| RF-AVL-013 | Consultar avaliação (gerente/médico/enfermeiro) | **CONCLUÍDO** | Detalhe tem gate de acesso explícito e exibe o profissional responsável |
| RF-AVL-014 | Editar avaliação (médico/enfermeiro) | **CONCLUÍDO** | Rota `/avaliacoes/:id/editar`; payload completo; gerente recebe só `professional` |
| RF-AVL-015 | Manter histórico de registros independentes | **CONCLUÍDO** | |
| RF-AVL-016 | Não exigir status de avaliação | **CONCLUÍDO** | |
| RF-AVL-017 | Sem interpretação automática | **CONCLUÍDO** | |
| RF-AVL-018 | Preparar integração com plano de cuidados | **CONCLUÍDO** | `care_plans.CarePlanNeed.care_need` FK → `assessments.CareNeed` (PROTECT, `care_plans/models.py:73`); `GET .../necessidades-disponiveis/` filtra `is_active=True e status='IDENTIFIED'` do mesmo paciente (`care_plans/views.py:130`); serviços exigem "necessidade identificada ativa do paciente" (`services.py:49-50,195-196`) |
| RF-AVL-019 | Matriz de controle de acesso | **CONCLUÍDO** | Equipe clínica cria necessidades/associa recursos; gerente administra recursos e troca profissional responsável |
| RF-AVL-020 | Alterações não eliminam o histórico | **CONCLUÍDO** | Sem endpoint de exclusão de avaliação; edições atualizam o registro sem tocar nos demais |
| RF-AVL-021 | Administrar recursos | **CONCLUÍDO** | Gerente cria/edita recursos pelo CRUD e pela tela `/recursos` |
| RF-AVL-022 | Auditar avaliações | **CONCLUÍDO** | Log transacional registra criação, edição e troca de responsável |
| RF-AVL-023 | Preservar necessidades vinculadas a planos | **CONCLUÍDO** | Exclusão física recusada; edição vinculada exige aviso e confirmação |

#### 3.3 Tasks (TASK-AVL-MOD/BE/AUTH/FE/TEST + TA-*)

Status por evidência de código (o doc **não tem checkboxes**; a nota de implementação embutida está **parcialmente desatualizada** — ver PA-12). Rastreio Jira `TA-40…64` citado em comentários (`TA-55/56/58/59` aparecem como **pendentes** de gating em `patients/views.py:211` e `lib/assessments.ts:111`) — **status externo não verificado** (A VALIDAR).

| Bloco | Tasks | Status |
|---|---|---|
| Modelagem | MOD-001…007 (PatientAssessment, CareNeed, recursos, tipo, origem, prioridade, status inicial) | **CONCLUÍDO** (com stubs declarados: `Resource`, campos permissivos no model — decisão registrada no próprio `models.py:8-17`) |
| Backend | BE-001 (criar), 003 (consultar), 004 (histórico), 005 (editar), 007 (necessidades), 008 (recursos) | **CONCLUÍDO** |
| Backend | BE-002 (obrigatórios) | **PARCIAL** (somente create) |
| Backend | BE-006 (alterar responsável) | **CONCLUÍDO** (backend) / frontend bloqueia o gerente (PA-2) |
| Autorização | AUTH-002 (visualização), AUTH-003 (edição) | **CONCLUÍDO** |
| Autorização | AUTH-001 (criação) | **CONCLUÍDO** (grupo clínico e permissão granular no backend e frontend) |
| Autorização | AUTH-004 (alterar responsável) | **PARCIAL** (backend ok; UI do gerente bloqueada — PA-2) |
| Frontend | FE-001 (tela), FE-002 (obrigatórios), FE-003 (origem), FE-004 (necessidades), FE-005 (prioridade), FE-007 (histórico) | **CONCLUÍDO** |
| Frontend | FE-006 (recursos) | **PARCIAL** (sem cadastro de recurso na UI; gating fino ausente) |
| Testes | TEST-001…006 | **CONCLUÍDO** — suíte base: 197 testes; regressão focada nas mudanças: 45 testes; build frontend e teste de gating passaram |

### 4. Evidências do backend

- **App** `backend/sistema_home_care/assessments/` — 4 entidades + 4 TextChoices (`AssessmentType`, `NeedPriority`, `NeedStatus`, `RequestOrigin`):
  - `PatientAssessment` (`models.py:89-144`): 19 campos de negócio, `patient` PROTECT, `professional` PROTECT nullable, sem status, ordering `-assessment_date, -created_at`.
  - `CareNeed` (`models.py:147-194`): `assessment` CASCADE, `need_type` PROTECT → `patients.NeedType`, `description`/`priority` obrigatórias, `status` default `IDENTIFIED`, `is_active`/`inactivated_at` (inativação é da etapa de necessidades).
  - `CareNeedHistory` (`models.py:197-209`): snapshot + actor `SET_NULL` (preservado mesmo após exclusão física).
  - `AssessmentResource` (`models.py:212-245`): `resource` PROTECT, `quantity` ≥ 1, `observation`.
  - `Resource` (`models.py:59-86`): **stub mínimo** (nome + timestamps) — estrutura detalhada pendente, conforme doc.
- **Migrations**: 5 (`0001_initial`, `0002` origem padronizada, `0003` inativação, `0004` transferência de `NeedType`, `0005` auditoria). `accounts/0012` adiciona administração de recursos ao Gerente e retira `change_professional` de Médico/Enfermeiro.
- **Serializers** (7): `PatientAssessmentSerializer` (create acumula obrigatórios numa única 400; update: gerente só `professional` → 403, com checagem granular `avaliacoes.change_professional`), `CareNeedSerializer` (`status`/`assessment` read-only; tipo inativo rejeitado exceto no vínculo atual), `AssessmentResourceSerializer`, `CareNeedHistorySerializer`, 2 read para relacionados, `ResourceCatalogSerializer` (read-only).
- **Views/endpoints** (`views.py`, `urls.py` — router):
  - `POST /api/avaliacoes/` — `IsClinicalStaff` + `avaliacoes.create`
  - `GET /api/avaliacoes/?patient=<id>` — histórico, `IsCareTeam` + `avaliacoes.view`, **paginação fixa 20** (`AssessmentPagination`)
  - `GET/PUT/PATCH /api/avaliacoes/<id>/` — retrieve/view; update `IsCareTeam` + `avaliacoes.update` (restrito no serializer p/ gerente); **sem `DELETE`** (`http_method_names`)
  - `POST /api/avaliacoes/<id>/necessidades/` — `IsActiveUser` + clínico + `necessidades.create` + `avaliacoes.add_need`
  - `POST /api/avaliacoes/<id>/recursos/` — clínico + `avaliacoes.add_resource`
  - `/api/necessidades/` — list/retrieve/update/**destroy** + `inativar`/`reativar`/`historico` (matriz `NEED_ACTIONS`, `assessments/permissions.py:16-36`; **processo de Necessidades**, ver PA-5)
  - `GET /api/recursos/` — catálogo read-only (sem paginação)
  - Apoia: `GET /api/clinicos/` (`accounts/views.py:179-207`, equipe clínica ativa, `avaliacoes.view`) e `GET /api/tipos-necessidade/` (`patients/views.py:207-235`, default só ativos, gating `avaliacoes.view` "enquanto TA-55/56/58/59 pendentes").
- **Services**: **não há** `assessments/services.py` — regras em serializers/views (mesmo padrão de `patients`; risco de manutenção registrado na etapa técnica).
- **Validações**: acumuladas no create; `quantity ≥ 1`; tipo de necessidade ativo; origem no domínio; `patient`/`professional` inválidos → 400; Django `ValidationError` convertido em DRF nos actions.
- **Permissões**: duas camadas (`IsGerente/IsMedico/IsEnfermeiro/IsClinicalStaff` + `RequirePermission`, `accounts/permissions.py`); matriz fina de necessidades em `assessments/permissions.py` com escopo clínico×gerente; `IsActiveUser` bloqueia usuário inativo.
- **Auditoria**: **nenhum log de auditoria para criação/edição de avaliação** (diferente de `patients`/`accounts`); existe apenas `CareNeedHistory` para inativação/reativação de necessidade (DA-4). Sem signals (decisão geral do projeto).
- **Admin**: 5 models registrados (`admin.py`) — `ResourceAdmin` é hoje a **única via de cadastro de recurso**.
- **Testes**: suíte base `python manage.py test assessments patients accounts --noinput`: 197 passaram; suíte focada em criação/edição, catálogo, inativação e necessidades: 45 passaram. Frontend: `npm run build` e `node --test tests/assessments.test.mjs` passaram; cobertura automatizada de formulário/histórico permanece incompleta.

### 5. Evidências do frontend

- **Páginas**: `AssessmentForm.tsx` (714 l., `mode="create"|"edit"`), `AssessmentDetail.tsx` (305 l.), `AssessmentsHistory.tsx` (150 l.); componente `NeedEditForm.tsx` (89 l.); lib `src/lib/assessments.ts` (298 l., espelha serializers + gating + chamadas API).
- **Rotas/guardas** (`App.tsx:63-75`): `/pacientes/:patientId/avaliacoes`, `/nova`, `/avaliacoes/:id`, `/editar` — **todas atrás apenas de `RequireAuth`**; o controle de acesso é feito **dentro das páginas** (histórico checa `canViewAssessments`; form de criação checa `canCreateAssessment`; detalhe **não faz checagem própria** — depende do 403, PA-7).
- **Histórico**: lista por paciente com paginação (20/página, `count`), botão "Nova avaliação" condicionado a `canCreateAssessment`, estados loading/erro/vazio, aviso "Novas avaliações não sobrescrevem as anteriores". Ressalva: "Próxima" usa `items.length < 20` → última página cheia permite ir a página vazia (PA-11).
- **Formulário**: tipo fixo; select de responsável (`/api/clinicos/`, default = próprio usuário); data/hora `required`; origem com as 5 opções; motivo/queixa `required`; 9 textareas clínicos; erros por campo via `parseFieldErrors`; 403 exibido em `actionError`.
- **Edição**: clínico envia payload completo; gerente recebe **só** `{professional}` + banner "você pode alterar apenas o profissional responsável" — **mas todos os campos, incluindo o select do profissional, ficam `disabled`** (PA-2).
- **Necessidades** (na tela da avaliação): listagem com tipo/descrição/prioridade/status/ativo-inativo; sub-form (tipo do catálogo, prioridade, descrição, status readonly "Identificada"); gating duplo `clinical && necessidades.create && avaliacoes.add_need` (`AssessmentForm.tsx:121-122`); bloqueio "Salve a avaliação para adicionar necessidades" no create.
- **Detalhe**: 14 campos da avaliação, seção de necessidades com ações **por permissão granular** (editar/excluir/inativar/reativar/histórico, `AssessmentDetail.tsx:245-266`) + `NeedEditForm` inline; seção de recursos. **Não exibe o profissional responsável** (PA-4).
- **Recursos** (no form): select + quantidade `min=1` + observação; visível para **qualquer perfil clínico** sem checar `avaliacoes.add_resource` (PA-6).
- **Integração API**: `lib/api.ts` (`credentials:"include"`, refresh silencioso); `assessments.ts` espelha os endpoints de avaliação, necessidades (sem exclusão física), recursos e catálogos. **Fluxo conectado** (paciente → histórico → nova avaliação → detalhe → editar → necessidades → recursos).
- **Controle de acesso no menu**: `AppLayout` **não possui item de menu para avaliações** — acesso apenas pelos atalhos do detalhe do paciente (condicionados a `canViewAssessments`/`canCreateAssessment`, `PatientDetail.tsx:186-206`); breadcrumbs existem (`AppLayout.tsx:26-27`).
- **Validações client-side**: apenas `required` do HTML, `min=1` e trim — dígitos/limites não aplicados (backend rejeita).
- **Testes**: **nenhum** para o processo (`frontend/.../tests/` só `carePlans`, `careScales`, Playwright da escala) → PA-8.

### 6. Entidades e relacionamentos

```
accounts.User (grupo MEDICO|ENFERMEIRO) ──FK PROTECT──► PatientAssessment.professional  (nullable; obrigatoriedade só no endpoint)
Patient ──FK PROTECT──► PatientAssessment              (avaliação nunca deletada; histórico preservado)
PatientAssessment ──1:N CASCADE──► CareNeed
NeedType (app assessments) ──FK PROTECT──► CareNeed     (tipo inativo não entra em novo vínculo)
CareNeed ──1:N──► CareNeedHistory (need SET_NULL, actor SET_NULL, snapshot JSON)
CareNeed ◄──FK PROTECT── care_plans.CarePlanNeed       (API recusa exclusão física em qualquer situação)
PatientAssessment ──1:N CASCADE──► AssessmentResource
Resource ──FK PROTECT──► AssessmentResource             (stub; cadastro só via admin)
PatientAssessment ──1:N──► (sem status, sem audit log próprio)
```

Conforme doc-mãe §5.11: **todos os 19 campos de `patient_assessments` existem com os mesmos nomes** (sem divergência de nomenclatura). Doc-mãe §6.2/§15 não detalham `care_needs` além do modelo — código segue as tasks. `NeedType` está no app `assessments`, mantendo a tabela legada `need_types`.

### 7. Regras implementadas e pendentes

**Implementadas**: RN-AVL-001, 004, 006, 007, 009, 010, 011–017 + §8/§9; RN-002/003/005/008 conforme §3.1 (com as ressalvas indicadas); RF-AVL-001, 003–005, 007–011, 013–018, 020.

**Pendências de definição herdas do doc (respeitadas — não implementadas por inferência)**:
1. Valores/estrutura dos campos clínicos (doc-mãe §11 "Avaliação": quais campos os profissionais realmente usam); 2. tipos de avaliação futuros (reavaliação); 3. HDA como texto × campos adicionais; 4. formalização de necessidades/recursos; 5. evolução dos status das necessidades (status é read-only — correto); 6. edição de necessidade após uso no plano; 7. regras de recursos/estoque/farmácia/logística; 8. detalhamento de `Resource` (stub intencional); 9. regras do plano/escala/agendamento/visita/atendimento/evolução (não antecipadas — correto).

**Decisões desta auditoria**: confirmadas e registradas em §9 (DA-1…DA-6).

### 8. Problemas encontrados

| # | Problema | Tipo | Evidência |
|---|---|---|---|
| PA-1 | **Corrigido**: criação exige grupo clínico e permissão granular no frontend; gerente não vê o atalho | Controle de acesso/UX | `lib/assessments.ts`; `tests/assessments.test.mjs` |
| PA-2 | **Corrigido**: gerente autorizado consegue selecionar profissional; demais campos continuam bloqueados | **Divergência doc×frontend** | `AssessmentForm.tsx`; backend já aceitava a troca |
| PA-3 | **Corrigido**: PATCH valida campos obrigatórios resultantes e rejeita limpeza ou null | Regra ausente/incompleta | `serializers.py`; regressão adicionada em `assessments/tests_api.py` |
| PA-4 | **Corrigido**: API expõe nome do profissional; detalhe e histórico o apresentam | Funcionalidade incompleta | `serializers.py`, `AssessmentDetail.tsx`, `AssessmentsHistory.tsx` |
| PA-5 | **Corrigido**: exclusão física de necessidade retorna 400 orientando inativação, inclusive quando vinculada a plano | Problema de integração/erro não tratado | `CareNeedViewSet.destroy`; teste de API de inativação |
| PA-6 | **Corrigido**: seção de associação de recursos só aparece com perfil clínico e `avaliacoes.add_resource` | Controle de acesso fino (UX) | `AssessmentForm.tsx`, alinhado a `views.py` |
| PA-7 | **Corrigido**: detalhe e edição mostram mensagem explícita para perfil sem acesso | Controle de acesso/UX | `AssessmentDetail.tsx`, `AssessmentForm.tsx` |
| PA-8 | **Parcialmente corrigido**: teste frontend cobre gating por grupo e permissão; formulário/histórico ainda sem teste automatizado | Falta de testes | `frontend/sistema-home-care/tests/assessments.test.mjs` |
| PA-9 | **Corrigido/validado**: suíte backend base (197 testes) e suíte focada nas mudanças (45 testes) passaram | Validação | `manage.py test assessments patients accounts` e execução focada |
| PA-10 | **Corrigido**: edição envia string vazia para limpar origem | Bug menor | `AssessmentForm.tsx` |
| PA-11 | **Corrigido**: botão Próxima usa o campo `next` retornado pelo DRF | UX/menor | `AssessmentsHistory.tsx` |
| PA-12 | **Corrigido**: nota de implementação agora registra domínio padronizado | Divergência doc×código | `docs/tasks/tasks_avaliacao_inicial.md` |
| PA-13 | **Corrigido**: gerente cadastra e edita recursos pela API e tela Administração → Recursos | Dependência resolvida (DA-5) | `ResourceCatalogViewSet`, migration de permissão e página `Resources.tsx` |
| PA-14 | Sem item de menu para avaliações no `AppLayout` (acesso só via atalhos do paciente) — não é violação de RN, registrado como observação de navegação | UX/observação | `AppLayout.tsx:84-116` |

**Não são problemas (confirmados corretos)**: ausência de delete da avaliação (histórico preservado); ausência de status (RN-010); tipo único com campo fixo; origem padronizada e rejeitando valores fora do domínio; `status`/`assessment` read-only na necessidade; necessidade com default `Identificada`; catálogos tolerando 403 sem bloquear o form; stubs `Resource`/campos permissivos declarados como pendência no próprio código; princípio de não antecipação respeitado (nenhuma regra de escala/agendamento/evolução no app); `CareNeedHistory` preserva snapshot com `SET_NULL`.

### 9. Decisões confirmadas e implementadas

Decisões informadas pelo usuário em 22/11/2026:

| ID | Decisão | Implementação |
|---|---|---|
| DA-1 | Só equipe clínica cria necessidades e associa recursos na avaliação | Backend e frontend exigem grupo clínico e permissões granulares existentes |
| DA-2 | Permitir editar necessidade vinculada a plano, com aviso | API expõe `has_plan_links`; formulário alerta e pede confirmação antes de salvar |
| DA-3 | Exigir inativação; não permitir exclusão física de necessidade | `DELETE /api/necessidades/<id>/` retorna 400 orientando inativação; botão removido |
| DA-4 | Auditar criação e alterações, inclusive troca de responsável | `PatientAssessmentAuditLog`, gravação transacional e admin somente leitura |
| DA-5 | Gerente cadastra recursos via tela/API | CRUD do nome em `/api/recursos/` e tela `/recursos`; permissão `avaliacoes.manage_resources` |
| DA-6 | `avaliacoes.change_professional` é exclusiva do gerente | Migration remove a permissão de Médico/Enfermeiro; backend exige a permissão granular no fluxo gerencial |

Permanecem pendentes decisões externas citadas no documento-mãe e o rastreio Jira, cujo status não foi consultado.

### 10. Dependências com outros processos

- **Cadastro do paciente** (`patients`): `PatientAssessment.patient` FK PROTECT; tela de criação entra pelo detalhe do paciente (atalhos condicionados a permissão). **Dependência satisfeita** (paciente é pré-requisito).
- **Necessidades identificadas** (processo seguinte): usa `CareNeed`/`CareNeedViewSet`/`NeedType`/histórico de inativação deste app. Edição vinculada ao plano avisa antes de salvar; exclusão física é recusada e exige inativação.
- **Plano de cuidados** (`care_plans`): consome `CareNeed` (PROTECT) exigindo `IDENTIFIED` + ativo + mesmo paciente → **RF-AVL-018 satisfeito**; necessidades vinculadas podem ser editadas após confirmação e só podem ser inativadas, não excluídas fisicamente.
- **Escala** (`care_scales`): não depende diretamente da avaliação (depende do plano); nenhuma regra antecipada — correto.
- **Usuários** (`accounts`): select de responsável depende de usuários ativos nos grupos MEDICO/ENFERMEIRO (`GET /api/clinicos/`) e das permissões granulares. **Satisfeita**.
- **Profissionais** (`professionals`, stub): o responsável é `accounts.User`, **não** `Professional` — mesmo gap do cadastro (entidade de profissionais/equipe pendente); impacto: futura troca para `Professional` exigirá migração.
- **Recursos**: cadastro de nome mínimo disponível para gerente via API e tela `/recursos`; estoque/logística continuam fora do escopo.
- **Agendamento/visita/atendimento/evolução/reavaliação**: sem código e sem regras (correto); pendências do doc §11 mantidas.

### 11. Tasks recomendadas

Implementadas: TASK-AVL-FE-008/009/010/011/012, TASK-AVL-BE-009/010/011, TASK-AVL-TEST-007/008 e TASK-AVL-DOC-001. TASK-AVL-BE-010 implementa exclusão recusada com orientação para inativação; TASK-AVL-BE-011 implementa manutenção do catálogo de recursos.


---
