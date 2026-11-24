## Processo 1 — **Cadastro do Paciente** (auditado em 18/11/2026)

> **Atualização de implementação — 22/11/2026:** as tasks recomendadas
> TASK-CAD-PAC-037 a 045 foram implementadas. A seção 2 e a seção 11
> registram o estado atualizado; os achados das seções 3 e 8 descrevem a
> auditoria-base de 18/11 e devem ser lidos como histórico daquela revisão.
> Decisões: equipe opcional; status gerenciado pelo sistema; `update_manager`
> exigida junto ao grupo GERENTE; valores de sexo formalizados como
> Masculino, Feminino e Prefiro não dizer, com preservação de valores legados.

- `RN`: `docs/regras-de-negocio/regras_negocio_cadastro_paciente.md` (RN-CAD-PAC-001…024)
- `RF`: `docs/requisitos-do-sistema/requisitos_funcionais_cadastro_paciente.md` (RF-PAC-001…021)
- `TASK`: `docs/tasks/tasks_cadastro_paciente.md` (TASK-CAD-PAC-001…045)
- Documento-mãe: `docs/Processos e Modelo de Dados.md` §4 (Processo 1), §10, §11
- Decisões complementares: `AGENTS.md` (seção "Patients"), `docs/tasks/execucao_tasks_*.md` (sem conteúdo específico deste processo)

---

### 1. Resumo do processo

Primeiro registro permanente do sistema; responde **"Quem é o paciente?"** e serve de base para avaliação, necessidades, plano, escala e demais processos. Fluxo: cadastro → paciente identificado → pronto para avaliação. Escopo: criar, consultar, visualizar, editar, endereço único, médico/equipe responsável, doença/estado de saúde, ativar/inativar, filtros, paginação e permissões. Exclusão física **não faz parte** do processo (RN §10).

**Entradas**: dados pessoais, endereço, CPF/RG, médico responsável, equipe (provisória), condição de saúde. **Saída**: paciente identificado, com status, consultável pelos demais processos.

### 2. Status geral

**Estado atualizado: PARCIAL, com as divergências desta auditoria resolvidas e pendências de domínio ainda abertas.**

O fluxo segue conectado entre frontend e backend. TASK-CAD-PAC-037/041 alinharam equipe opcional e status gerenciado na documentação; TASK-CAD-PAC-038 aplica `pacientes.update_manager`; TASK-CAD-PAC-039 exibe nomes das relações; TASK-CAD-PAC-040 formaliza os valores de sexo e preserva valores legados; TASK-CAD-PAC-042/043 adicionam testes frontend e gating do menu; TASK-CAD-PAC-044 executou `patients` + `accounts` (**110 testes passaram**); TASK-CAD-PAC-045 move `NeedType` para `assessments` sem recriar sua tabela. A suíte frontend nova passou (5 testes). A equipe continua representada pelo JSON provisório até o módulo de profissionais definir a entidade.

### 3. Requisitos e status de implementação

#### 3.1 Regras de negócio (RN-CAD-PAC)

| ID | Regra | Status | Evidência / motivo |
|---|---|---|---|
| 001 | Só gerente cadastra | **CONCLUÍDO** | `views.py:61-66` `IsGerente` + `RequirePermission("pacientes.create")`; teste `test_non_gerente_cannot_create` |
| 002 | Campos obrigatórios | **DIVERGENTE** | Código não exige **equipe responsável** (`serializers.py:94-101` checa só doctor/condition/address) e **não solicita status** (read-only, default ACTIVE) — docs listam ambos como obrigatórios de entrada |
| 003 | CPF único | **CONCLUÍDO** | `models.py:98-104` `unique=True` + `validate_patient_cpf`; normalização antes do `UniqueValidator` (`serializers.py:75-77`); testes `test_duplicate_cpf_is_rejected`, `test_create_rejects_duplicate_cpf_even_masked` |
| 004 | Nascimento + idade | **CONCLUÍDO** | Campos `birth_date`/`age` no model; **atualização automática de idade = pendência do doc** (não implementada, corretamente) |
| 005 | Doença/estado como entidade | **PARCIAL** | `HealthCondition` existe e é obrigatória no create, mas estrutura mínima (`name` apenas) — estrutura detalhada é pendência declarada no doc |
| 006 | Endereço único | **CONCLUÍDO** | `PatientAddress` `OneToOneField` (`models.py:166-170`); teste `test_one_address_per_patient` |
| 007 | Região a partir do bairro | **NÃO INICIADO** | `region` é `CharField` livre (`models.py:180`); regra bairro→região é pendência do doc — sem derivação automática |
| 008 | Médico responsável | **CONCLUÍDO** | FK `responsible_doctor` → `accounts.User`; validação de grupo `MEDICO` no serializer (`serializers.py:79-87`, TA-5); teste `test_create_rejects_non_medico_doctor` |
| 009 | Equipe responsável | **PARCIAL** | `responsible_team` JSON provisório `null/blank` (`models.py:128-133`) — decisão registrada (TA-7/TASK-CAD-PAC-005); entidade Equipe não existe |
| 010 | Só gerente altera médico/equipe | **CONCLUÍDO** | `serializers.py:102-108` → `PermissionDenied` 403 para não-gerente; testes `test_medico_cannot_change_doctor_or_team`, `test_enfermeiro_cannot_change_doctor_or_team` |
| 011 | Status ativo/inativo | **CONCLUÍDO** | `PatientStatus` choices (`models.py:27-29`) |
| 012 | Só gerente inativa | **CONCLUÍDO** | `views.py:67-71` `IsGerente` + `pacientes.inactivate` |
| 013 | Só gerente reativa | **CONCLUÍDO** | `views.py:72-76` `IsGerente` + `pacientes.reactivate` |
| 014 | Inativos fora do padrão | **CONCLUÍDO** | `views.py:105-115` default `ativo`, filtros `inativo`/`todos`, inválido → 400; teste `test_default_lists_only_active` |
| 015 | Efeitos da inativação | **FORA DO MVP** | Doc declara dependência de processos não especificados (escala/agendamento/atendimento) — sem regra, sem código (correto) |
| 016 | Consulta por nome | **CONCLUÍDO** | `views.py:95-97` `full_name__icontains` |
| 017 | Consulta por CPF | **CONCLUÍDO** | `views.py:99-101` com normalização de máscara |
| 018 | Filtro por status | **CONCLUÍDO** | Idem RN-014 |
| 019 | Filtro por região | **CONCLUÍDO** | `views.py:117-119` `address__region__icontains` (origem da região = pendência RN-007) |
| 020 | Paginação 20 | **CONCLUÍDO** | `PatientPagination.page_size = 20` (`views.py:42-46`), `page_size_query_param=None` |
| 021 | Visualização gerente+equipe | **CONCLUÍDO** | `IsCareTeam` = gerente+médico+enfermeiro (`views.py:39,82-86`); granularidade interna da "equipe" é pendência do doc |
| 022 | Edição gerente/médico/enfermeiro | **CONCLUÍDO** | `views.py:77-81` `IsCareTeam` + `pacientes.update_clinical` |
| 023 | Restrição de edição do responsável | **CONCLUÍDO** | Idem RN-010 |
| 024 | Inativação/reativação gerente | **CONCLUÍDO** | Idem RN-012/013 |

#### 3.2 Requisitos funcionais (RF-PAC)

| ID | Requisito | Status | Observação |
|---|---|---|---|
| RF-PAC-001 | Cadastrar paciente (lista de campos) | **PARCIAL** | Todos os campos exceto **status** (não é solicitado) e **equipe** (opcional no form) |
| RF-PAC-002 | Validar obrigatórios | **DIVERGENTE** | Mesma causa do RN-002 |
| RF-PAC-003 | Validar CPF + unicidade | **CONCLUÍDO** | Backend valida dígitos e unicidade; frontend só aplica máscara (`lib/cpf.ts` — sem validação de dígitos verificadores antes do envio; erro do backend é exibido via `parseFieldErrors`) |
| RF-PAC-004 | Cadastrar endereço único | **CONCLUÍDO** | 9 campos, aninhado obrigatório no create |
| RF-PAC-005 | Associar doença/estado | **PARCIAL** | 1 condição por paciente (múltiplas = pendência do doc) |
| RF-PAC-006 | Associar médico responsável | **CONCLUÍDO** | Select carregado via `GET /api/medicos/` (somente gerente) |
| RF-PAC-007 | Associar equipe responsável | **PARCIAL** | Campo de texto livre provisório no form (`PatientForm.tsx:427-434`) |
| RF-PAC-008 | Consultar pacientes | **CONCLUÍDO** | Nome, CPF, status, região |
| RF-PAC-009 | Filtrar por status | **CONCLUÍDO** | |
| RF-PAC-010 | Filtrar por região | **CONCLUÍDO** | Com ressalva: regra bairro→região pendente |
| RF-PAC-011 | Paginar 20 | **CONCLUÍDO** | Backend fixo 20; frontend usa `PAGE_SIZE = 20` no cálculo de páginas |
| RF-PAC-012 | Visualizar paciente | **PARCIAL** | Acesso correto; porém `PatientDetail.tsx:142-159` exibe **IDs** de médico e condição em vez de nomes (ver §8) |
| RF-PAC-013 | Editar paciente | **CONCLUÍDO** | Rota `/pacientes/:id/editar` aberta à equipe clínica (correto); backend impõe matriz |
| RF-PAC-014 | Restringir médico responsável | **CONCLUÍDO** | |
| RF-PAC-015 | Restringir equipe responsável | **CONCLUÍDO** | |
| RF-PAC-016 | Inativar (gerente) | **CONCLUÍDO** | Ação `POST /api/pacientes/<id>/inativar/` idempotente, acessível a inativos |
| RF-PAC-017 | Reativar (gerente) | **CONCLUÍDO** | Ação `POST /api/pacientes/<id>/reativar/` |
| RF-PAC-018 | Matriz de permissões | **PARCIAL** | Matriz implementada (grupo + granular), **exceto**: permissão `pacientes.update_manager` existe no catálogo mas **nunca é verificada** (a restrição usa grupo `GERENTE` no serializer); coluna "Equipe" sem definição (pendência do doc) |
| RF-PAC-019 | Armazenar nascimento e idade | **CONCLUÍDO** | Atualização automática = pendência |
| RF-PAC-020 | Manter status | **CONCLUÍDO** | Inativo permanece armazenado e filtrável; editável sem reativar (teste `test_inactive_patient_can_be_edited_without_reactivation`) |
| RF-PAC-021 | Auditoria | **PARCIAL** | Log mínimo implementado (TA-37): CREATE/UPDATE/INACTIVATE/REACTIVATE/DOCTOR_TEAM_CHANGE; retenção/formato/UI = pendência declarada |

#### 3.3 Tasks (TASK-CAD-PAC-001…036)

Status por evidência de código (checkbox de `tasks_cadastro_paciente.md` **não** é evidência — ver §8.5 do inventário). Conforme `AGENTS.md`, concluídas no Jira: TA-5, 7, 10, 12–18, 20–24, 26, 34–39.

| Bloco | Tasks | Status |
|---|---|---|
| Modelagem | 001 (Patient), 002 (Address), 006 (CPF), 007 (status) | **CONCLUÍDO** |
| Modelagem | 003 (HealthCondition), 004 (médico — checagem via grupo, não via cadastro de profissionais), 005 (equipe — JSON provisório) | **PARCIAL** |
| Backend | 008–016 (CRUD, filtros, paginação) | **CONCLUÍDO** |
| Regras/autorização | 017–022 | **CONCLUÍDO** (020 usa grupo; ver problema P3) |
| Frontend | 023–027 | **CONCLUÍDO** (com ressalvas §8) |
| Validações | 028–031 | **PARCIAL** (031: equipe não validada por não ser obrigatória) |
| Auditoria | 032 | **PARCIAL** (log mínimo; auditoria completa pendente) |
| Testes | 033–036 (backend) | **A VALIDAR** (63 testes existem, não executados nesta etapa) |

### 4. Evidências do backend

- **Models** (`patients/models.py`): `Patient` (12 campos de negócio + timestamps; `ordering=["full_name"]`), `PatientAddress` (1:1 `CASCADE`, `region` livre), `HealthCondition` (mínima, `name`), `PatientAuditLog` (`SET_NULL` no actor), `PatientStatus`/`PatientAuditAction` (TextChoices). `NeedType` foi removida deste app pela TASK-CAD-PAC-045 e agora pertence a `assessments`.
- **Migrations**: 6 (`0001_initial` … `0006_healthcondition_name`), inclui `0002_patient_responsible_team` e `0003_patientauditlog`.
- **Serializers** (`serializers.py`): `PatientSerializer` com endereço aninhado; `validate()` distingue create (obrigatórios acumulados numa única 400) × update (bloqueio `GERENTE_ONLY_FIELDS` → 403); `status`/`created_at`/`updated_at` read-only; `create()` transacional implícito (patient + address); `update()` com `update_or_create` do endereço.
- **Views/endpoints** (`views.py`, `urls.py`):
  - `POST /api/pacientes/` — gerente + `pacientes.create`
  - `GET /api/pacientes/` — listagem, filtros `nome/cpf/status/regiao`, paginação 20, default ativos
  - `GET/PUT/PATCH /api/pacientes/<id>/` — `IsCareTeam` + `pacientes.view` / `pacientes.update_clinical`
  - `POST /api/pacientes/<id>/inativar|reativar/` — gerente, idempotentes, buscam fora do filtro de ativos
  - `GET/POST /api/condicoes-saude/` — listagem equipe clínica, criação só gerente
  - Apoia: `GET /api/medicos/` (`accounts/views.py:156-176`, gerente + `medicos.view`) para o select de médico.
- **Services**: **não há** `patients/services.py` — regras distribuídas em serializers/views (padrão observado no inventário). Não é falha por si só; risco de manutenção registrado na etapa técnica.
- **Validações**: `patients/validators.py` reutiliza `accounts.validators.is_valid_cpf`; normalização `normalize_cpf` no `save()` do model e no serializer; `status` inválido → 400.
- **Permissões**: duas camadas (grupo `GERENTE/MEDICO/ENFERMEIRO` + `GranularPermission`), seeds em `accounts/0004` (`pacientes.view/create/update_clinical/update_manager/inactivate/reactivate`); `update_manager` não é usada (P3).
- **Relacionamentos**: `Patient` ← `PatientAssessment` (PROTECT), `CarePlan` (PROTECT), `CareScale` (PROTECT); `responsible_doctor` → `User` (PROTECT); `health_condition` → `HealthCondition` (PROTECT).
- **Auditoria**: `patients/audit.py` (ponto único de escrita, sem signals), chamado em `perform_create/perform_update/_set_status`; ações dedicadas `DOCTOR_TEAM_CHANGE` com diff before/after; `admin.py` com `PatientAuditLogAdmin` read-only.
- **Testes**: 63 `test_*` (`tests.py` 59 + `tests_health_conditions.py` 4) cobrindo modelo, criação (permissões, obrigatórios, CPF), listagem (filtros, paginação, 400), detalhe/edição (matriz médico/enfermeiro/gerente), status actions, auditoria. **Não executados nesta etapa → A VALIDAR.**

### 5. Evidências do frontend

- **Páginas**: `PatientsList.tsx` (249 l.), `PatientForm.tsx` (516 l., `mode="create"|"edit"`), `PatientDetail.tsx` (227 l.); lib `src/lib/patients.ts` (166 l.).
- **Listagem**: filtros nome, CPF (com máscara), região, status (ativo/inativo/todos); paginação anterior/próxima com `PAGE_SIZE = 20` e contagem `count`; botão "+ Adicionar Paciente" condicionado a `isGerente(user?.groups)`; estados de loading/erro/vazio.
- **Formulário de cadastro**: todos os campos do RF-PAC-001 exceto status; `required` no HTML para create; erros por campo via `parseFieldErrors`; select de condição de saúde com **criação inline** (só gerente, `POST /api/condicoes-saude/`); select de médico via `GET /api/medicos/` (só gerente carrega); sexo com 3 opções fixas (`PatientForm.tsx:43`); equipe = texto livre provisório; endereço com todos os campos.
- **Formulário de edição**: não-gerente **não envia** `responsible_doctor`/`responsible_team` (comentário `PatientForm.tsx:220`) e os campos aparecem `disabled` com tooltip; gerente envia ambos. Backend reforça com 403.
- **Detalhe**: dados pessoais + endereço + atalhos para avaliação/plano (conforme permissão); **ações de status (inativar/reativar) somente para gerente**, com `window.confirm` e estado de erro próprio.
- **Rotas/guardas** (`App.tsx`): `/pacientes/novo` atrás de `RequireGerente`; `/pacientes/:id/editar` **sem** guarda de gerente (correto — médico/enfermeiro editam); listagem/detalhe atrás de `RequireAuth`. Menu lateral `AppLayout` exibe "Pacientes" para **todo usuário autenticado** (visibilidade não usa permissão granular — ver P6).
- **Integração API**: `lib/api.ts` com `credentials:"include"` + refresh silencioso; módulo `patients.ts` espelha os endpoints (list/create/get/update/inativar/reativar/medicos/condicoes-saude). Fluxo conectado: cria → navega para detalhe → edita → inativa/reativa, tudo via endpoints reais.
- **Validações**: apenas máscara de CPF e `required` do HTML; sem validação client-side de dígitos verificadores (o backend rejeita e o erro é exibido).
- **Testes**: **nenhum** para pacientes (`tests/` só tem `carePlans`, `careScales`) → P7.

### 6. Entidades e relacionamentos

```
accounts.User (grupo MEDICO) ──FK PROTECT──► Patient.responsible_doctor
HealthCondition ──FK PROTECT──► Patient.health_condition   (1 condição p/ paciente; múltiplas = pendência)
Patient ──1:1 CASCADE──► PatientAddress                    (endereço único; region = campo livre)
Patient ◄──FK PROTECT── PatientAssessment (avaliação)
Patient ◄──FK PROTECT── CarePlan
Patient ◄──FK PROTECT── CareScale
Patient ──FK CASCADE── PatientAuditLog ◄──SET_NULL── accounts.User (actor)
Patient.responsible_team = JSONField provisório  (sem entidade Equipe — pendência)
```

Conforme doc-mãe §4.4: `email`/`photo` previstos no modelo conceitual mas **não** definidos nas decisões → corretamente ausentes (pendência). Doc-mãe usa `responsible_professional_id` único; código reflete a separação posterior médico×equipe (decisão registrada em TASK-CAD-PAC-001) — divergência de nomenclatura documental, código coerente com a decisão mais recente.

### 7. Regras implementadas e pendentes

**Implementadas**: RN-001, 003, 004 (armazenamento), 006, 008, 010–014, 016–024 (ver §3.1).

**Pendências de definição (herdadas do doc §12 — não resolvidas por inferência, corretamente)**:
1. Atualização automática da idade; 2. valores permitidos de sexo; 3. múltiplas doenças/estado de saúde; 4. estrutura de `HealthCondition`; 5. campos editáveis pela clínica além de médico/equipe; 6. granularidade de visualização da equipe; 7. estrutura da entidade Equipe; 8. regra bairro→região; 9. e-mail/foto nesta versão; 10. regras de auditoria específicas.

**Pendências novas identificadas nesta auditoria**: ver §9 (decisões pendentes D1–D4).

### 8. Problemas encontrados

| # | Problema | Tipo | Evidência |
|---|---|---|---|
| P1 | **Equipe responsável não é obrigatória** no cadastro, divergindo de RN-CAD-PAC-002/RF-PAC-002 (docs listam como obrigatória) | Divergência doc×código | `serializers.py:94-101` não checa `responsible_team`; `PatientForm.tsx` sem `required` no campo |
| P2 | **Status** listado como campo de entrada obrigatório nas docs, implementado como estado gerenciado (`read-only`, default ACTIVE, alterável só por actions) | Divergência doc×código (ambiguidade do doc) | `serializers.py:73`; docs RF-PAC-001/002 |
| P3 | Permissão granular **`pacientes.update_manager` existe mas nunca é verificada** — a restrição médico/equipe usa grupo `GERENTE` no serializer, violando o padrão de duas camadas usado nas demais operações | Regra ausente/inconsistência | `accounts/0004_seed_permissions_backfill.py:17` vs `serializers.py:31-37,102-108` (único uso de `_is_gerente` por grupo) |
| P4 | Frontend **fixa valores de sexo** ("Masculino", "Feminino", "Prefiro não dizer") sem base documental — a lista de valores é pendência declarada (RN §9); backend aceita qualquer texto ≤50 | Decisão antecipada no código | `PatientForm.tsx:43`; `models.py:109` |
| P5 | `PatientDetail` exibe **IDs** ("Médico responsável (id)", "Condição de saúde (id)") em vez dos nomes — visualização parcial do RF-PAC-012 | Funcionalidade incompleta | `PatientDetail.tsx:142-159` (select de médicos só é carregado pelo gerente no form; o detalhe não resolve nomes) |
| P6 | Menu lateral "Pacientes" visível a **qualquer autenticado**, inclusive perfis sem `pacientes.view` (ex.: categoria Apoio) → acessa e recebe 403 na listagem | Controle de acesso/UX | `AppLayout.tsx:94` (sem checagem de permissão) |
| P7 | **Zero testes de frontend** para o processo (listagem, filtros, formulário, ações de status) | Falta de testes | `frontend/.../tests/` só carePlans/careScales |
| P8 | `NeedType` estava modelada no app `patients` sendo de outro processo | Modelagem/escopo — **resolvido pela TASK-CAD-PAC-045** | Movida para `assessments`, preservando tabela, IDs e FKs |
| P9 | Sem validação de coerência `idade × data de nascimento` (o frontend aceita valores divergentes) | Regra ausente — **depende da pendência #1** (não é bug até a regra ser definida) | `PatientForm.tsx:334-343` |
| P10 | Testes backend **não executados** nesta etapa → toda validação de execução fica `A VALIDAR` | Validação | Decisão do usuário (somente leitura) |
| P11 | Frontend não valida dígitos verificadores do CPF antes do envio (só máscara); depende do 400 do backend | Menor | `lib/cpf.ts` |

**Não são problemas (confirmados corretos)**: exclusão física ausente (RN §10 — `http_method_names` exclui `delete`); e-mail/foto ausentes (pendência); idade não automática (pendência); bloqueio médico/equipe reforçado no backend e não só na UI (TASK-CAD-PAC-020 exige backend); inativos acessíveis para edição/reativação fora do filtro default.

### 9. Decisões pendentes

As decisões D1–D4 foram resolvidas na implementação de 22/11/2026:
- **D1 — TASK-CAD-PAC-037:** equipe opcional; RN/RF alinhadas ao código.
- **D2 — TASK-CAD-PAC-041:** status inicial Ativo, gerenciado pelo sistema; RN/RF alinhadas.
- **D3 — TASK-CAD-PAC-038:** `pacientes.update_manager` exigida junto ao grupo GERENTE.
- **D4 — TASK-CAD-PAC-040:** Masculino, Feminino e Prefiro não dizer; valores legados são preservados durante edição.

### 10. Dependências com outros processos

- **Avaliação inicial** (`assessments`): `PatientAssessment.FK → Patient` (PROTECT); criação de avaliação exige paciente; detalhe do paciente oferece atalhos (ver/nova avaliação) condicionados a permissão. **Dependência satisfeita** (paciente é pré-requisito do fluxo).
- **Plano de cuidados** (`care_plans`): `CarePlan.FK → Patient` (PROTECT) + atalho no detalhe. Satisfeita.
- **Escala** (`care_scales`): `CareScale.FK → Patient` (PROTECT) + rotas `/pacientes/:patientId/escalas`. Satisfeita tecnicamente; regras de efeito da inativação sobre escala **pendentes** (RN-015).
- **Usuários/médicos** (`accounts`): criação depende de usuários no grupo MEDICO existentes (`GET /api/medicos/`) e das permissões granulares. Satisfeita.
- **Profissionais** (`professionals`, stub): **dependência não implementada** — entidade Equipe não existe; `responsible_team` é JSON provisório bloqueando a RN-009/007 definitiva.
- **Agendamento/visita/atendimento/evolução**: sem código; RN-015 (efeitos da inativação) permanece bloqueada por eles — registrado como pendência, sem regra antecipada (correto).

### 11. Tasks recomendadas

**Concluídas em 22/11/2026:** TASK-CAD-PAC-037 a 045. As descrições numeradas abaixo preservam o backlog da auditoria-base; todas foram implementadas. A suíte `patients` + `accounts` passou (110 testes), assim como os cinco testes frontend de pacientes.

1. **TASK-CAD-PAC-037 — Decidir e implementar obrigatoriedade da equipe responsável** (D1): ou valida no serializer/form, ou corrige RN-002/RF-PAC-002.
2. **TASK-CAD-PAC-038 — Aplicar/remover `pacientes.update_manager`** (D3): troca de médico/equipe passa a checar permissão granular no padrão das demais operações, ou a permissão é removida do catálogo.
3. **TASK-CAD-PAC-039 — Exibir nomes (não IDs) de médico e condição de saúde no detalhe do paciente** (P5): incluir resolução no serializer (ex.: `responsible_doctor` aninhado read-only) e no `PatientDetail`.
4. **TASK-CAD-PAC-040 — Alinhar valores de sexo** (D4): definir lista no doc e sincronizar frontend/backend, preservando registros legados.
5. **TASK-CAD-PAC-041 — Especificar status como entrada ou estado** (D2): decisão + ajuste documental/código.
6. **TASK-CAD-PAC-042 — Testes de frontend do cadastro** (P7): listagem+filtros+paginação, create/edit com permissões, ações de status (node:test, padrão `carePlans.test.mjs`).
7. **TASK-CAD-PAC-043 — Gating de menu por permissão granular** (P6): ocultar "Pacientes" para perfis sem `pacientes.view`.
8. **TASK-CAD-PAC-044 — Executar suíte backend do app `patients`** (P10): `python manage.py test patients accounts --noinput` e registrar resultado (fecha o `A VALIDAR` dos RF/testes).
9. **TASK-CAD-PAC-045 — Mover `NeedType` para app do processo de necessidades** (P8) — concluída com migração de estado não destrutiva.

---
