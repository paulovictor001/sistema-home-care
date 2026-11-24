# 03 — Auditoria Técnica

> Etapa 3 da auditoria. Análise estática de Django/DRF, React, banco, MinIO, Docker Compose e integrações. Nenhum código de aplicação foi alterado e nenhum teste/comando de validação foi executado. Data: 21/11/2026.

## Escopo e método

Foram considerados `00_AUDITORIA_MEMORIA.md` (fonte de continuidade), `01_INVENTARIO.md`, `02_AUDITORIA_PROCESSOS.md`, a estrutura do repositório, configurações, apps, models, serializers, views, services, permissões, URLs, migrations, clientes React, rotas, Dockerfiles e Compose. Arquivos com segredos (`.env`, `.env.docker`, `acessos.md`) não foram abertos. O arquivo `00_CONTEXTO_E_CONTINUIDADE.md` mencionado no pedido não existe; a própria memória registra que `00_AUDITORIA_MEMORIA.md` é a fonte oficial.

“Comprovado” significa que a condição aparece diretamente no código/configuração/documentação examinada. “Risco a validar” indica consequência que requer execução, ambiente de implantação ou decisão de domínio. Não foram feitas requisições HTTP nem inspeções do conteúdo do banco.

## Crítico

Nenhum achado crítico foi confirmado nesta inspeção estática. A classificação não substitui validação em ambiente implantado.

## Alto

| ID | Achado e evidência | Estado / impacto |
|---|---|---|
| AT-01 | **Proteção CSRF não está integrada à autenticação JWT por cookie.** `CookieJWTAuthentication` lê o cookie e autentica a requisição, mas não valida token CSRF; os endpoints mutáveis usam cookies enviados automaticamente pelo navegador. CORS restrito a `localhost:5173` não substitui proteção CSRF. | **Comprovado no código; risco de exploração depende da implantação e atributos/origem dos cookies.** Requisições cross-site podem tentar ações autenticadas. Exigir proteção CSRF explícita para métodos inseguros antes de disponibilizar a API em ambiente acessível. |
| AT-02 | **Configuração de desenvolvimento e segredos do MinIO no Compose.** `settings.py` fixa `DEBUG=True`, `ALLOWED_HOSTS=[]`, usa SQLite e não lê `DEBUG` do ambiente. O Compose executa `runserver`, publica portas e define credenciais padrão do MinIO diretamente no arquivo. | **Comprovado.** A configuração não é apropriada para exposição de produção; debug pode revelar detalhes internos e credenciais padrão reduzem a proteção do armazenamento. O valor real de `SECRET_KEY` não foi lido nem exposto. |
| AT-03 | **Volume do banco SQLite aponta para diretório diferente do arquivo do banco.** Django usa `BASE_DIR / 'db.sqlite3'` (`/app/sistema_home_care/db.sqlite3` no container), enquanto `db_data` é montado em `/app/sistema_home_care/db`. | **Comprovado pela configuração; perda de persistência ao recriar container é risco altamente provável.** O volume nomeado não cobre o arquivo configurado. Confirmar com teste de ciclo de vida antes de qualquer operação com dados persistidos. |

## Médio

| ID | Achado e evidência | Estado / impacto |
|---|---|---|
| AT-04 | **MinIO está configurado, mas não há fluxo de arquivo no domínio.** `settings.py` declara `DEFAULT_FILE_STORAGE` e variáveis S3; os models e frontend inventariados não possuem campos/fluxos efetivos de upload ou download. O bucket depende de criação manual e não há serviço de inicialização que o garanta. | **Ausência de uso comprovada; funcionamento de storage não validado.** A dependência adiciona configuração operacional sem benefício atual e upload futuro pode falhar por bucket ausente. Além disso, `DEFAULT_FILE_STORAGE` é a configuração legada do Django 5.2; validar migração para `STORAGES` e backend resolvido em runtime antes de depender dela. |
| AT-05 | **Integração frontend/backend depende de configuração de desenvolvimento fixa.** React usa `VITE_API_URL` ou `http://localhost:8000`; Django fixa CORS e CSRF trusted origin em `http://localhost:5173`. O Compose não fornece `VITE_API_URL` ao build/serviço frontend. | **Comprovado; funcionamento fora do host local precisa de validação.** Acesso por hostname, domínio ou proxy distinto pode falhar por URL/CORS/CSRF. Não há configuração separada por ambiente identificada. |
| AT-06 | **Refresh JWT trata falhas de forma excessivamente ampla e não trata explicitamente usuário inexistente.** `RefreshView` captura `Exception` e retorna 401 genérico; o refresh busca usuário pelo `user_id`. A configuração de cookie usa `SameSite=Lax`, mas não foi encontrada checagem CSRF no fluxo. | **Comportamento comprovado; impacto operacional/segurança precisa de validação.** Erros inesperados ficam indistinguíveis de sessão expirada e podem ocultar falhas. Associado a AT-01. |
| AT-07 | **Tratamento de erros no React é local e limitado.** `apiJson` extrai prioritariamente `detail`; respostas de validação DRF costumam trazer campos/estruturas aninhadas. Não foi identificado mecanismo global de erro, notificação ou boundary. | **Comprovado na camada comum; apresentação inconsistente em telas deve ser validada por fluxo.** Erros de formulário podem perder contexto ou aparecer de forma desigual. |
| AT-08 | **Cobertura de testes frontend não está integrada aos scripts/dependências declarados.** `package.json` declara apenas `dev`, `build`, `lint`, `preview`; memória/inventário registram arquivos de teste e uso de Playwright sem dependência declarada no manifesto. Não há pipeline CI identificado. | **Comprovado pelos arquivos declarativos/inventário; executabilidade dos testes não verificada.** Regressões de interface e integração podem não ser detectadas automaticamente. Testes backend existentes também não foram executados nesta auditoria. |
| AT-09 | **Consistência migrations ↔ models não foi confirmada por execução.** Há migrations versionadas e o inventário relata verificação anterior de `makemigrations --check` em uma branch/etapa específica; a auditoria atual não executou verificação contra o estado presente. | **Risco a validar.** Não afirmar drift; executar `makemigrations --check` e inspeção do plano de migrations no ambiente controlado antes de release. |
| AT-10 | **SQLite é o único banco configurado.** Não há backend relacional de produção nem configuração separada identificada. | **Comprovado.** SQLite é adequado ao desenvolvimento atual, mas limita concorrência/implantação multi-instância e a configuração de volume já diverge (AT-03). Avaliar banco de produção conforme escala e operação pretendidas. |

## Baixo

| ID | Achado e evidência | Estado / impacto |
|---|---|---|
| AT-11 | **Organização backend é por app e majoritariamente clara, mas responsabilidades variam.** `accounts`, `care_plans` e `care_scales` possuem services; `patients` e `assessments` concentram regras em views/serializers. | **Comprovado; débito de manutenção.** A localização variável aumenta custo de mudança e dificulta teste unitário isolado; priorizar extração quando houver regra transacional compartilhada ou crescimento. |
| AT-12 | **Frontend organiza páginas, componentes, contexts e clientes por domínio, mas há páginas grandes e tratamento de formulário específico.** Estado global é essencialmente autenticação em Context; não há biblioteca de formulários/cache de dados declarada. | **Comprovado; não é defeito por si só.** Monitorar duplicação e complexidade; extrair componentes/hooks conforme repetição real. |
| AT-13 | **Configuração global contém defaults de ambiente pouco explícitos.** `TIME_ZONE='UTC'`, idioma `en-us`, `DEBUG` fixo, CORS/CSRF fixos; variáveis S3 podem estar vazias fora do Compose. | **Comprovado; efeito depende do ambiente.** Datas e mensagens podem divergir da expectativa local brasileira; falhas S3 só aparecem quando o storage for usado. |

## Melhoria recomendada

| ID | Recomendação | Base |
|---|---|---|
| AT-14 | Criar configuração explícita por ambiente, com validação de variáveis obrigatórias, `DEBUG` desligado fora do desenvolvimento, hosts/origens configuráveis, HTTPS/cookies seguros e servidor WSGI/ASGI de produção. | AT-02, AT-05, AT-13. |
| AT-15 | Proteger requisições autenticadas por cookie contra CSRF, documentar política de origem e testar login, refresh, logout e métodos mutáveis em navegador. | AT-01, AT-06. |
| AT-16 | Corrigir o destino de persistência do SQLite no Compose ou migrar para banco de serviço; validar persistência após recriação usando dados descartáveis. | AT-03, AT-10. |
| AT-17 | Definir se MinIO será usado. Se sim, configurar `STORAGES`, provisionar bucket idempotentemente, separar credenciais por ambiente, definir política privada e testar upload/download/autorização/erros. Se não, retirar configuração não utilizada em trabalho futuro. | AT-04. |
| AT-18 | Adicionar configuração de integração frontend/API por ambiente e tratamento uniforme de erros de validação (incluindo campos DRF), mantendo mensagens seguras para o usuário. | AT-05, AT-07. |
| AT-19 | Incorporar execução automatizada dos testes e verificações estáticas em CI; declarar dependências/comandos de teste frontend e registrar cobertura. | AT-08, AT-09. |
| AT-20 | Planejar consistência e integridade relacional: revisão de `on_delete`, constraints/índices e unicidade composta em todos os models, junto a `makemigrations --check` e inspeção do schema real. | Inspeção estática não determina todas as garantias efetivas no SQLite; validação pendente. |

## Avaliação por área

### Django e API

- Apps separados por domínio; `accounts`, `patients`, `professionals`, `assessments`, `care_plans` e `care_scales` estão registrados. `professionals` permanece explicitamente um stub.
- Models expressam relações por FK/OneToOne e migrations por app. O histórico de auditoria usa relações `SET_NULL` conforme inventário; exclusões e garantias de cada constraint não foram verificadas com schema/runtime nesta etapa.
- DRF usa routers e actions; responsabilidades transacionais estão mais centralizadas em `care_plans/services.py`, `care_scales/services.py` e `accounts/services.py`. Outros apps combinam view/serializer.
- Autenticação é JWT em cookie HttpOnly com fallback para Authorization. Autorização combina grupos e permissões granulares; diferenças entre guardas frontend e API já têm exemplos documentados na etapa funcional, incluindo telas protegidas apenas por autenticação quando a API precisa ser a autoridade final.
- Validações de domínio e erros HTTP estão distribuídos por serializers, permissions e services. Não se presume consistência integral sem testes de integração executados.
- Sem evidência estática suficiente para declarar falha geral de transações ou migrations; validação de migrations e concorrência permanece pendente (AT-09).

### React

- Organização por páginas, componentes reutilizáveis, Context de autenticação e módulos `lib` por domínio. Rotas usam `RequireAuth` e `RequireGerente`; autorização de interface melhora UX, mas não substitui controles backend.
- `api.ts` inclui cookies e tentativa única de refresh sincronizada; erros de API são convertidos em `ApiError`. A extração de erro é centrada em `detail` e não há handler visual global identificado (AT-07).
- Formulários são implementados por página/componentes; não há framework de formulários ou cache global de requisições declarado. Isso é escolha de simplicidade, com risco de inconsistência conforme o número de telas cresce.
- Processos Agendamento e Visita não têm tela/cliente/rota, conforme etapa 2. A tela de tipos de necessidade chama rota inexistente segundo a auditoria funcional; isso é problema comprovado de integração em escopo existente.
- Testes existem como arquivos, porém scripts/dependências de execução não estão declarados de forma completa; nenhum foi rodado.

### Banco de dados

- Banco configurado: SQLite no arquivo `backend/sistema_home_care/db.sqlite3`; migrations versionadas para os apps existentes.
- Os modelos cobrem usuários/profissionais, pacientes/endereço, avaliações/necessidades/recursos, planos e escalas. Processos de Agendamento, Visita e Atendimento permanecem fora do schema.
- O Compose não persiste o arquivo configurado (AT-03). Índices, constraints e correspondência exata de cada migration não foram inspecionados exaustivamente nem consultados no banco real; não se declara duplicidade ou drift sem essa verificação.

### MinIO e integração

- Compose executa `pgsty/silo`, publica API/console, persiste `/data` e aguarda healthcheck antes do backend.
- Django tem variáveis de endpoint/bucket/credenciais e dependências S3, mas não há uso de arquivo em models ou fluxos frontend identificados. Bucket é pré-requisito manual; nenhuma inicialização automática observada.
- O healthcheck do serviço confirma apenas disponibilidade do serviço, não existência do bucket nem operação de upload/download pelo Django. Comunicação efetiva Django↔MinIO não foi exercitada.

### Docker Compose e comunicação dos componentes

- Há serviços `backend`, `frontend` e `minio` na rede padrão; backend depende da saúde do MinIO, frontend não tem `depends_on` do backend. Portas são publicadas no host. Volumes de MinIO e frontend são declarados; volume de banco tem destino divergente (AT-03).
- Backend usa `runserver`; frontend usa Vite dev server; ambos montam código local. A configuração representa desenvolvimento, não implantação de produção.
- React↔Django: cliente usa `localhost:8000`, `credentials: include`; URLs/credenciais e rotas estão conectadas em fluxo geral. CORS cobre localhost, mas não hosts externos e há endpoint de tipos órfão registrado na etapa 2.
- Django↔banco: Django abre SQLite em caminho local ao container, enquanto o volume Compose cobre outra pasta; comunicação com arquivo local é configuração comprovada, persistência Docker é inconsistente.
- Django↔MinIO: configuração declarada sem fluxo de armazenamento; comunicação funcional não demonstrada.

## Limitações e validações pendentes

- Não foram executados testes, `check`, `makemigrations --check`, build/lint, containers, chamadas de API nem operações de storage, em respeito ao escopo de auditoria somente leitura registrado na memória.
- Não foram abertos arquivos de credenciais nem o banco SQLite. Portanto, o relatório não afirma exposição de valores secretos, conteúdo/dados pessoais, status real do bucket, nem comportamento runtime.
- Antes de implantação, validar os achados de configuração e integração em ambiente descartável, sem dados reais, e fechar os riscos AT-01 a AT-10.

---

**Conclusão da etapa 3:** os principais riscos técnicos comprovados concentram-se em segurança da autenticação por cookie, configurações de desenvolvimento, persistência do SQLite no Compose e integração MinIO apenas declarativa. A organização por domínio está estabelecida e a API/frontend têm comunicação geral, com lacunas de processo e configurações de ambiente. Próxima etapa: **Etapa 4 — Auditoria de regras e requisitos**.
