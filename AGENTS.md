# AGENTS.md

## Project Structure

```
sistema-home-care/
├── backend/                    # Django REST API
│   ├── sistema_home_care/      # Django project root (manage.py here)
│   │   ├── sistema_home_care/  # Settings, urls, wsgi
│   │   └── db.sqlite3
│   ├── venv/                   # Python virtual environment
│   └── .env                    # SECRET_KEY, DEBUG (never commit)
├── frontend/
│   └── sistema-home-care/      # React app (run npm commands here)
│       ├── src/
│       └── package.json
└── docs/                       # Process docs and data models
```

## Commands

### Backend (Django)
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

## Tech Stack

- **Backend**: Django 5.2, DRF 3.18, SQLite, django-cors-headers, python-dotenv, django-storages, boto3
- **Frontend**: React 19, Vite 8, TypeScript 6, Tailwind CSS 4 (via @tailwindcss/vite), oxlint

## Docker

```bash
docker compose up -d              # Start all services
docker compose down               # Stop all services
docker compose logs -f backend    # Watch backend logs
docker compose logs -f frontend   # Watch frontend logs
```

### Services

| Service | Port | Description |
|---|---|---|
| backend | 8000 | Django API |
| frontend | 5173 | Vite dev server |
| minio | 9000 (API), 9001 (Console) | S3-compatible storage |

MinIO credentials: `minioadmin` / `minioadmin`

### Environment

- `.env.docker` — Docker environment variables (never commit)

## Key Details

- Frontend dev server (port 5173) is whitelisted in CORS_ALLOWED_ORIGINS
- Backend loads SECRET_KEY from `backend/.env` via python-dotenv
- Frontend linting uses **oxlint**, not ESLint
- Frontend build runs TypeScript check (`tsc -b`) before Vite build
- `frontend/sistema-home-care/` is the actual app root — not `frontend/`
