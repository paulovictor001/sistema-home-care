# AGENTS.md

## Project Structure

```
sistema-home-care/
├── backend/                    # Django REST API
│   ├── sistema_home_care/      # Django project root (manage.py here)
│   │   ├── sistema_home_care/  # Settings, urls, wsgi
│   │   ├── accounts/           # Auth: login CPF+senha, JWT em cookie HttpOnly, grupos/permissions
│   │   └── db.sqlite3
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── venv/                   # Python virtual environment (local, gitignored)
│   └── .env                    # SECRET_KEY, DEBUG (never commit, copy from .env.example)
├── frontend/
│   └── sistema-home-care/      # React app (run npm commands here)
│       ├── Dockerfile
│       ├── src/
│       └── package.json
├── docs/                       # Process docs and data models
│   ├── Processos e Modelo de Dados.md
│   ├── startup_atendimento_domiciliar.md
│   ├── regras-de-negocio/      # RN-CAD-PAC-*, RN-AVL-* (regras por processo)
│   ├── requisitos-do-sistema/  # RF-PAC-*, RF-AVL-* (requisitos funcionais)
│   └── tasks/                  # TASK-CAD-PAC-*, TASK-AVL-* (decomposição técnica)
├── docker-compose.yml          # backend + frontend + minio (pgsty/silo)
├── .env.docker                 # Docker env (never commit)
└── .env.docker.example         # Template: copy to .env.docker on clone
```

## Commands

### Backend (Django, local)
```bash
cd backend/sistema_home_care
python manage.py runserver        # Dev server on :8000
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

### Frontend (React + Vite)
```bash
cd frontend/sistema-home-care
npm install                       # Install deps
npm run dev                       # Dev server on :5173
npm run build                     # tsc -b && vite build
npm run lint                      # oxlint (not ESLint)
```

### Docker (setup via clone)
```bash
copy .env.docker.example .env.docker   # Windows (ou: cp .env.docker.example .env.docker)
# Edite SECRET_KEY com chave forte; evite "$" nos valores (interpolação do Compose, escape como "$$")
docker compose up -d              # Start all services
docker compose exec backend python manage.py migrate       # First run
docker compose exec backend python manage.py createsuperuser
docker compose down               # Stop all services
docker compose logs -f backend    # Watch backend logs
docker compose logs -f frontend   # Watch frontend logs
```

## Tech Stack

- **Backend**: Django 5.2, DRF 3.18, djangorestframework-simplejwt 5.5 (+token_blacklist), SQLite, django-cors-headers, python-dotenv, django-storages, boto3
- **Frontend**: React 19, Vite 8, TypeScript 6, react-router-dom, Tailwind CSS 4 (via @tailwindcss/vite + @tailwindcss/vite plugin), oxlint
- **Storage**: MinIO S3-compatible via `pgsty/silo` image (minio/minio foi removida do Docker Hub)

## Docker

### Services

| Service | Port | Description |
|---|---|---|
| backend | 8000 | Django API (volume `./backend:/app`, db em volume `db_data`) |
| frontend | 5173 | Vite dev server |
| minio | 9000 (API), 9001 (Console) | S3-compatible storage, imagem `pgsty/silo:RELEASE.2026-09-16T00-00-00Z` |

MinIO credentials: `minioadmin` / `minioadmin`

### Environment

- `.env.docker` — Docker environment variables (never commit)
- `.env.docker.example` — template versionado; copiar para `.env.docker` no clone
- S3 vars: `AWS_S3_ENDPOINT_URL=http://minio:9000`, `AWS_STORAGE_BUCKET_NAME=home-care-media`, `AWS_S3_REGION_NAME=us-east-1`
- Bucket `home-care-media` precisa ser criado no console MinIO (`:9001`) antes de upload via backend

## Docs (fonte de verdade do domínio)

- `docs/regras-de-negocio/regras_negocio_cadastro_paciente.md` — RN-CAD-PAC-001 a 024
- `docs/regras-de-negocio/regras_negocio_avaliacao_inicial.md` — RN-AVL-001 a 017
- `docs/requisitos-do-sistema/requisitos_funcionais_cadastro_paciente.md` — RF-PAC-001 a 021
- `docs/requisitos-do-sistema/requisitos_funcionais_avaliacao_inicial.md` — RF-AVL-001 a 020
- `docs/tasks/tasks_cadastro_paciente.md` — TASK-CAD-PAC-001 a 036 (modelagem, backend, auth, frontend, testes)
- `docs/tasks/tasks_avaliacao_inicial.md` — TASK-AVL-MOD/BE/AUTH/FE/TEST-* (idem)

### Convenções

- Cadastro responde "Quem é o paciente?" (dado estável); Avaliação registra situação clínica atual (registro próprio, nunca sobrescreve anterior).
- Não antecipar regras de escala, agendamento, visita, atendimento, evolução, reavaliação — registrar como pendência.
- Não criar uma task por campo; agrupar por modelagem/backend/regras/frontend/validação/autorização.
- Entidades planejadas: `Patient`, `PatientAddress` (1:1), `HealthCondition` (cadastrável), `PatientAssessment` → `CareNeed` + recursos associados.

## Auth (implementado)

- Login com **CPF + senha** (`POST /api/auth/login/`); modelo customizado `accounts.User` com `USERNAME_FIELD="cpf"` (só dígitos, máscara aceita e normalizada); erro sempre genérico "CPF ou senha inválidos"
- JWT SimpleJWT em **cookies HttpOnly** `access_token` (15min) + `refresh_token` (7d, rotacionado com blacklist); nenhum token no body ou `localStorage`
- Endpoints: `/api/auth/refresh/`, `/api/auth/logout/`, `/api/auth/me/` — frontend usa `fetch` com `credentials: "include"` (`src/lib/api.ts`, com silent refresh)
- Autorização por **Groups** `GERENTE`/`MEDICO`/`ENFERMEIRO` (criados por migration); helpers em `accounts/permissions.py` (`IsGerente`, `IsMedico`, `IsEnfermeiro`, `IsClinicalStaff`)
- Auth global default: `CookieJWTAuthentication` + `IsAuthenticated` (endpoints públicos declaram `AllowAny`); fallback para header `Authorization` mantido p/ testes/admin
- Criar usuário: `createsuperuser` pede CPF (só dígitos, `createsuperuser --cpf` ou prompt) + atribuir grupo no admin (`accounts.User` registrado com campo CPF); `AUTH_COOKIE_SECURE` via env (ligar em prod)
- Frontend: `AuthProvider` hidrata via `/me` no boot, `RequireAuth` guarda rotas, `pages/Login.tsx` com máscara de CPF

## Key Details

- Frontend dev server (port 5173) is whitelisted in CORS_ALLOWED_ORIGINS
- Backend loads SECRET_KEY from `backend/.env` (local) ou `.env.docker` (Docker) via python-dotenv
- Frontend linting uses **oxlint**, not ESLint
- Frontend build runs TypeScript check (`tsc -b`) before Vite build
- `frontend/sistema-home-care/` is the actual app root — not `frontend/`
- Cadastro: só gerente cadastra/inativa/reativa e altera médico/equipe responsável; gerente+médico+enfermeiro editam; CPF único; listagem padrão só ativos; paginação 20/página; filtros nome, CPF, status (ativo/inativo/todos), região (via bairro)
- Avaliação Inicial: só médico/enfermeiro criam e editam; gerente+médico+enfermeiro visualizam; gerente também pode trocar profissional responsável; tipo único "Avaliação inicial"; origem Família/Médico/Hospital/Clínica/Outro; necessidade criada na tela da avaliação com prioridade Baixa/Média/Alta/Urgente e status inicial "Identificada"; recursos só de cadastro existente (recurso+qtd+observação)
