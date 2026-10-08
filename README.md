# Sistema Home Care

Sistema de atendimento domiciliar desenvolvido como projeto acadÃªmico, com frontend em React e backend em Django REST Framework.

## RepositÃ³rio

GitHub: https://github.com/paulovictor001/sistema-home-care

## Funcionalidades

Atualmente o sistema possui:

- AutenticaÃ§Ã£o de usuÃ¡rios;
- Painel inicial do sistema;
- Cadastro e gerenciamento de pacientes;
- Gerenciamento de usuÃ¡rios;
- Gerenciamento de categorias;
- Gerenciamento de profissÃµes;
- AvaliaÃ§Ã£o inicial dos pacientes;
- HistÃ³rico e visualizaÃ§Ã£o de avaliaÃ§Ãµes;
- Cadastro e manutenÃ§Ã£o de tipos de necessidade;
- AtivaÃ§Ã£o e inativaÃ§Ã£o de tipos de necessidade;
- API REST para comunicaÃ§Ã£o entre frontend e backend.

## Stack TecnolÃ³gica

### Backend

- Python
- Django 5.2
- Django REST Framework
- SQLite
- django-storages
- boto3

### Frontend

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4

### Infraestrutura

- Docker
- Docker Compose
- MinIO, compatÃ­vel com armazenamento S3

## Estrutura do Projeto

```text
sistema-home-care/
â”œâ”€â”€ backend/
â”‚   â”œâ”€â”€ sistema_home_care/
â”‚   â”‚   â”œâ”€â”€ accounts/
â”‚   â”‚   â”œâ”€â”€ assessments/
â”‚   â”‚   â”œâ”€â”€ patients/
â”‚   â”‚   â”œâ”€â”€ professionals/
â”‚   â”‚   â””â”€â”€ sistema_home_care/
â”‚   â””â”€â”€ requirements.txt
â”œâ”€â”€ frontend/
â”‚   â””â”€â”€ sistema-home-care/
â”‚       â”œâ”€â”€ src/
â”‚       â””â”€â”€ package.json
â”œâ”€â”€ docs/
â”œâ”€â”€ docker-compose.yml
â”œâ”€â”€ .env.docker.example
â”œâ”€â”€ AGENTS.md
â””â”€â”€ README.md
```
