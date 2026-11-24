# 00 — Memória da Auditoria

> **Fonte oficial de continuidade** entre conversas independentes. Leia este arquivo ANTES de qualquer atividade. Não repita análises já concluídas aqui.
> Regra: toda etapa encerrada atualiza este arquivo (o que foi feito, arquivos analisados/criados, conclusões, pendências, próxima atividade).

---

## 1. Objetivo da auditoria

Auditoria completa (somente leitura) do sistema de gestão de atendimento domiciliar particular (Django + React + MinIO + Docker Compose) para produzir diagnóstico que permita retomar o desenvolvimento com segurança: o que existe, o que está parcial, o que diverge da documentação, o que bloqueia o MVP e em que ordem executar o próximo trabalho.

**Limites**: não alterar código, não implementar, não corrigir, não excluir, não modificar `docs/` original, não inventar regras, não expor credenciais. Alterações somente em `docs/auditoria/`.

## 2. Etapas planejadas

| # | Etapa | Entregável | Status |
|---|---|---|---|
| 1 | Inventário e reconhecimento do projeto | `01_INVENTARIO.md` | **CONCLUÍDA** (17/11/2026) |
| 2 | Auditoria dos processos | `02_AUDITORIA_PROCESSOS.md` | **CONCLUÍDA** (8 de 8 processos, 21/11/2026) |
| 3 | Auditoria técnica | `03_AUDITORIA_TECNICA.md` | **CONCLUÍDA** (21/11/2026) |
| 4 | Auditoria de regras e requisitos | `04_AUDITORIA_REGRAS_E_REQUISITOS.md` | **CONCLUÍDA** (21/11/2026) |
| 5 | Consolidação e backlog geral | `05_BACKLOG_GERAL.md` | **CONCLUÍDA** (21/11/2026) |
| 6 | Plano de execução | `06_PLANO_DE_EXECUCAO.md` | **CONCLUÍDA** (21/11/2026) |

- Etapas concluídas: **1, 2, 3, 4, 5 e 6**.
- Etapas em andamento: nenhuma.
- Etapas não iniciadas: nenhuma das etapas de auditoria e planejamento previstas nesta sequência.

## 3. Processos já analisados

- **Cadastro do paciente — AUDITADO EM PROFUNDIDADE** (18/11/2026, etapa 2). Resultado em `02_01_CADASTRO_DO_PACIENTE.md`: status geral **PARCIAL**; 19/24 RNs CONCLUÍDOS, 1 DIVERGENTE (RN-002), 2 PARCIAIS (RN-005/009), 1 NÃO INICIADO (RN-007), 1 FORA DO MVP (RN-015); problemas P1–P11; decisões pendentes D1–D4; 9 tasks recomendadas (037–045).
- **Avaliação inicial — AUDITADA EM PROFUNDIDADE** (18/11/2026, etapa 2). Resultado em `02_02_AVALIACAO_INICIAL.md`: status geral **PARCIAL**; RN-AVL: 19 itens (17 RNs + §8/§9) → 15 CONCLUÍDOS, 3 PARCIAIS (RN-002/003/005), 1 DIVERGENTE (RN-008: gerente não altera responsável na UI); RF-AVL: 16 CONCLUÍDOS, 3 PARCIAIS (002/012/019), 1 DIVERGENTE (006); fluxo conectado frontend↔backend; 86 testes backend (**não executados** → A VALIDAR), **zero testes frontend**; problemas PA-1–PA-14; decisões DA-1–DA-6; 11 tasks recomendadas (TASK-AVL-FE-008…DOC-001).
- **Necessidades identificadas — AUDITADA EM PROFUNDIDADE** (18/11/2026, etapa 2). Resultado em `02_03_NECESSIDADES_IDENTIFICADAS.md`: status geral **PARCIAL**; RN-NEC (18 itens, §2–§11 sem IDs formais → convenção `RN-NEC §n`) → 16 CONCLUÍDOS, 1 PARCIAL (§3 exclusão), 1 DIVERGENTE (§5 administração de tipos); RF-NEC-001…021 → 17 CONCLUÍDOS, 3 PARCIAIS (010/014/018), 1 DIVERGENTE (013); **página `/tipos` inoperante** (chama `/api/tipos/` inexistente) + backend sem criar/editar tipos + rota só Gerente; ~46 testes backend (**não executados** → A VALIDAR), **zero testes frontend**; problemas PN-1–PN-11; decisões DN-1–DN-5; 10 tasks recomendadas (TASK-NEC-001…010).
- **Plano de Cuidados — AUDITADO EM PROFUNDIDADE** (18/11/2026, etapa 2). Resultado em `02_04_PLANO_DE_CUIDADOS.md`: status geral **PARCIAL** (processo mais alinhado dos quatro; **nenhuma divergência RN×código**); RN-PLC (28 itens, §2–§10 sem IDs → convenção `RN-PLC §n`) → 26 CONCLUÍDOS, 1 PARCIAL (§4.1 remoção da última necessidade), 1 NÃO INICIADO (§3.1 plano obrigatório); RF01–RF14 → 13 CONCLUÍDOS, 1 PARCIAL (RF05 exibição de criação/atualização); fluxo conectado frontend↔backend com gating idêntico (`canPlan` × seed `accounts/0010`), sem página quebrada; **56 testes backend (17 arquivos) + 3 testes frontend não executados** → A VALIDAR; casos-limite não definidos nos docs (plano encerrado editável, `end_date<start_date`, profissional inativo, última necessidade); doc-mãe §7/§15 desatualizado; problemas PC-1–PC-11; decisões DPC-1–DPC-7; 11 tasks recomendadas (TASK-PLC-001…011).
- **Escala — AUDITADA EM PROFUNDIDADE** (18/11/2026, etapa 2). Resultado em `02_05_ESCALA.md`: status geral **PARCIAL**; **RN-ESC-01…027 (IDs formais — inventário §8.2 desatualizado)** → 26 CONCLUÍDOS, 1 PARCIAL (RN-ESC-25: bloqueio de agendamento em escala encerrada sem consumidor — contrato `scheduling_requirement` pronto mas Agendamento inexistente); RF-ESC-01…024 → 23 CONCLUÍDOS, 1 PARCIAL (RF-ESC-22, idem); **nenhuma DIVERGENTE nem NÃO INICIADO**; fluxo conectado frontend↔backend com gating idêntico (`canScale` × `has_scale_permission` × seed `accounts/0011`, só Gerente) e menu próprio via `/acesso/` (resolve PA-14/PC-9); **37 testes backend (28 arquivos) + 2 casos frontend + 1 e2e Playwright não executados** → A VALIDAR; problemas P-ESC-1–12 (rota órfã `/pacientes/:id/escalas`, doc-mãe/tasks stale, escala sobre plano não-ativo, exclusão livre em qualquer status, observação sem frequência, `canScale` sem superusuário, ações crus no histórico, `planos` sem filtro); decisões D-ESC-1–7; 11 tasks recomendadas (TASK-ESC-001…011).
- **Usuários — AUDITADO EM PROFUNDIDADE** (21/11/2026, etapa 2). Resultado em `02_06_USUARIOS.md`: status geral **PARCIAL**; docs sem IDs formais referenciados por seção; API e frontend conectados para contas, categorias, profissões e permissões; recuperação de senha não iniciada; Profissional segue stub; problemas P-USU-1…P-USU-8; decisões D-USU-1…D-USU-5; 8 tasks internas recomendadas. Testes não executados → A VALIDAR.
- **Agendamento — AUDITADO EM PROFUNDIDADE** (21/11/2026, etapa 2). Resultado em `02_07_AGENDAMENTO.md`: status **NÃO INICIADO**; RN-AGE-01…38 e RF-AGE-01…36 sem implementação correspondente; contrato `care_scales.scheduling_requirement` é preparação parcial sem consumidor; disponibilidade estruturada, geração de ocorrências, conflitos, status, histórico e UI ausentes; P-AGE-1…7; decisões D-AGE-1…9; 9 tasks internas recomendadas. Testes não executados; contrato da Escala não valida o processo.
- **Visita domiciliar — AUDITADA EM PROFUNDIDADE** (21/11/2026, etapa 2). Resultado em `02_08_VISITA_DOMICILIAR.md`: status **NÃO INICIADO**; sem app, modelos, API, serviços ou interface; RN-VIS-01…40 e RF-VIS-01…35 sem implementação. `RF-VIS §11` afirma que `visits` já foi definido no Agendamento, em divergência com o doc-mãe e a ausência de modelo/migration; Registro do Atendimento é dependência inexistente. P-VIS-1…6; decisões D-VIS-1…7; 7 tasks internas recomendadas. Testes não executados.
- Etapa 2: **8 de 8 processos auditados**. Nenhum processo restante nesta etapa.
- **Etapa 3 — Auditoria técnica (21/11/2026): CONCLUÍDA.** Entregável `03_AUDITORIA_TECNICA.md`. Inspeção estática do backend Django/DRF, frontend React, modelos/migrations, autenticação/autorização, MinIO, Compose e integrações. Achados: AT-01 proteção CSRF ausente no JWT por cookie; AT-02 defaults de desenvolvimento/credenciais MinIO no Compose; AT-03 volume SQLite montado em caminho distinto do arquivo efetivo; AT-04 MinIO configurado sem fluxo de arquivo e bucket manual; AT-05 configuração local fixa entre frontend/API; AT-06 tratamento amplo de falhas no refresh; AT-07 erros frontend locais centrados em `detail`; AT-08 testes frontend sem comando/dependência claramente declarados e sem CI; AT-09 consistência migrations/models a validar; AT-10 SQLite como único banco configurado; AT-11/12 variação de separação de responsabilidades e crescimento frontend; AT-13 defaults de ambiente. Sem achado crítico confirmado. Recomendações AT-14…20. Não foram executados testes, builds, checks, containers ou chamadas de integração; conclusão de runtime permanece pendente. Segredos, `.env`, `.env.docker`, `acessos.md` e banco não foram abertos. O pedido referiu `00_CONTEXTO_E_CONTINUIDADE.md`, ausente; esta memória continua sendo a fonte oficial de continuidade.
- **Etapa 4 — Auditoria de regras e requisitos (21/11/2026): CONCLUÍDA.** Entregável `04_AUDITORIA_REGRAS_E_REQUISITOS.md`; novo `00_CONTEXTO_E_CONTINUIDADE.md` criado em `docs/auditoria/`. Cruzamento das oito famílias de regras/requisitos com fontes originais, auditoria de processos, backend, frontend, permissões e testes encontrados. Seis processos têm implementação parcial; Agendamento e Visita não iniciados. Principais divergências: obrigatórios do Cadastro, troca de responsável da Avaliação sem ação de UI, administração de tipos de Necessidade sem endpoint funcional, casos de borda do Plano, consumidor ausente para o contrato de Agendamento da Escala e RF-VIS §11 pressupondo entidade `visits` inexistente. Regras/requisitos sem IDs formais em Necessidades, Plano e Usuários limitam rastreabilidade; decisões pendentes estão referenciadas aos P*/D* do Processo 2. Nenhum teste foi executado; evidência de teste permanece A VALIDAR. Documentos originais não foram alterados.

## 4. Arquivos já examinados (etapa 1)

- Estrutura completa do repositório (árvore de pastas e arquivos, excluindo `node_modules/venv/.git/__pycache__/dist`).
- `backend/.../sistema_home_care/settings.py`, `urls.py`, `backend/requirements.txt`, `backend/Dockerfile`.
- `docker-compose.yml`, `.env.docker.example` (exemplo), `frontend/.../Dockerfile`, `vite.config.ts`, `package.json`, `README.md`.
- `*/urls.py` e `*/urls_users.py` (endpoints), `*/models.py`, `*/views*.py`, `*/serializers*.py`, `*/permissions.py`, `*/services.py` (listagem de classes/funções — sem leitura linha a linha).
- `src/App.tsx` (rotas), `src/lib/api.ts`, `src/components/AppLayout.tsx` (menu), `src/contexts/` (estrutura).
- `docs/` — cabeçalhos/títulos e contagens de IDs de todos os 30 arquivos; leitura parcial de `execucao_tasks_a_fazer.md`, `execucao_tasks_rubens.md`, `tasks_escala.md`.
- `git log/status/branch` (histórico e branches remotas).
- `acessos.md`: **contém credenciais de demonstração (CPF + senha). Conteúdo NÃO exposto, NÃO será lido novamente.**
- `.env` e `.env.docker`: **não abertos** (só confirmada a existência).

## 4.1 Arquivos examinados (etapa 2 — processo Cadastro do Paciente)

- Docs: `regras_negocio_cadastro_paciente.md`, `requisitos_funcionais_cadastro_paciente.md`, `tasks_cadastro_paciente.md` (integrais); `Processos e Modelo de Dados.md` §4, §10, §11, §15; `execucao_tasks_*.md` (grep — sem conteúdo específico deste processo); `AGENTS.md` (decisões TA-5/7/10… já conhecidas).
- Backend `patients/`: `models.py`, `serializers.py`, `views.py`, `urls.py`, `validators.py`, `audit.py`, `admin.py`, `tests.py`, `tests_health_conditions.py` (integrais); `accounts/permissions.py`, `accounts/migrations/0004_seed_permissions_backfill.py`, trecho de `accounts/views.py` (`MedicoListView`), grep de `accounts/validators.py` e `accounts/services.py`.
- Frontend: `PatientsList.tsx`, `PatientForm.tsx`, `PatientDetail.tsx`, `lib/patients.ts`, `lib/cpf.ts`, `App.tsx`, `components/RequireGerente.tsx`, trecho de `AppLayout.tsx`.
- **NÃO executado**: nenhum teste (decisão do usuário: somente leitura) → validação de execução = `A VALIDAR`.

## 4.2 Arquivos examinados (etapa 2 — processo Avaliação Inicial)

- Docs: `regras_negocio_avaliacao_inicial.md`, `requisitos_funcionais_avaliacao_inicial.md`, `tasks_avaliacao_inicial.md` (integrais); `Processos e Modelo de Dados.md` §5, §8, §9, §10, §11 (bloco Avaliação), §15; `AGENTS.md` (seção "Key Details" — Avaliação Inicial); grep em `docs/tasks/execucao_tasks_*.md` (sem conteúdo específico deste processo; `TA-40…64` só em `tasks_avaliacao_inicial.md` e comentários de código).
- Backend `assessments/`: `models.py`, `serializers.py`, `views.py`, `urls.py`, `permissions.py`, `admin.py`, 5 arquivos de teste (contagem de `test_*` — sem leitura integral dos testes); `accounts/migrations/0005…0009` (seeds de permissões); `accounts/permissions.py` (integral); trechos de `accounts/views.py` (`MedicoListView`, `ClinicoListView`), `patients/views.py` (`NeedTypeCatalogViewSet`, `NeedTypeStatusView`), `care_plans/models.py`/`views.py`/`services.py` (FK `CareNeed` e filtro `IDENTIFIED` — integração RF-AVL-018).
- Frontend: `AssessmentForm.tsx`, `AssessmentDetail.tsx`, `AssessmentsHistory.tsx`, `components/NeedEditForm.tsx`, `lib/assessments.ts` (integrais); `App.tsx`, `components/AppLayout.tsx`, trecho de `pages/PatientDetail.tsx` (atalhos de avaliação); listagem de `tests/` do frontend (confirmado: nenhum teste de avaliação).
- **NÃO executado**: nenhum teste (decisão do usuário: somente leitura) → validação de execução = `A VALIDAR`.

## 4.3 Arquivos examinados (etapa 2 — processo Necessidades Identificadas)

- Docs: `regras_negocio_necessidades_identificadas.md`, `requisitos_funcionais_necessidades_identificadas.md` (RF-NEC-001…021), `tasks_necessidades_identificadas.md` (integrais); `Processos e Modelo de Dados.md` §6, §8, §9.3, §10, §11, §15; `AGENTS.md` (herança `NeedType`).
- Backend `assessments/`: `permissions.py` (integral — matriz `NEED_ACTIONS`), `views.py` (`CareNeedViewSet` + `criar_necessidade`), `serializers.py`, `models.py`, `urls.py`, `admin.py` (integrais); greps de teste (`tests_needs_api`, `tests_need_permissions`, `tests_need_inactivation`, `tests_api`, `tests.py` — contagem de `test_*`, sem leitura integral).
- Backend `patients/`: `models.py` (`NeedType` + `INITIAL_NEED_TYPES`), `views.py` (`NeedTypeCatalogViewSet`, `NeedTypeStatusView`), `urls.py`, `serializers.py` (`NeedTypeCatalogSerializer`), `migrations/0004-0005`, `tests.py` (contagem `NeedTypeModelTests`/`NeedTypeStatusAPITests`).
- Backend `accounts/migrations/0006…0009` (seeds de permissões de necessidades/tipos).
- Frontend: `pages/NeedTypes.tsx` (integral), `pages/AssessmentDetail.tsx` (integral), `pages/AssessmentForm.tsx` (seção de necessidades + gating), `components/NeedEditForm.tsx` (integral), `lib/assessments.ts` (integral), `App.tsx` (rotas), `components/AppLayout.tsx` (menu — confirmado: **sem item de tipos**).
- **NÃO executado**: nenhum teste (decisão do usuário: somente leitura) → validação de execução = `A VALIDAR`.

## 4.4 Arquivos examinados (etapa 2 — processo Plano de Cuidados)

- Docs: `regras_negocio_plano_cuidados.md`, `requisitos_funcionais_plano_cuidados.md` (RF01–14), `tasks_plano_cuidados.md` (integrais — confirmado: **sem checkboxes e sem IDs**); `Processos e Modelo de Dados.md` §7, §8, §9.2, §9.4, §10, §11 (bloco Plano), §12, §14, §15; `execucao_tasks_rubens.md` (integral — contrato do plano, matriz, validação declarada) e `execucao_tasks_a_fazer.md` §Decisões de domínio (escala × plano); `AGENTS.md` (sem seção específica).
- Backend `care_plans/`: `models.py`, `serializers.py`, `views.py`, `urls.py`, `permissions.py`, `services.py`, `contracts.py`, `admin.py` (integrais); `accounts/migrations/0010_seed_care_plan_permissions.py`; contagem de `test_*` em todos os 17 arquivos de teste (56 métodos) + leitura integral de `tests_configuration.py`; greps em `tests_removal.py`/`tests*` (casos-limite "última necessidade" — inexistente) e em `care_scales` (FKs `CarePlan/CarePlanNeed`, `tests_plan_consistency.py`).
- Frontend: `pages/CarePlans.tsx`, `pages/CarePlanDetail.tsx`, `components/PlanNeedConfiguration.tsx`, `components/PlanNeedRemoval.tsx`, `lib/carePlans.ts` (integrais); `App.tsx` (integral); greps em `AppLayout.tsx` (confirmado: **sem item de menu de planos**), `PatientDetail.tsx` (atalho `:208`); `tests/carePlans.test.mjs` (3 casos via grep).
- **NÃO executado**: nenhum teste (decisão do usuário: somente leitura) → validação de execução = `A VALIDAR`.

## 4.5 Arquivos examinados (etapa 2 — processo Escala)

- Docs: `regras_negocio_escala.md` (27 RNs com IDs formais), `requisitos_funcionais_escala.md` (RF-ESC-01…024), `tasks_escala.md` (35 itens, 100% desmarcados) (integrais); `Processos e Modelo de Dados.md` §3, §8, §9.4, §10, §11 (bloco "Escala e agendamento"), §14, §15; `execucao_tasks_a_fazer.md` (integral — TA-120…154/PRs #43–#77, §Decisões de domínio, §Validação); grep de `execucao_tasks_rubens.md` (linha 44 — menção a escala só no contexto do plano); `AGENTS.md` (sem seção de escala).
- Backend `care_scales/`: `models.py`, `services.py`, `views.py`, `serializers.py`, `permissions.py`, `planning.py`, `contracts.py`, `audit.py`, `urls.py`, `admin.py` (integrais); `migrations/0001…0005` (listagem); `accounts/migrations/0011_seed_scale_permissions.py` (integral); greps de teste em 28 arquivos `tests*.py` (contagem de `test_*` = 37 + leitura integral de `tests_authorization.py`, `tests_scheduling_contract.py` e listagem de nomes de todos os métodos); `test_support.py` (fixture, referência).
- Backend `care_plans/`: `models.py` (linhas 1–50: `CarePlanStatus` DRAFT/ACTIVE/CLOSED, `need_links`), `services.py:114-116` (bloqueio de remoção com necessidade em escala); `professionals/models.py` (integral — stub `Professional` com `user` nullable).
- Frontend: `pages/CareScales.tsx`, `pages/CareScaleDetail.tsx`, `components/ScaleNeedManagement.tsx`, `lib/careScales.ts` (integrais); `App.tsx` (rotas de escala), `components/AppLayout.tsx` (gating do menu via `scaleAccess`), `pages/Home.tsx` (trecho do card de escalas); greps em `PatientDetail.tsx` (confirmado: **sem atalho de escala**); `tests/careScales.test.mjs` (integral) e `tests/careScales.browser.mjs` (integral — roteiro e2e).
- **NÃO executado**: nenhum teste (decisão do usuário: somente leitura) → validação de execução = `A VALIDAR`.

## 5. Documentos criados/atualizados

- `docs/auditoria/01_INVENTARIO.md` — criado em 17/11/2026 (etapa 1).
- `docs/auditoria/00_AUDITORIA_MEMORIA.md` — este arquivo.
- `docs/auditoria/02_AUDITORIA_PROCESSOS.md` — **criado em 18/11/2026** com a seção do processo "Cadastro do Paciente"; **atualizado em 18/11/2026** com a seção "Processo 2 — Avaliação Inicial" (etapa 2, 2º processo; o 1º foi renomeado para "Processo 1"); **atualizado em 18/11/2026** com a seção "Processo 3 — Necessidades Identificadas"; **atualizado em 18/11/2026** com a seção "Processo 4 — Plano de Cuidados"; **atualizado em 18/11/2026** com a seção "Processo 5 — Escala".
- `docs/auditoria/02_AUDITORIA_PROCESSOS.md` — atualizado em 21/11/2026 com "Processo 6 — Usuários" e "Processo 7 — Agendamento".
- `docs/auditoria/03_AUDITORIA_TECNICA.md` — criado em 21/11/2026 (etapa 3).
- **NÃO criado ainda**: `05`, `06`, `07`.
- Etapa 4: criado `docs/auditoria/00_CONTEXTO_E_CONTINUIDADE.md`, conforme pedido; esta memória permanece com o registro histórico completo e sincronizado.

## 4.6 Arquivos examinados (etapa 2 — processo Usuários)

- Docs: `regras_usuarios.md`, `requisitos_usuarios.md`, `tasks_usuarios.md`, `Processos e Modelo de Dados.md` (ausência de processo Usuários/entidades), `AGENTS.md` (Auth/Users e recuperação adiada), memória e inventário.
- Backend: `accounts/models.py`, `services.py`, `serializers_users.py`, `views_users.py`, `permissions.py`, `urls_users.py`, `admin.py`, `tests_users.py`, migrations accounts `0001–0011`; `professionals/models.py` e migration `0001`; relações protegidas dos módulos clínicos/escalas identificadas por busca.
- Frontend: `App.tsx`, `AppLayout.tsx`, `RequireGerente.tsx`, páginas `UsersList`, `UserForm`, `UserDetail`, `Categories`, `Professions`, e `lib/users.ts`.
- **NÃO executado**: nenhum teste, conforme decisão da auditoria; validação de execução fica `A VALIDAR`.

## 4.7 Arquivos examinados (etapa 2 — processo Agendamento)

- Docs: `regras_negocio_agendamento.md` (38 RNs), `requisitos_funcionais_agendamento.md` (36 RFs), `tasks_agendamento.md`; `Processos e Modelo de Dados.md` §3, §8, §9.3–9.4, §10–11, §14–15; memória e inventário.
- Backend: `settings.py`, `sistema_home_care/urls.py`; busca por app/model/migration/serializer/view/service/testes de agendamento/visita; `care_scales/contracts.py`, `care_scales/models.py` e ocorrências de testes de scheduling.
- Frontend: `App.tsx` e busca em `src/` por telas/rotas/clientes/testes de agendamento/visita.
- **NÃO executado**: nenhum teste, conforme decisão vigente; itens dependentes de execução permanecem `A VALIDAR`.

## 4.8 Arquivos examinados (etapa 2 — processo Visita domiciliar)

- Docs integrais: `regras_negocio_visita_domiciliar.md`, `requisitos_funcionais_visita_domiciliar.md`, `tasks_visita_domiciliar.md`; busca no doc-mãe `Processos e Modelo de Dados.md` sobre fluxo, limites, pendências, entidades e visitas; seção Agendamento já auditada em `02_AUDITORIA_PROCESSOS.md`.
- Código: busca por `visit|visita|atendimento` em `backend/sistema_home_care` e `frontend/sistema-home-care/src`; conferência do contrato `care_scales/contracts.py` e das rotas/apps já inventariadas. Não foram encontrados componentes de Visita/Atendimento.
- Não foram relidos os processos 1–7 nem arquivos sensíveis `.env`, `.env.docker` ou `acessos.md`.
- **NÃO executado**: testes backend/frontend, conforme decisão registrada; execução é `A VALIDAR`.

## 6. Principais conclusões consolidadas (etapa 1 — não repetir)

1. Arquitetura: Django 5.2 + DRF (apps `accounts`, `patients`, `professionals`, `assessments`, `care_plans`, `care_scales`), React 19 + Vite 8, SQLite, MinIO via django-storages, Compose com 3 serviços.
2. Auth JWT em cookies HttpOnly com refresh silencioso; autorização em 2 camadas (Groups + `GranularPermission`).
3. **~283 testes backend** em 34 arquivos (accounts/patients/assessments/care_plans/care_scales) e **3 arquivos de teste frontend** (node:test + Playwright). **Não executados nesta etapa** → validação `A VALIDAR`.
4. **MinIO configurado mas sem nenhum uso efetivo** (sem FileField/FormData no código).
5. Módulos **agendamento** e **visita domiciliar**: apenas docs (novos, não commitados), zero código.
6. Frontend sem rotas para agendamento/visita; sem lib de formulário/estado global além de Context.
7. Sem CI (`.github/workflows` ausente), sem script `test` no `package.json`.
8. `tasks_escala.md` está 100% desmarcada embora a escala esteja implementada e testada → **checkboxes das tasks não são evidência**.
9. Divergências técnicas iniciais a investigar: volume `db_data` aponta para `.../db` mas o SQLite está em `.../db.sqlite3`; `DEFAULT_FILE_STORAGE` (chave legada Django ≥4.2); `DEBUG=True` hardcoded; `ALLOWED_HOSTS=[]`; sem settings de produção; Playwright não declarado em devDependencies.
10. IDs formais de regra: apenas `RN-CAD-PAC-*` (24) e vários `RF-*` (alguns docs sem IDs) → matriz de rastreabilidade precisará de identificadores internos estáveis, declarados explicitamente. **Correção (18/11/2026, Processo 5)**: `regras_negocio_escala.md` também tem IDs formais (`RN-ESC-01…27`) — inventário §8.2 desatualizado; processos 2–4 continuam sem IDs (`§n`).

## 6.1 Conclusões da etapa 2 — Cadastro do Paciente (18/11/2026 — não repetir)

1. Fluxo **conectado frontend↔backend** (criar→listar→ver→editar→inativar/reativar) com endpoints reais e guardas corretas (`RequireGerente` só em `/pacientes/novo`; edição liberada à equipe clínica).
2. Status geral **PARCIAL**: matriz de permissões e CRUD majoritariamente **CONCLUÍDOS**; divergências pontuais — equipe não obrigatória (P1), status não é campo de entrada (P2), permissão `pacientes.update_manager` **criada e nunca usada** (P3), sexo fixado no frontend sem doc (P4), detalhe exibe IDs em vez de nomes (P5).
3. `patients` tem **63 testes backend** (não executados → `A VALIDAR`) e **zero testes frontend** (P7).
4. `NeedType` (outro processo) está modelada no app `patients` (P8).
5. Pendências do doc §12 foram respeitadas — nenhuma regra antecipada por inferência no código auditado; novas decisões D1–D4 registradas sem solução inventada.
6. Atualização em 22/11/2026: TASK-CAD-PAC-037…045 implementadas; detalhes e validações em `02_01_CADASTRO_DO_PACIENTE.md`. `NeedType` foi movida para `assessments`, preservando `need_types`.

## 6.2 Conclusões da etapa 2 — Avaliação Inicial (18/11/2026 — não repetir)

1. Fluxo **conectado frontend↔backend** (histórico → nova avaliação → detalhe → editar → necessidades → recursos) com endpoints reais; guardas de rota só `RequireAuth`, controle de acesso dentro das páginas + backend.
2. Status geral **PARCIAL**: 15/19 RNs+seções CONCLUÍDOS; 3 PARCIAIS (RN-002 gating frontend do gerente, RN-003 obrigatórios só no create, RN-005 exibição do responsável); **1 DIVERGENTE (RN-008)** — gerente não altera o profissional responsável na UI (select `disabled`), embora backend, RF-AVL-006 e `AGENTS.md` permitam.
3. **86 testes backend** no app `assessments` (não executados → `A VALIDAR`) e **zero testes frontend** (PA-8/PA-9).
4. Integração com plano de cuidados **comprovada** (`CarePlanNeed.care_need` PROTECT + filtro `IDENTIFIED`/ativo/mesmo paciente) — RF-AVL-018 CONCLUÍDO; efeito colateral: exclusão de necessidade vinculada a plano → `ProtectedError` não tratado (**500**, PA-5, A VALIDAR).
5. Permissões granulares: `avaliacoes.*` (seed `accounts/0005`, dadas às 3 categorias) + `necessidades.*` (`0006…0009`; `necessidades.create` **não** dada ao Gerente) — origem do PA-1 (frontend usa OR com `avaliacoes.create`, que o Gerente possui).
6. Sem log de auditoria da avaliação (só `CareNeedHistory` de necessidade) — decisão DA-4; cadastro de recursos só via Django admin — DA-5/PA-13.
7. Princípio de não antecipação respeitado: nenhuma regra de escala/agendamento/evolução/reavaliação no app; stubs `Resource`/campos permissivos declarados no próprio código como pendência.
8. 11 tasks recomendadas (TASK-AVL-FE-008…FE-012, BE-009…BE-011, TEST-007/008, DOC-001) listadas no entregável — **não implementadas** (regra da auditoria).

## 6.3 Conclusões da etapa 2 — Necessidades Identificadas (18/11/2026 — não repetir)

1. Fluxo de necessidades **conectado frontend↔backend** (criar na avaliação → detalhe → editar → excluir → inativar → reativar → histórico) com gating fino por permissão em cada botão; a criação usa gating correto (`clinical && necessidades.create && avaliacoes.add_need` — **sem** o OR problemático do PA-1).
2. Status geral **PARCIAL**: RN (18 itens) → 16 CONCLUÍDOS / 1 PARCIAL (exclusão) / 1 DIVERGENTE (administração de tipos); RF-NEC → 17/3/1. O backend é aderente; a **administração de tipos está quebrada no frontend**.
3. **PN-1 (achado principal)**: `NeedTypes.tsx` chama `/api/tipos/` — endpoint **inexistente** (real: `/api/tipos-necessidade/`) → página inteira 404; além disso o backend **não tem** criar/editar tipos (catálogo read-only, serializer todo read-only) e a rota `/tipos` é **só Gerente** sem item de menu (docs permitem os 3 perfis).
4. **~46 testes backend** relacionados (needs_api 9, need_permissions 8, need_inactivation 11, tests_api 5, tests.py 2, NeedType 11) **não executados** → `A VALIDAR`; **zero testes frontend**.
5. Exclusão de necessidade vinculada a plano → **500** (`ProtectedError`, PN-4) — mesma causa do PA-5; persistência da exclusão é física e indefinida no doc (DN-3, interface com DA-3).
6. RN-NEC **não tem IDs formais** (usa-se `RN-NEC §n` = seção do doc — convenção declarada, pendente da decisão D3); tasks também sem IDs (`TASK-NEC-*` interno).
7. Ambiguidade registrada sem solução: Gerente vê necessidades aninhadas na avaliação, embora a RN diga visualização "não definida" (PN-8/DN-4).
8. Princípio de não antecipação respeitado: nenhum status além de `Identificada`, nenhuma regra de escala/estoque/frequência; seção "Fora do escopo" das tasks integralmente cumprida.
9. 10 tasks recomendadas (TASK-NEC-001…010) listadas no entregável — **não implementadas** (regra da auditoria).

## 6.4 Conclusões da etapa 2 — Plano de Cuidados (18/11/2026 — não repetir)

1. Fluxo **conectado frontend↔backend** (paciente → listagem → novo plano → detalhe → vincular → configururar → ativar → editar → remover → encerrar/reativar → histórico) com endpoints reais; **gating frontend idêntico ao backend** (`canPlan()` = grupos + granular, espelhando seed `accounts/0010`) e rota com **gate próprio de página** (mensagem de permissão) — sem os problemas PA-1/PA-2/PA-7/PN-3 dos processos anteriores.
2. Status geral **PARCIAL** com **nenhuma divergência RN×código**: RN-PLC 26/28 CONCLUÍDOS (1 PARCIAL §4.1 remoção da última necessidade; 1 NÃO INICIADO §3.1 plano obrigatório), RF01–14 13/14 (1 PARCIAL RF05 — UI não exibe criação/atualização). As divergências existentes são do **doc-mãe §7/§15** (Suspenso, `assessment_id`, `care_plan_items`, etc.) — decisão de priorizar RN/tasks registrada em `tasks_plano_cuidados.md` TASK 01, doc não atualizado (PC-8).
3. **Casos-limite permitidos mas não definidos nos docs** (registrados como decisões, não como bugs): plano encerrado editável/vinculável (PC-4), remoção da última necessidade em plano ativo (PC-3), `end_date < start_date` (PC-5), profissional inativo configurável (PC-6).
4. **56 testes backend em 17 arquivos + 3 testes frontend** existem (**não executados** → `A VALIDAR`); docs declaram 235/246/279/290 verdes — **afirmação documentada, não verificada**; frontend tem ao menos testes de lib (diferente dos processos 1–3, que tinham zero).
5. Integração com escala **consolidada e testada**: `CareScale.care_plan`/`ScaleNeed.plan_need` PROTECT, bloqueio de remoção do plano enquanto na escala (400), profissão compatível copiada do profissional necessário, contratos `planned_requirement`/`scheduling_requirement` — decisões de domínio em `execucao_tasks_a_fazer.md`.
6. Exclusão de necessidade × plano (500 no lado da necessidade) permanece **herdada** (PC-11 = PA-5/PN-4/DA-3/DN-3).
7. Princípio de não antecipação respeitado: nenhuma regra de agendamento/visita/atendimento/evolução/estoque no app; `end_date` não é preenchido automaticamente no encerramento (decisão registrada); sem Suspenso (decisão registrada).
8. 11 tasks recomendadas (TASK-PLC-001…011) listadas no entregável — **não implementadas** (regra da auditoria).

## 6.5 Conclusões da etapa 2 — Escala (18/11/2026 — não repetir)

1. Fluxo **conectado frontend↔backend** (menu → listagem → nova escala → detalhe → editar → necessidades → frequência → profissionais → substituição → status → histórico → excluir) com endpoints reais; **gating idêntico** (`canScale()` × `has_scale_permission()` × seed `accounts/0011`) e **menu com estado próprio** via `GET /api/escalas/acesso/` — resolve os problemas PA-14/PC-9 (sem entrada só por atalho) e PA-11 (paginação com `next` do DRF); nenhuma página chamando endpoint inexistente (diferente do PN-1).
2. Status geral **PARCIAL**: RN-ESC **26/27 CONCLUÍDOS** (1 PARCIAL RN-ESC-25) e RF-ESC **23/24** (1 PARCIAL RF-ESC-22) — **primeiro processo sem nenhuma DIVERGENTE nem NÃO INICIADO**; a única parcialidade é o **bloqueio de novos agendamentos**: contrato `scheduling_requirement` pronto e testado, mas **sem consumidor** (módulo Agendamento inexistente).
3. **Correção do inventário**: `regras_negocio_escala.md` **tem IDs formais** (`RN-ESC-01…27`) — inventário §8.2 (que classificava o doc como "sem IDs") está desatualizado; só os processos 2–4 precisaram da convenção `§n`.
4. **37 testes backend em 28 arquivos** (cobrindo todos os 9 itens da seção Testes das tasks) **+ 2 casos `node:test` + 1 roteiro e2e Playwright** existem (**não executados** → `A VALIDAR`); docs declaram 37 da escala dentro de 279/290 verdes — afirmação documentada, não verificada (P-ESC-9).
5. **Dupla barreira da RN-ESC-24** comprovada: `care_plans/services.py:114-116` bloqueia a remoção no plano (400) **e** `validate_activation` revalida os vínculos na ativação — integração escala↔plano consolidada nos dois sentidos.
6. **Princípio de não antecipação integralmente respeitado**: nenhum horário/duração/conflito/agendamento/visita/evolução no app; disponibilidade/região ficam **informativas** (`planning.py`) por decisão de domínio registrada; pendências do doc-mãe §11 não foram inventadas (registradas como D-ESC-3).
7. **Casos-limite permitidos mas não definidos nos docs** (registrados como decisões, não bugs): escala sobre plano **Rascunho/Encerrado** (P-ESC-4), **exclusão** de escala Ativa/Encerrada (P-ESC-5), **observação sem frequência** bloqueada (P-ESC-6), escopo do catálogo `planos` (P-ESC-12).
8. Achados de UX/integração: rota `/pacientes/:patientId/escalas` **órfã** (P-ESC-1), doc-mãe §10/§11/§15 e `tasks_escala.md` **stale** (P-ESC-2/3), histórico com ações crus (P-ESC-8), `canScale` sem `is_superuser` (P-ESC-7).
9. Seed `escalas.*` **só Gerente** (P-ESC-11) — coerente com a RN (que não cita médico/enfermeiro), mas a visualização de outros perfis depende da concessão via **Categorias** (processo Usuários ainda não auditado).
10. 11 tasks recomendadas (TASK-ESC-001…011) listadas no entregável — **não implementadas** (regra da auditoria).

## 6.6 Conclusões da etapa 2 — Usuários (21/11/2026 — não repetir)

1. Gestão de usuários/categorias/profissões/permissões está conectada entre API e telas principais; status, transferências e autorização granular implementados.
2. Recuperação de senha permanece adiada; módulo oficial de Profissionais não existe além do stub.
3. Exclusão física pode encontrar FKs `PROTECT`, mas `perform_destroy` não captura `ProtectedError` (P-USU-1); política precisa de decisão.
4. Correspondência profissão↔categoria depende de nome, sem integridade referencial formal; rename pode quebrar o espelho (P-USU-2).
5. A UI não edita nome de profissão (P-USU-3); manager/admin podem criar usuários sem vínculo profissional (P-USU-5).
6. Auditoria é mínima e testes não foram executados (P-USU-6/P-USU-8 → A VALIDAR); detalhes na seção Processo 6.

## 6.7 Conclusões da etapa 2 — Agendamento (21/11/2026 — não repetir)

1. O processo documentado não tem implementação de backend nem frontend; nenhuma entidade/rota/página de visita foi encontrada.
2. `care_scales.scheduling_requirement()` exige escala ativa e expõe dados relacionados, mas não possui consumidor. É apenas preparação de integração, não fluxo funcionando.
3. `ProfessionalPlanningInfo.availability_notes` é texto informativo; disponibilidade temporal, conflitos e geração de série não estão implementados.
4. RF-AGE-35 e as fronteiras Agendamento/Visita/Atendimento precisam de definição sobre exclusão, histórico, estados e identidade da entidade.
5. Testes do processo inexistentes; os testes do contrato da Escala não foram executados nem contam como cobertura de Agendamento.

## 7. Problemas identificados (aguardando investigação/validação)

- Persistência do banco em Docker (volume vs caminho do SQLite) — **não investigado**.
- Storage S3/MinIO possivelmente inerte — **não investigado**.
- Segurança de ambiente: DEBUG, ALLOWED_HOSTS, CORS fixo em localhost, credenciais MinIO hardcoded no compose, `acessos.md` no disco — **não investigado**.
- ~~Possível desalinhamento `regras_negocio_escala.md` (muito curto) × app `care_scales` (grande)~~ — **investigado em 18/11/2026 (Processo 5)**: doc curto, porém com **27 RNs formais** (`RN-ESC-01…27`) cobertas por 26 CONCLUÍDOS + 1 PARCIAL; desalhamento real está no **doc-mãe §10/§11/§15** e em `tasks_escala.md` (P-ESC-2/P-ESC-3).
- PRs #17–#77 descritas como "sem merge" nos docs de execução; verificar o que está realmente em `main` — **não investigado**.

## 8. Decisões pendentes (requerem decisão humana)

1. **Escopo da validação**: executar os testes backend/frontend nesta auditoria (roda comandos não destrutivos `manage.py test` / `node --test`) ou validar apenas por leitura? → afeta status `CONCLUÍDO` × `A VALIDAR`.
2. **Fonte externa**: auditoria consultará GitHub/Jira para conferir tasks `TA-*` e PRs, ou usa somente o repositório local? (afeta etapas 2–5)
3. **Identificadores**: criar IDs internos estáveis para RNs/RFs sem identificação formal (ex.: `RN-INT-…`, `RF-INT-…`) — confirmar convenção.
4. **Nome do arquivo**: inicialmente o roteiro citava `00_CONTEXTO_E_CONTINUIDADE.md`; a memória de continuidade foi mantida e renomeada, por solicitação do usuário, para `00_AUDITORIA_MEMORIA.md`, seguindo o padrão de `02_AUDITORIA_PROCESSOS.md`.
5. Documentos de agendamento/visita estão **não commitados** (`git status`): confirmar se são material de trabalho novo a incluir no escopo da auditoria.

## 9. Próxima atividade recomendada

**ETAPA 4 — Auditoria de regras e requisitos**, produzir `04_AUDITORIA_REGRAS_E_REQUISITOS.md`, conforme etapas planejadas. As etapas 1–3 e os 8 processos da etapa 2 estão concluídos.


## 10. Instruções para a próxima conversa

1. Leia este arquivo por inteiro antes de qualquer coisa.
2. Consulte `01_INVENTARIO.md`, o índice `02_AUDITORIA_PROCESSOS.md` e os relatórios `02_01`…`02_08` para os achados — não repita inventário nem auditorias de processos; os oito processos estão auditados.
3. Não releia `acessos.md`, `.env`, `.env.docker`.
4. Somente leitura: **não executar testes** (decisão do usuário 18/11/2026) → tudo que depende de execução fica `A VALIDAR`.
5. As etapas 1–6 estão concluídas; consulte `05_BACKLOG_GERAL.md` e `06_PLANO_DE_EXECUCAO.md` para retomar o planejamento aprovado.
6. Decisões de domínio pendentes estão registradas nos relatórios individuais `02_01`…`02_08`; não invente definições.

## 11. Consolidação e plano de execução (21/11/2026)

- Criados `05_BACKLOG_GERAL.md` e `06_PLANO_DE_EXECUCAO.md`; atualização complementar de `00_CONTEXTO_E_CONTINUIDADE.md`.
- Achados dos relatórios 00–04 reunidos por processo/área, sem duplicar tasks, preservando IDs P*/D*/AT-* e referências RN/RF ou seção/título quando não há ID formal.
- Prioridades P0–P3 justificadas. Somente a ausência de CSRF para mutações autenticadas por cookie foi classificada P0 antes de exposição; nenhum achado crítico foi confirmado pela auditoria estática.
- Dependências e sequência registradas: segurança e persistência; decisões de domínio; finalização de seis processos existentes; Agendamento, Registro do Atendimento e Visita condicionados ao escopo do MVP; validação e melhorias futuras.
- Nenhuma task foi implementada e nenhuma validação de execução foi rodada. Testes, builds, lint, migrations, HTTP e storage permanecem não executados; evidências de runtime continuam A VALIDAR.
- Próximo passo: revisar/aprovar o backlog e tomar decisões de negócio pendentes antes de iniciar desenvolvimento. Não foi criada uma matriz de rastreabilidade separada; referências permanecem nos relatórios e no backlog.

## 12. Separação das auditorias por processo (21/11/2026)

- O conteúdo das oito seções de processo foi preservado integralmente e separado em `02_01_CADASTRO_DO_PACIENTE.md`, `02_02_AVALIACAO_INICIAL.md`, `02_03_NECESSIDADES_IDENTIFICADAS.md`, `02_04_PLANO_DE_CUIDADOS.md`, `02_05_ESCALA.md`, `02_06_USUARIOS.md`, `02_07_AGENDAMENTO.md` e `02_08_VISITA_DOMICILIAR.md`.
- `02_AUDITORIA_PROCESSOS.md` agora contém somente o contexto da etapa e links para os relatórios individuais.
- Referências em `04_AUDITORIA_REGRAS_E_REQUISITOS.md`, `05_BACKLOG_GERAL.md` e documentos de continuidade foram atualizadas para apontar aos arquivos separados.
- Nenhuma auditoria foi refeita e nenhum código ou regra de produto foi alterado.

---

**Última atualização**: 21/11/2026 — Etapa 3 concluída (`03_AUDITORIA_TECNICA.md`). Etapas 1–3 concluídas; próxima atividade: **Etapa 4 — Auditoria de regras e requisitos**. O nome `00_CONTEXTO_E_CONTINUIDADE.md` segue ausente; atualizar este arquivo de memória como fonte oficial.

