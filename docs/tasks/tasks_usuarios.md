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