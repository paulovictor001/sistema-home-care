# Regras de Negócio — Gerenciamento de Usuários

## 1. Objetivo
Controlar usuários que possuem acesso ao sistema, suas categorias, permissões e vínculo obrigatório com profissionais.

## 2. Usuário e profissional
- Todo usuário deve estar obrigatoriamente vinculado a um profissional.
- O profissional pode ser criado durante o cadastro do usuário, usando o cadastro oficial de Profissionais.
- Um usuário não pode trocar o profissional vinculado. Para outro profissional ter acesso, deve ser criado outro usuário.
- A exclusão definitiva do usuário exclui definitivamente o profissional vinculado.
- Se referências protegidas impedirem a exclusão, a operação deve ser bloqueada com explicação; não remover registros dependentes para forçar a exclusão.

## 3. Categorias
- Todo usuário possui exatamente uma categoria.
- A categoria deve corresponder à profissão do profissional vinculado.
- Categorias são flexíveis e não ficam limitadas a Médico, Enfermeiro, Gerente etc.
- Uma categoria pode existir sem usuários.
- Ao criar uma profissão, o sistema cria automaticamente uma categoria com o mesmo nome.
- Cada profissão corresponde a uma única categoria por relação formal; renomear profissão renomeia sua categoria na mesma operação, preservando suas permissões. Categoria vinculada a profissão não pode ser excluída isoladamente.
- A nova categoria começa sem permissões.
- Ao mudar a profissão de um profissional, a categoria do usuário vinculado muda automaticamente para a categoria correspondente à nova profissão, passando a utilizar suas permissões.

## 4. Profissões
- Profissões são cadastráveis e flexíveis.
- Somente o Gerente administra criação, edição, inativação e exclusão definitiva.
- Profissão com profissionais vinculados não pode ser excluída.
- Para excluir, todos os profissionais devem ser transferidos para outra profissão.
- Profissão com profissionais vinculados não pode ser inativada.
- Para inativar, todos os profissionais devem ser transferidos para outra profissão. Os profissionais permanecem ativos.

## 5. Permissões
- As permissões são granulares por funcionalidade e ação.
- O Gerente configura as permissões das categorias.
- Um Gerente pode alterar as permissões da categoria de outro Gerente.
- Categorias novas não recebem permissões automaticamente.

## 6. Autenticação
- Login por CPF e senha.
- CPF é obrigatório e único.
- E-mail é obrigatório e único.
- E-mail é utilizado para recuperação de senha.
- A recuperação de senha por e-mail faz parte do MVP e requer SMTP configurável por ambiente.
- A solicitação não revela se o e-mail está cadastrado; a confirmação exige token de uso único e dentro da validade configurada.

## 7. Status
- Inativar um usuário inativa automaticamente seu profissional.
- Reativar um usuário reativa automaticamente seu profissional.
- O vínculo entre usuário e profissional permanece registrado.

## 8. Exclusão
- Somente o Gerente pode excluir definitivamente usuários.
- A exclusão definitiva do usuário também exclui definitivamente o profissional vinculado.
- Se qualquer referência protegida bloquear essa exclusão, responder com erro de domínio que explique o vínculo impeditivo.

## 9. Limites
As regras específicas do cadastro de profissionais pertencem ao processo de Gerenciamento de Profissionais. Regras de equipes, escala, agendamento, visita, atendimento e evolução não são definidas neste processo.
