# Tasks — Gerenciamento de Usuários

## 1. Modelagem
- Modelar entidade Usuário.
- Modelar Categoria.
- Modelar Profissão.
- Modelar Permissões.
- Modelar vínculo obrigatório Usuário–Profissional.
- Garantir uma categoria por usuário.
- Registrar status e timestamps necessários.

## 2. Backend — Usuários
- Implementar criação de usuário.
- Validar CPF único.
- Validar e-mail único.
- Exigir categoria e profissional.
- Permitir criação do profissional durante o cadastro.
- Implementar consulta e visualização.
- Implementar edição dos dados permitidos.
- Impedir troca do profissional.
- Implementar inativação e reativação.
- Sincronizar status do profissional.
- Implementar exclusão definitiva pelo Gerente.
- Garantir exclusão do profissional vinculado.

## 3. Backend — Autenticação
- Implementar login por CPF e senha.
- Impedir acesso de usuário inativo.
- Implementar recuperação de senha por e-mail.
- Definir posteriormente detalhes de tokens, expiração e demais regras técnicas.

## 4. Backend — Categorias
- Implementar criação de categorias.
- Permitir categorias sem usuários.
- Criar automaticamente categoria ao criar profissão.
- Criar categoria nova sem permissões.
- Atualizar categoria quando a profissão do profissional mudar.
- Garantir uma única categoria por usuário.

## 5. Backend — Profissões
- Implementar criação e edição.
- Criar categoria correspondente automaticamente.
- Bloquear inativação se houver profissionais vinculados.
- Bloquear exclusão se houver profissionais vinculados.
- Implementar transferência de profissionais para outra profissão.

## 6. Backend — Permissões
- Implementar permissões granulares.
- Relacionar permissões às categorias.
- Permitir configurar permissões pelo Gerente.
- Permitir categoria sem permissões.
- Permitir alteração das permissões da categoria de outro Gerente.
- Aplicar autorização no backend.

## 7. Frontend
- Criar listagem de usuários.
- Criar cadastro de usuário.
- Permitir iniciar cadastro do profissional.
- Criar edição de usuário.
- Criar ações de inativação e reativação.
- Criar exclusão definitiva com confirmação.
- Criar tela de categorias.
- Criar tela de profissões.
- Criar tela de configuração de permissões.

## 8. Segurança e auditoria
- Armazenar senhas com hash seguro.
- Nunca armazenar senha em texto puro.
- Aplicar autorização no backend.
- Estruturar auditoria de alterações relevantes.

## 9. Validação
Testar:
- CPF e e-mail únicos;
- usuário com exatamente uma categoria;
- vínculo obrigatório com profissional;
- impossibilidade de trocar profissional;
- exclusão do usuário e profissional;
- sincronização de status;
- criação automática de categoria;
- categoria inicialmente sem permissões;
- atualização de categoria após mudança de profissão;
- bloqueio de inativação/exclusão de profissão com vínculos;
- permissões granulares.

## 10. Tasks consolidadas para finalização do MVP (23/11/2026)

Executar em etapas na ordem abaixo. Cada etapa inclui seus testes focados; ao concluir, interromper e aguardar autorização do usuário antes de iniciar a próxima.

### Etapa 1 — Integridade profissão/categoria

- Adicionar relação formal 1:1 entre profissão e categoria e migrar dados existentes com segurança.
- Detectar e abortar a migração se houver nomes duplicados, mapeamento ambíguo ou conflito; preservar todas as permissões existentes.
- Tornar criação/renomeação de profissão e sincronização do nome da categoria atômicas em serviço compartilhado pela API e admin.
- Impedir criação/exclusão independente de categoria que seja espelho de profissão; manter categorias avulsas somente se não associadas a profissão.
- Testar migração, integridade, rename, permissões preservadas e cenários de conflito.

### Etapa 2 — Exclusão protegida e invariantes de vínculo

- Capturar `ProtectedError` na exclusão e retornar resposta de domínio explicativa e estável.
- Garantir que manager, admin e API não criem conta sem profissional; manter permitida a existência de profissional livre.
- Ajustar bootstrap de superusuário e demais caminhos suportados para criar vínculo consistente e sincronizar a categoria correspondente.
- Testar exclusão com/sem referências, criação nos caminhos suportados e profissionais livres.

### Etapa 3 — Edição de profissão na interface

- [x] Adicionar edição de nome e estados de carregamento/erro na tela de profissões, usando o endpoint transacional.
- [x] Testar validações de nome duplicado e feedback da operação (`accounts.tests_users.ProfessionCategoryTests`: 11 testes; frontend build).

### Etapa 4 — Recuperação de senha por e-mail

- [x] Implementar solicitação e confirmação com token seguro, uso único e validade limitada, sem revelar se o e-mail existe.
- [x] Configurar backend e parâmetros SMTP por ambiente, sem credenciais versionadas; permitir backend em memória nos testes.
- [x] Testar token válido, inválido, expirado, reutilizado, usuário inativo e respostas sem enumeração de contas (`accounts.tests`: 12 testes).
- [x] Adicionar o fluxo de solicitar link e definir nova senha na tela de login; build aprovado.

### Etapa 5 — Validação integrada e atualização documental

- [x] Rodar suítes focadas de usuários, lint/build aplicáveis e verificações de migrations; registrar comandos e resultados.
- [x] Confirmar doc-mãe, regras e requisitos alinhados à implementação; auditoria permanece mínima, sem UI.

Validação em 23/11/2026: `python manage.py test accounts.tests accounts.tests_users --verbosity 0` (50 testes aprovados); `python manage.py makemigrations --check --dry-run` (nenhuma migration pendente); `npm run lint` (aprovado, com warning preexistente em `src/pages/Resources.tsx:20`); `npm run build` (aprovado).
