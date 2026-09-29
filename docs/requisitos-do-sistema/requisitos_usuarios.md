# Requisitos Funcionais — Gerenciamento de Usuários

## 1. Usuários
- Criar usuário com CPF, senha, e-mail, categoria e profissional vinculado.
- Permitir criar o profissional durante o cadastro do usuário.
- Consultar usuários.
- Visualizar usuário e profissional vinculado.
- Editar dados permitidos.
- Impedir troca do profissional vinculado.
- Inativar e reativar usuário.
- Sincronizar inativação/reativação com o profissional.
- Permitir exclusão definitiva somente ao Gerente.
- Excluir definitivamente o profissional vinculado junto com o usuário.

## 2. Autenticação
- Implementar login por CPF e senha.
- Impedir CPF duplicado.
- Impedir e-mail duplicado.
- Exigir e-mail.
- Disponibilizar recuperação de senha por e-mail.

## 3. Categorias
- Criar categorias.
- Permitir categorias sem usuários.
- Garantir exatamente uma categoria por usuário.
- Manter correspondência entre categoria e profissão.
- Criar automaticamente uma categoria ao criar profissão.
- Criar a nova categoria sem permissões.
- Atualizar automaticamente a categoria quando a profissão do profissional mudar.

## 4. Profissões
- Permitir ao Gerente criar profissão.
- Permitir editar profissão.
- Permitir inativar somente profissão sem profissionais vinculados.
- Permitir excluir somente profissão sem profissionais vinculados.
- Validar vínculos antes de inativar ou excluir.
- Permitir transferência de profissionais para outra profissão.

## 5. Permissões
- Configurar permissões por categoria.
- Configurar permissões por funcionalidade e ação.
- Permitir categorias sem permissões.
- Permitir ao Gerente alterar permissões da categoria de outro Gerente.
- Validar permissões antes de operações protegidas.

## 6. Dependências
O cadastro e os campos específicos do profissional devem ser tratados pelo módulo oficial de Profissionais.

## 7. Pontos ainda não definidos
Não foram definidos neste processo: política de senha, expiração de sessão, MFA, detalhes técnicos de recuperação de senha, auditoria detalhada e regras completas do cadastro de profissionais.