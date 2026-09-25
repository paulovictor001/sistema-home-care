# Sistema Home Care

Sistema de atendimento domiciliar com backend Django e frontend React.

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- Git

## Início Rápido

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd sistema-home-care

# Suba todos os serviços
docker compose up -d

# Acesse
# Frontend:  http://localhost:5173
# Backend:   http://localhost:8000
# MinIO:     http://localhost:9001
```

## Credenciais

| Serviço | Usuário | Senha |
|---|---|---|
| MinIO Console | `minioadmin` | `minioadmin` |

## Estrutura do Projeto

```
sistema-home-care/
├── backend/                    # Django REST API
│   ├── sistema_home_care/      # manage.py está aqui
│   ├── venv/                   # Ambiente virtual (local)
│   ├── .env                    # Variáveis de ambiente (local)
│   └── requirements.txt
├── frontend/
│   └── sistema-home-care/      # App React (execute npm aqui)
│       ├── src/
│       └── package.json
├── docs/                       # Documentação de processos
├── docker-compose.yml
└── .env.docker                 # Variáveis para Docker (não committar)
```

## Desenvolvimento Local (sem Docker)

### Backend

```bash
cd backend/sistema_home_care

# Criar ambiente virtual (primeira vez)
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate    # Linux/Mac

# Instalar dependências
pip install -r ../requirements.txt

# Criar arquivo .env (copiar do .env.example)
cp ../.env.example .env
# Editar .env com sua SECRET_KEY

# Rodar migrações
python manage.py migrate

# Criar superusuário
python manage.py createsuperuser

# Iniciar servidor
python manage.py runserver
```

### Frontend

```bash
cd frontend/sistema-home-care

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

## Criar Usuário no Django

Para acessar o admin do Django (`http://localhost:8000/admin`), crie um superusuário:

```bash
# Desenvolvimento local
cd backend/sistema_home_care
python manage.py createsuperuser
```

```bash
# Via Docker (com os containers rodando)
docker compose exec backend python manage.py createsuperuser
```

Siga os prompts para informar nome de usuário, e-mail e senha.

## Comandos Docker

```bash
docker compose up -d              # Subir todos os serviços
docker compose down               # Parar todos os serviços
docker compose logs -f backend    # Ver logs do backend
docker compose logs -f frontend   # Ver logs do frontend
docker compose ps                 # Status dos containers
```

## Portas

| Serviço | Porta | Descrição |
|---|---|---|
| Backend | 8000 | API Django |
| Frontend | 5173 | Vite dev server |
| MinIO API | 9000 | API S3 |
| MinIO Console | 9001 | Interface web |

## Stack Tecnológica

- **Backend**: Django 5.2, DRF, SQLite, django-storages, boto3
- **Frontend**: React 19, Vite 8, TypeScript, Tailwind CSS 4
- **Storage**: MinIO (compatível com S3)
- **Linting**: oxlint (não ESLint)

## Documentação

Consulte a pasta `docs/` para documentação de processos e modelo de dados.
