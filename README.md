# Sistema Home Care

Sistema de atendimento domiciliar desenvolvido como projeto acadêmico, com frontend em React e backend em Django REST Framework.

## Repositório

GitHub: https://github.com/paulovictor001/sistema-home-care

## Funcionalidades

Atualmente o sistema possui:

- Autenticação de usuários
- Painel inicial do sistema
- Cadastro e gerenciamento de pacientes
- Gerenciamento de usuários
- Gerenciamento de categorias
- Gerenciamento de profissões
- Avaliação inicial dos pacientes
- Histórico e visualização de avaliações
- Cadastro e manutenção de tipos de necessidade
- Ativação e inativação de tipos de necessidade
- API REST para comunicação entre frontend e backend

## Stack Tecnológica

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
- MinIO, compatível com armazenamento S3

## Estrutura do Projeto

```text
sistema-home-care/
|-- backend/
|   |-- sistema_home_care/
|   |   |-- accounts/
|   |   |-- assessments/
|   |   |-- patients/
|   |   |-- professionals/
|   |   `-- sistema_home_care/
|   `-- requirements.txt
|-- frontend/
|   `-- sistema-home-care/
|       |-- src/
|       `-- package.json
|-- docs/
|-- docker-compose.yml
|-- .env.docker.example
|-- AGENTS.md
`-- README.md
```

## Pré-requisitos

- Git
- Docker
- Docker Compose

## Execução com Docker

Clone o repositório:

git clone https://github.com/paulovictor001/sistema-home-care.git
cd sistema-home-care

Crie o arquivo de ambiente.

### Windows

copy .env.docker.example .env.docker

### Linux/macOS

cp .env.docker.example .env.docker

Configure o arquivo .env.docker conforme necessário.

Suba os serviços:

docker compose up -d

Execute as migrações:

docker compose exec backend python manage.py migrate

Verifique os containers:

docker compose ps

## Acesso ao sistema

Após iniciar os serviços:

| Serviço       | Endereço              |
| ------------- | --------------------- |
| Frontend      | http://localhost:5173 |
| Backend       | http://localhost:8000 |
| MinIO Console | http://localhost:9001 |

## MinIO

O projeto utiliza o MinIO para armazenamento compatível com S3.

Console:

http://localhost:9001

O bucket home-care-media deve ser criado no console do MinIO antes do envio de arquivos pelo backend.

## Desenvolvimento

### Backend

O backend está localizado em:

backend/sistema_home_care

Para execução local com Python:

cd backend/sistema_home_care
python manage.py migrate
python manage.py runserver

### Frontend

O frontend está localizado em:

frontend/sistema-home-care

Instale as dependências:

npm install

Execute o servidor de desenvolvimento:

npm run dev

## Git e Branches

O projeto utiliza Git para controle de versão e GitHub para hospedagem do repositório.

O desenvolvimento é organizado utilizando branches de funcionalidade, mantendo a main como branch principal.

Exemplo:

main
└── feat/nome-da-task

As funcionalidades são desenvolvidas em branches próprias e posteriormente integradas à main por meio de Pull Requests.

## Controle de Versão

O projeto possui histórico de commits relacionado ao desenvolvimento das funcionalidades, correções e documentação.

Também são utilizados Pull Requests para integração das funcionalidades na branch principal.

## Evidências de Execução

O sistema pode ser executado localmente utilizando Docker Compose.

Durante a execução, o frontend é disponibilizado em:

http://localhost:5173

e o backend em:

http://localhost:8000

A execução permite demonstrar o funcionamento da aplicação, incluindo autenticação, painel, gerenciamento de pacientes e demais funcionalidades implementadas no projeto.

## Documentação

A documentação complementar do projeto está disponível na pasta:

docs/

Ela contém documentos relacionados ao desenvolvimento, requisitos, regras de negócio e acompanhamento das tarefas.
