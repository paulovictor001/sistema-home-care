# 01 — Inventário e Reconhecimento do Projeto

> Etapa 1 da auditoria. **Somente inventário** — não contém análise detalhada de processos nem verificação de conformidade de regras (etapas posteriores).
> Data de realização: 17/11/2026.

---

## 1. Visão geral do sistema

Sistema de gestão de atendimento domiciliar particular (projeto acadêmico), composto por:

- **Backend**: Django 5.2 + Django REST Framework (API REST em `backend/sistema_home_care/`).
- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS 4 (`frontend/sistema-home-care/`).
- **Armazenamento**: MinIO (compatível S3) via `django-storages` + `boto3` — configurado, porém **sem nenhum uso efetivo identificado** (ver seção 6).
- **Infraestrutura**: Docker Compose (serviços `backend`, `frontend`, `minio`).
- **Banco**: SQLite (arquivo local; ver divergência de volume na seção 7).
- **Auth**: JWT (SimpleJWT) em cookies HttpOnly, login por CPF + senha.
- **Controle de tarefas**: Jira (tasks `TA-*`) + branches/PRs por task no GitHub; docs locais em `docs/tasks/`.

Estado geral: projeto em desenvolvimento ativo, com módulos de cadastro, avaliação, necessidades, plano de cuidados e escala aparentemente implementados; módulos de **agendamento** e **visita domiciliar** documentados mas sem código correspondente.

## 2. Arquitetura identificada

```
[React SPA (Vite :5173)]
        │  fetch credentials:"include"  →  http://localhost:8000
        ▼
[Django REST Framework (:8000)]
        │  CookieJWTAuthentication (access_token 15min / refresh_token 7d rotacionado com blacklist)
        ├─► SQLite (backend/sistema_home_care/db.sqlite3)
        └─► django-storages → MinIO S3 (:9000)  [configurado, sem uso detectado]
```

- Padrão de API: routers DRF com endpoints em português (`/api/pacientes/`, `/api/avaliacoes/`, `/api/planos-cuidados/`, `/api/escalas/`, etc.) + actions customizadas (`inativar`, `reativar`, `status`, `historico`...).
- Lógica de negócio centralizada em `services.py` por app (`accounts`, `care_plans`, `care_scales`); `patients` e `assessments` misturam regras em serializers/views.
- Autorização em duas camadas: **perfis (Groups)** `GERENTE/MEDICO/ENFERMEIRO` + **permissões granulares** (`GranularPermission` por `feature.action`), aplicadas via `RequirePermission()` e `HasCategoryPermission`.
- Auditoria: logs explícitos chamados pelas views (`accounts/audit.py`, `patients/audit.py`, `care_scales/audit.py`) — **sem signals**, de propósito (comentário em `accounts/audit.py:4`).
- Não há Celery, tarefas assíncronas, webhooks nem signals.

## 3. Estrutura de pastas

```
sistema-home-care/
├── backend/
│   ├── Dockerfile, requirements.txt, .env, .env.example
│   └── sistema_home_care/            # raiz Django (manage.py)
│       ├── sistema_home_care/        # settings, urls, wsgi, asgi
│       ├── accounts/                 # auth, usuários, categorias, profissões, permissões
│       ├── patients/                 # pacientes, endereço, condições de saúde, tipos de necessidade
│       ├── professionals/            # stub de profissional
│       ├── assessments/              # avaliação inicial, necessidades, recursos
│       ├── care_plans/               # plano de cuidados
│       ├── care_scales/              # escala
│       └── db.sqlite3
├── frontend/sistema-home-care/
│   ├── src/{pages,components,contexts,lib,assets}
│   └── tests/                        # testes node:test + teste browser Playwright
├── docs/
│   ├── Processos e Modelo de Dados.md, apresentacao.md, startup_atendimento_domiciliar.md
│   ├── regras-de-negocio/            # 8 arquivos
│   ├── requisitos-do-sistema/        # 8 arquivos
│   └── tasks/                        # 8 arquivos de tasks + 2 de execução
├── docker-compose.yml
├── .env.docker / .env.docker.example
├── AGENTS.md, README.md, acessos.md  # acessos.md contém credenciais (não versionado)
└── docs/auditoria/                   # esta auditoria (não existe no repositório original)
```

Não há: `.github/workflows` (CI), Makefile, scripts `.sh/.ps1/.bat`, nem configuração de cobertura de código.

## 4. Módulos do backend

### 4.1 Apps instalados (`settings.py:26-43`)

| App | Papel | Migrations |
|---|---|---|
| `accounts` | User customizado (CPF), Groups, Category, Profession, GranularPermission, UserAuditLog | 11 |
| `patients` | Patient, PatientAddress, HealthCondition, PatientAuditLog | 7 |
| `professionals` | Professional (stub 1:1 com User) | 1 |
| `assessments` | PatientAssessment, CareNeed, CareNeedHistory, AssessmentResource, Resource, NeedType | 4 |
| `care_plans` | CarePlan, CarePlanNeed, CarePlanHistory, CarePlanNeedResource | 6 |
| `care_scales` | CareScale, ScaleNeed, ScaleAssignment, ScaleAuditEvent, ScaleSubstitution, ProfessionalPlanningInfo | 5 |

Mais `django.contrib.*`, `corsheaders`, `rest_framework`, `rest_framework_simplejwt` (+`token_blacklist`).

### 4.2 Models e entidades (38 classes de model/textchoices)

- **accounts**: `CustomUserManager`, `User` (USERNAME_FIELD=`cpf`), `GranularPermission`, `Category`, `Profession`, `UserAuditAction`, `UserAuditLog`.
- **patients**: `PatientStatus`, `PatientAuditAction`, `PatientAuditLog`, `HealthCondition`, `Patient`, `PatientAddress`.
- **assessments**: `AssessmentType`, `NeedPriority`, `NeedStatus`, `NeedTypeStatus`, `NeedType`, `RequestOrigin`, `Resource`, `PatientAssessment`, `CareNeed`, `CareNeedHistory`, `AssessmentResource`.
- **care_plans**: `CarePlanStatus`, `FrequencyPeriod`, `CarePlan`, `CarePlanNeed`, `CarePlanHistory`, `CarePlanNeedResource`.
- **care_scales**: `ScaleStatus`, `CareScale`, `ScaleNeed`, `ScaleAssignment`, `ScaleAuditEvent`, `ScaleSubstitution`, `ProfessionalPlanningInfo`.
- **professionals**: `Professional`.

### 4.3 Views e ViewSets (28 classes)

| App | ViewSets / Views | Actions customizadas |
|---|---|---|
| `accounts` | `LoginView`, `RefreshView`, `LogoutView`, `MeView`, `MedicoListView`, `ClinicoListView`; `UserViewSet`, `CategoryViewSet`, `ProfessionViewSet`, `GranularPermissionViewSet`, `FreeProfessionalListView` | usuario: `inativar`, `reativar`; categoria: `permissoes`; profissao: `transferir` |
| `patients` | `PatientViewSet`, `HealthConditionViewSet` | paciente: `inativar`, `reativar` |
| `assessments` | `AssessmentViewSet`, `CareNeedViewSet`, `NeedTypeCatalogViewSet`, `ResourceCatalogViewSet` | avaliação: `necessidades`, `recursos`; necessidade: `inativar`, `reativar`, `historico`; tipo: `inativar`, `reativar` |
| `care_plans` | `CarePlanViewSet` (só list/retrieve + actions; sem create/update genérico) | `necessidades`, `.../configurar`, `.../remover`, `ativar`, `encerrar`, `reativar`, `historico`, `profissionais`, `recursos`, `necessidades-disponiveis` |
| `care_scales` | `CareScaleViewSet` | `necessidades`, `.../remover`, `.../profissionais`, `.../remover`, `.../substituir`, `.../lote`, `.../configurar`, `status`, `.../profissionais-disponiveis`, `profissionais/<id>/planejamento`, `historico`, `substituicoes`, `planos`, `acesso` |

### 4.4 Serializers (41 classes) — por app

`accounts` (7): login, permissões, categoria, profissão, profissional read/inline, usuário, transferência.
`patients` (4): endereço, paciente, condição de saúde, catálogo de tipo de necessidade.
`assessments` (7): necessidade read, recurso read, avaliação, necessidade, histórico, recurso, catálogo.
`care_plans` (10): configuração de recurso/necessidade, recurso, vínculo, plano (read/create/update), attach, remoção, histórico.
`care_scales` (12): status, planejamento, configuração, atribuição, profissional(ões), necessidade, add-need, escala write/read, auditoria, substituição.

### 4.5 URLs e endpoints

Raiz: `sistema_home_care/urls.py` → `/admin/`, `/api/auth/`, `/api/medicos/`, `/api/clinicos/`, `/api/` (5 includes).

- `GET/POST /api/auth/{login,refresh,logout,me}/` (`accounts/urls.py`)
- `/api/usuarios|categorias|profissoes|permissoes/` + `/api/profissionais-livres/` (`accounts/urls_users.py`)
- `/api/pacientes/`, `/api/condicoes-saude/`, `/api/tipos-necessidade/` (+`inativar`/`reativar`) (`patients/urls.py`)
- `/api/avaliacoes/`, `/api/necessidades/`, `/api/recursos/` (`assessments/urls.py`)
- `/api/planos-cuidados/` (`care_plans/urls.py`)
- `/api/escalas/` (`care_scales/urls.py`)

### 4.6 Services e regras de negócio

- `accounts/services.py` (5 funções): `create_managed_user`, `set_user_status`, `change_professional_profession`, `transfer_profession_professionals`, `sync_legacy_groups`.
- `care_plans/services.py` (15 funções): criação transacional de plano, vínculo/remoção de necessidade, configuração, ciclos de status, encerramento, lock, snapshot/histórico.
- `care_scales/services.py` (22 funções): validação de relação/período, CRUD transacional, necessidades, atribuição/múltiplos/substituição de profissionais, frequência, status, ativação.
- `care_scales/planning.py` e `care_scales/contracts.py`, `care_plans/contracts.py`: contratos para integração futura (agendamento/escala).

### 4.7 Autenticação, autorização e permissões

- `accounts/authentication.py`: `CookieJWTAuthentication` (default global) + fallback header Authorization; `IsAuthenticated` default (`settings.py:140-147`).
- `accounts/permissions.py`: `IsGerente`, `IsMedico`, `IsEnfermeiro`, `IsClinicalStaff`, `HasCategoryPermission`, factory `RequirePermission(codename)`.
- Permissões granulares por app: `assessments/permissions.py` (`IsActiveUser`, `DenyUnknownAction`), `care_plans/permissions.py` (`DenyAction` + matriz perfil×ação), `care_scales/permissions.py` (`ScalePermission` com escopo "profissional escalado vê só as próprias").
- Seeds de permissões em migrations `accounts/0004` a `0011` (pacientes, avaliações, necessidades, planos, escalas).
- Grupos padrão criados por migration `accounts/0002_default_groups`.

### 4.8 Signals / tarefas assíncronas

**Nenhum.** Decisão explícita de usar chamadas diretas de auditoria em services/views para evitar duplo log (`accounts/audit.py:4`, `patients/audit.py:4`).

### 4.9 Migrations

32 migrations no total (accounts 11, patients 6, care_plans 6, care_scales 5, assessments 3, professionals 1). Conforme `docs/tasks/execucao_tasks_a_fazer.md:63`, `makemigrations --check` estava sem pendências na branch final das tasks de escala (a verificar na etapa técnica).

## 5. Módulos do frontend

### 5.1 Organização

`src/` dividido em `pages/` (24 páginas), `components/` (7), `contexts/` (3), `lib/` (7 módulos), `assets/`. Estado global apenas via React Context (`AuthContext`); sem Redux/Zustand/useReducer global.

### 5.2 Páginas e rotas (`src/App.tsx`)

| Rota | Página | Guarda |
|---|---|---|
| `/login` | `Login` | pública |
| `/` | `Home` | `RequireAuth` |
| `/pacientes`, `/pacientes/:id`, `/pacientes/:id/editar` | `PatientsList`, `PatientDetail`, `PatientForm` | auth |
| `/pacientes/novo` | `PatientForm` | **`RequireGerente`** |
| `/pacientes/:patientId/planos-cuidados`, `/planos-cuidados/:id` | `CarePlans`, `CarePlanDetail` | auth |
| `/escalas`, `/pacientes/:patientId/escalas`, `/escalas/:id` | `CareScales`, `CareScaleDetail` | auth |
| `/pacientes/:patientId/avaliacoes`, `/nova`, `/avaliacoes/:id`, `/editar` | `AssessmentsHistory`, `AssessmentForm`, `AssessmentDetail` | auth |
| `/usuarios/*` (lista/novo/detalhe/editar), `/tipos`, `/categorias`, `/profissoes` | `UsersList`, `UserForm`, `UserDetail`, `NeedTypes`, `Categories`, `Professions` | **`RequireGerente`** |

Não existem rotas/páginas para: **agendamento**, **visita domiciliar**, painéis de escala por profissional.

### 5.3 Componentes

`AppLayout` (menu lateral + breadcrumbs + visibilidade condicional por permissão), `RequireAuth`, `RequireGerente`, `NeedEditForm`, `PlanNeedConfiguration`, `PlanNeedRemoval`, `ScaleNeedManagement`.

### 5.4 Comunicação com a API

- `src/lib/api.ts`: `api()` com `credentials:"include"`, refresh silencioso único em 401 (mutex `refreshInFlight`), `apiJson<T>` e `ApiError(status, message)`.
- Módulos de domínio: `patients.ts`, `assessments.ts`, `carePlans.ts`, `careScales.ts`, `users.ts`, `cpf.ts` (máscara/validação).
- Base URL: `VITE_API_URL` ou `http://localhost:8000`.

### 5.5 Autenticação e tratamento de erros

- `contexts/AuthContext.tsx` + `auth-state.ts` + `useAuth.ts`: hidrata via `/api/auth/me/`, expõe `SessionUser` com `category` e `permissions`.
- Erros: `ApiError` com `detail`; tratamento por página (sem componente global de erro/toast identificado — verificar na etapa técnica).

### 5.6 Bibliotecas principais

`react`, `react-dom`, `react-router-dom`, `tailwindcss` (+ plugin vite). Dev: `typescript`, `vite`, `oxlint` (não ESLint), `@vitejs/plugin-react`. **Nenhuma lib de formulário, data, query ou teste declarada no `package.json`** (testes usam `node:test` embutido e `playwright` importado sem estar em devDependencies — ver seção 9).

## 6. Banco de dados e armazenamento

- **Banco**: SQLite (`settings.py:79-84`, `BASE_DIR/db.sqlite3`). Arquivo presente em `backend/sistema_home_care/db.sqlite3` (não aberto durante a auditoria).
- **Migrations**: uso completo e versionado por app (32 arquivos).
- **Relacionamentos principais** (aparentes pelos models/migrations): Patient 1:1 PatientAddress; Patient FK→User (médico); PatientAssessment FK→Patient (PROTECT); CareNeed FK→PatientAssessment + FK→NeedType (PROTECT); CarePlan FK→Patient; CarePlanNeed FK→CarePlan + CareNeed + Professional; CareScale FK→Patient + CarePlan; ScaleNeed FK→CareScale + CarePlanNeed; ScaleAssignment FK→ScaleNeed + Professional; audit logs com `SET_NULL` para sobreviver a deleções.
- **MinIO/S3**: configurado em `settings.py:165-175` (`DEFAULT_FILE_STORAGE` S3Boto3, endpoint/bucket/credenciais via env) e no `docker-compose` (imagem `pgsty/silo`, porta 9000/9001, healthcheck, volume `minio_data`).
- **Uso efetivo**: **nenhum**. Não há `FileField`/`ImageField`/`upload_to`/`default_storage` em nenhum model, nem `FormData`/upload no frontend. Bucket `home-care-media` precisa ser criado manualmente (`README.md:127`).
- **Observação de configuração** (registrar, não corrigir): `DEFAULT_FILE_STORAGE` é a chave antiga (legada desde Django 4.2); a forma atual é `STORAGES`. Pode não surtir efeito — **investigar na etapa técnica**.

## 7. Infraestrutura (docker-compose.yml)

| Serviço | Porta | Imagem/build | Volume | Observação |
|---|---|---|---|---|
| `backend` | 8000 | `./backend` (python:3.12-slim, runserver) | `./backend:/app` + `db_data:/app/sistema_home_care/db` | `env_file: .env.docker`; `depends_on: minio (service_healthy)`; `restart: unless-stopped` |
| `frontend` | 5173 | `./frontend/sistema-home-care` (node:22-alpine, vite dev) | `./frontend/...:/app` + `/app/node_modules` | `restart: unless-stopped` |
| `minio` | 9000/9001 | `pgsty/silo:RELEASE.2026-09-16T00-00-00Z` | `minio_data:/data` | healthcheck via `/usr/bin/silo healthcheck ready`; credenciais `minioadmin` no compose |

- Volumes nomeados: `db_data`, `minio_data`. Sem redes customizadas (rede default do Compose).
- **Divergência aparente a investigar**: `db_data` monta em `/app/sistema_home_care/db` (subpasta), mas o SQLite está em `/app/sistema_home_care/db.sqlite3` — o volume **não** parece persistir o banco real. Existe a pasta `backend/sistema_home_care/db/` (vazia/aparentemente só criada pelo mount).
- Ambientes: só existe configuração de **desenvolvimento** (`DEBUG=True` hardcoded em `settings.py:19`; `ALLOWED_HOSTS=[]`; `runserver`; vite dev). Não há settings de produção, gunicorn, nginx ou reverse proxy.
- `.env.docker.example` define `DEBUG=True` e `SECRET_KEY`, mas `settings.py` **não lê** a variável `DEBUG` do ambiente (hardcoded) — divergência menor a registrar.
- CORS/CSRF fixados em `http://localhost:5173` (`settings.py:130-138`).
- `AUTH_COOKIE_SECURE` vem de env (default `False`).
- **Credenciais**: `.env`, `.env.docker` presentes (conteúdo não aberto). `docker-compose.yml` contém usuário/senha do MinIO hardcoded (`minioadmin`). Raiz `acessos.md` contém CPF + senha de perfis de demonstração — arquivo **não versionado** (consta em `git status` como untracked), mas existe no disco; registrar como risco, não expor valores.

## 8. Documentação encontrada (`docs/`)

### 8.1 Geral (3 arquivos)

- `Processos e Modelo de Dados.md` (27 KB): documento-mãe — 4 processos detalhados (cadastro, avaliação, necessidades, plano), relação entre processos, regras conceituais, limites da versão, **pontos que ainda precisam de validação** (§11), modelo de escala/agendamento apenas como próximos passos (§10, §15).
- `apresentacao.md` (4 KB): roteiro de apresentação e perfis fictícios.
- `startup_atendimento_domiciliar.md` (13 KB): inicialização do projeto.

### 8.2 Regras de negócio (`regras-de-negocio/`, 8 arquivos)

| Arquivo | IDs formais | Temas |
|---|---|---|
| `regras_negocio_cadastro_paciente.md` | **24 RNs** (`RN-CAD-PAC-001`…`024`) | cadastro, status, consulta |
| `regras_negocio_avaliacao_inicial.md` | — | avaliação inicial |
| `regras_negocio_necessidades_identificadas.md` | — | necessidades, inativação/reativação |
| `regras_negocio_plano_cuidados.md` | — | plano, status, histórico |
| `regras_negocio_escala.md` | — | escala (curto, 2.7 KB) |
| `regras_negocio_agendamento.md` | — | agendamento (**arquivo novo, não commitado**) |
| `regras_negocio_visita_domiciliar.md` | — | visita (**novo, não commitado**) |
| `regras_usuarios.md` | — | usuários/categorias/profissões |

**Observação**: somente `cadastro_paciente` usa identificadores formais (`RN-*`). Os demais documentos de regras e **todos** os de requisitos não possuem IDs formais de regra; os requisitos usam prefixo `RF-` em alguns casos (ver 8.3). Para a matriz de rastreabilidade será preciso criar identificadores internos estáveis e declarar isso (conforme §4 das regras da auditoria).

### 8.3 Requisitos funcionais (`requisitos-do-sistema/`, 8 arquivos)

| Arquivo | IDs `RF-*` |
|---|---|
| `requisitos_funcionais_cadastro_paciente.md` | 21 |
| `requisitos_funcionais_avaliacao_inicial.md` | 20 |
| `requisitos_funcionais_necessidades_identificadas.md` | 21 |
| `requisitos_funcionais_escala.md` | 24 |
| `requisitos_funcionais_agendamento.md` | 36 (novo, não commitado) |
| `requisitos_funcionais_visita_domiciliar.md` | 35 (novo, não commitado) |
| `requisitos_funcionais_plano_cuidados.md` | 0 (sem IDs `RF-*`) |
| `requisitos_usuarios.md` | 0 (sem IDs `RF-*`) |

### 8.4 Tasks (`tasks/`, 10 arquivos)

- Por processo: `tasks_cadastro_paciente`, `tasks_avaliacao_inicial`, `tasks_necessidades_identificadas`, `tasks_plano_cuidados`, `tasks_escala`, `tasks_agendamento` (novo), `tasks_visita_domiciliar` (novo), `tasks_usuarios`.
- Execução: `execucao_tasks_a_fazer.md` (41 tasks TA-112…TA-154 entregues em PRs #37–#77, **encadeadas e sem merge registrados no Jira**), `execucao_tasks_rubens.md` (TA-88…TA-111 em PRs #17–#36, idem).
- Contagem de checkboxes: `tasks_necessidades` 40 `[x]` / 44 `[ ]`; `tasks_agendamento` 120 pendentes; `tasks_escala` 35 pendentes; `tasks_visita_domiciliar` 77 pendentes. **`tasks_escala` está integralmente desmarcada embora o código da escala exista e esteja testado** — evidência de que o status dos checkboxes não reflete o estado real (não usar checkbox como prova; verificar por evidência de código/teste nas etapas seguintes).
- IDs `TA-*` referenciados no AGENTS.md e nos docs de execução são o rastreio no Jira (externo ao repo; acesso à fonte externa pode ser necessário para conferir status — decisão pendente).

### 8.5 Decisões já documentadas

- `AGENTS.md`: estado implementado de Auth, Users, Patients (inclui decisões TA-5/7/10… e pendências: `responsible_team` JSONField provisório, auditoria completa pendente, recuperação de senha adiada).
- `execucao_tasks_a_fazer.md` §"Decisões de domínio": 5 decisões da escala (profissão compatível, regiões/disponibilidade informativas, remoção explícita antes do plano, exclusão lógica + contrato `scheduling_requirement`, condições de ativação).
- `Processos e Modelo de Dados.md` §10–§11: limites da versão e pontos de validação em aberto (escala/agendamento/visita fora do MVP desta versão).

### 8.6 Pontos ainda não definidos (aparentes, a confirmar nas etapas de processo)

- Visão completa de `regras_negocio_escala.md` é muito curta frente à implementação existente (2.7 KB vs app com 7 models e 22 funções de serviço) — possível desalinhamento doc×código.
- Agendamento e visita domiciliar: documentados recentemente (não commitados), sem nenhum código.
- `requisitos_funcionais_plano_cuidados.md` e `requisitos_usuarios.md` sem identificadores formais.
- Integração escala↔agendamento: apenas `contracts.py` (bloqueio de agendamento em escala encerrada) — implementação do agendamento pendente.

## 9. Testes encontrados

### 9.1 Backend — ~283 métodos `test_*` em 34 arquivos (pytest/Django test runner)

| App | Arquivos | Foco (aparente) |
|---|---|---|
| `accounts` | `tests.py`, `tests_users.py`, `tests_demo.py` | auth cookies/refresh, CRUD usuários, categorias/profissões, seed demo |
| `patients` | `tests.py`, `tests_health_conditions.py` | modelo, API, permissões, auditoria, tipos de necessidade |
| `assessments` | `tests.py`, `tests_api.py`, `tests_needs_api.py`, `tests_need_permissions.py`, `tests_need_inactivation.py` | avaliação, necessidades, recursos, permissões, inativação/reativação |
| `care_plans` | **16 arquivos** (`tests.py`, `tests_api.py`, `tests_services.py`, `tests_status.py`, `tests_exclusivity.py`, `tests_permissions.py`, `tests_http_*`, `tests_contracts.py`…) | ciclo de status, exclusividade, remoção, histórico, contratos |
| `care_scales` | **30 arquivos** (`tests_*.py` + `test_support.py`) | ativação, frequência, profissionais, substituição, auditoria, permissões, período, contratos |

- **Não foram executados nesta etapa** (regra: sem comprovação de execução → status de validação `A VALIDAR` nas etapas seguintes). Resultado declarado em `execucao_tasks_a_fazer.md:61-66`: 279–290 testes aprovados na branch final das tasks — **afirmação documentada, não verificada**.

### 9.2 Frontend — 3 arquivos em `frontend/sistema-home-care/tests/`

- `carePlans.test.mjs`, `careScales.test.mjs`: `node:test` + `node:assert` compilando TS na hora (importam `typescript`).
- `careScales.browser.mjs`: **Playwright** (Chrome) com API mockada em Vite `:4173`.
- `package.json` **não tem script `test`** nem devDependency `playwright` — roda-se manualmente com `node --test` (a confirmar). Sem CI.

### 9.3 Comandos importantes

```bash
# Backend
cd backend/sistema_home_care
python manage.py runserver | migrate | makemigrations | createsuperuser
python manage.py seed_demo            # accounts/management/commands/seed_demo.py

# Frontend
cd frontend/sistema-home-care
npm install | npm run dev | npm run build | npm run lint   # lint = oxlint

# Docker
copy .env.docker.example .env.docker
docker compose up -d | down | logs -f backend
docker compose exec backend python manage.py migrate
```

## 10. Pontos que precisam de investigação nas próximas etapas

1. **Volume `db_data` vs local real do SQLite** — o banco é persistido de fato no Docker? (etapa técnica)
2. **`DEFAULT_FILE_STORAGE` legado** — storage S3 está ativo? MinIO realmente utilizável? (etapa técnica)
3. **`DEBUG=True` hardcoded** e `ALLOWED_HOSTS=[]` — ambiente de produção inexistente (etapa técnica).
4. **Status real das tasks Jira (`TA-*`)** vs docs locais: PRs #17–#77 descritas como "sem merge" — quanto foi de fato integrado à `main`? (etapa técnica/processos; exige consulta ao GitHub/Jira — decisão de escopo)
5. **Checkbox de `tasks_escala` desatualizado** — confirmar que o status documentado das tasks não é confiável como evidência.
6. **Cobertura de testes × requisitos** — os ~283 testes cobrem quais RF/RN? (etapa de rastreabilidade)
7. **`acessos.md` e `.env*`** — risco de credenciais; confirmar status de versionamento (`.gitignore`) sem expor conteúdo.
8. **Divergências doc×doc**: `regras_negocio_escala.md` curta demais; `plano_cuidados`/`usuários` sem IDs de requisito; documentos de agendamento/visita não commitados (etapa de processos).
9. **Escopo MVP**: `Processos e Modelo de Dados.md` §10 declara escala/agendamento/visita fora do MVP da versão, mas escala já foi implementada — verificar divergência entre escopo planejado e executado (etapa de processos).
10. **Frontend**: ausência de tratamento global de erros, sem testes automatizados no build, `playwright` não declarado (etapa técnica).
