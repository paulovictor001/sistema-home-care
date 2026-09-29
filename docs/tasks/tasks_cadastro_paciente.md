# Tasks --- Processo de Cadastro do Paciente

## 1. Objetivo

Decompor o processo de **Cadastro do Paciente** em tarefas técnicas de
desenvolvimento.

A decomposição segue a orientação da documentação do projeto: primeiro
identificar a funcionalidade/processo e depois dividir o trabalho em
modelagem, backend, regras e frontend, evitando transformar cada campo
em uma task isolada. fileciteturn1file6

------------------------------------------------------------------------

## 2. Limite de escopo

Estas tasks contemplam somente o cadastro, consulta, visualização,
edição e controle cadastral do paciente.

Não serão criadas tasks com regras específicas de:

-   escala;
-   agendamento;
-   visita;
-   atendimento;
-   evolução;
-   reavaliação;
-   atualização do plano decorrente desses processos.

Esses processos ainda não estão suficientemente definidos na
documentação. fileciteturn1file8

Quando existir uma dependência futura, ela deverá ser registrada como
dependência/pendência, sem implementar uma regra antecipada.

------------------------------------------------------------------------

# 3. Modelagem

## TASK-CAD-PAC-001 --- Modelar entidade Patient

Criar a entidade `Patient` para representar o cadastro principal e
permanente do paciente.

### Campos definidos

-   `id`
-   `full_name`
-   `birth_date`
-   `cpf`
-   `rg`
-   `age`
-   `phone`
-   `gender`
-   `status`
-   `responsible_doctor_id`
-   `responsible_team_id`
-   `health_condition_id`
-   `created_at`
-   `updated_at`

### Observações

A documentação original apresenta `responsible_professional_id` e
`health_condition_id`; a separação entre médico e equipe foi definida
posteriormente no processo de negócio e deverá ser refletida na
modelagem final. fileciteturn1file3

E-mail e foto permanecem como pendências de definição.

------------------------------------------------------------------------

## TASK-CAD-PAC-002 --- Modelar entidade PatientAddress

Criar a entidade de endereço do paciente.

### Campos

-   `id`
-   `patient_id`
-   `zip_code`
-   `state`
-   `city`
-   `neighborhood`
-   `street`
-   `number`
-   `complement`
-   `reference_point`
-   `region`

### Regra

Um paciente terá apenas um endereço.

------------------------------------------------------------------------

## TASK-CAD-PAC-003 --- Modelar entidade HealthCondition

Criar a entidade cadastrável de doença/estado de saúde.

### Observação

A estrutura detalhada da entidade ainda não foi definida.

A task deverá preparar a estrutura básica necessária para relacionamento
com o paciente sem inventar atributos clínicos não definidos.

------------------------------------------------------------------------

## TASK-CAD-PAC-004 --- Modelar relacionamento com médico responsável

Relacionar o paciente a um profissional do tipo médico responsável.

A validação do tipo de profissional deverá respeitar o cadastro de
profissionais.

------------------------------------------------------------------------

## TASK-CAD-PAC-005 --- Modelar relacionamento com equipe responsável

Relacionar o paciente a uma equipe responsável.

A entidade Equipe deverá pertencer ao módulo de profissionais.

A estrutura completa da equipe será definida no processo próprio de
profissionais/equipes.

------------------------------------------------------------------------

## TASK-CAD-PAC-006 --- Garantir unicidade do CPF

Criar restrição de unicidade para o CPF do paciente.

A validação deverá existir tanto na aplicação quanto no banco de dados,
quando aplicável à arquitetura adotada.

------------------------------------------------------------------------

## TASK-CAD-PAC-007 --- Modelar status do paciente

Implementar o status do paciente com os valores definidos:

-   `ACTIVE`;
-   `INACTIVE`.

------------------------------------------------------------------------

# 4. Backend

## TASK-CAD-PAC-008 --- Criar endpoint de cadastro

Implementar operação para criação de paciente.

### Regras

-   somente gerente pode executar;
-   validar campos obrigatórios;
-   validar CPF;
-   impedir CPF duplicado;
-   validar médico responsável;
-   validar equipe responsável;
-   validar doença/estado de saúde;
-   validar endereço.

------------------------------------------------------------------------

## TASK-CAD-PAC-009 --- Criar endpoint de consulta/listagem

Implementar consulta paginada de pacientes.

### Filtros

-   nome;
-   CPF;
-   status;
-   região.

### Paginação

-   20 pacientes por página.

------------------------------------------------------------------------

## TASK-CAD-PAC-010 --- Criar endpoint de visualização

Implementar consulta dos dados completos do paciente conforme as
permissões do usuário.

------------------------------------------------------------------------

## TASK-CAD-PAC-011 --- Criar endpoint de edição

Implementar atualização dos dados cadastrais do paciente.

### Permissões

-   gerente;
-   médico;
-   enfermeiro.

### Restrição

Médicos e enfermeiros não podem alterar:

-   médico responsável;
-   equipe responsável.

Somente gerente pode alterar essas associações.

------------------------------------------------------------------------

## TASK-CAD-PAC-012 --- Criar endpoint de inativação

Implementar operação de inativação.

### Permissão

Somente gerente.

------------------------------------------------------------------------

## TASK-CAD-PAC-013 --- Criar endpoint de reativação

Implementar operação de reativação.

### Permissão

Somente gerente.

------------------------------------------------------------------------

## TASK-CAD-PAC-014 --- Implementar consulta por status

Garantir que:

-   listagem padrão apresente pacientes ativos;
-   filtro `INACTIVE` apresente inativos;
-   filtro `ALL` apresente ativos e inativos.

------------------------------------------------------------------------

## TASK-CAD-PAC-015 --- Implementar filtro por região

Permitir filtrar pacientes utilizando a região associada ao endereço.

A regra de origem da região a partir do bairro deverá ser respeitada
conforme a modelagem definida.

------------------------------------------------------------------------

## TASK-CAD-PAC-016 --- Implementar paginação

Implementar paginação com tamanho padrão de:

**20 pacientes por página.**

------------------------------------------------------------------------

# 5. Regras e autorização

## TASK-CAD-PAC-017 --- Implementar autorização de cadastro

Permitir cadastro somente para usuários com perfil de gerente.

### Implementação — TA-19

O `POST /api/pacientes/` é protegido no backend por
`PatientViewSet.get_permissions()`, com `IsGerente` e
`RequirePermission("pacientes.create")`. Os dois controles existentes são
obrigatórios: o grupo `GERENTE` representa o perfil legado, sincronizado
pelos serviços de usuários com a categoria; a permissão granular é
consultada na categoria. A exceção existente de superusuário na checagem
granular permanece, sem dispensar o grupo `GERENTE`.

A autenticação permanece em `CookieJWTAuthentication`, com validação do
JWT pelo SimpleJWT e cookies HttpOnly. Sem autenticação ou com JWT inválido,
a API retorna `401`; usuário autenticado sem perfil de gerente ou gerente
comum sem `pacientes.create` recebe `403`; gerente autorizado com dados
válidos recebe `201`.

Cobertura em `patients/tests.py`, na classe `PatientCreateAPITests`,
reutilizando os helpers existentes e o login real com cookies. Os testes
também verificam que recusas não criam paciente, endereço ou auditoria e
que conceder `pacientes.create` a outro perfil não permite cadastrar.
Regressão: `python manage.py test patients accounts --noinput`.

------------------------------------------------------------------------

## TASK-CAD-PAC-018 --- Implementar autorização de visualização

Permitir visualização para gerente e equipe, conforme as permissões
definidas.

A diferenciação entre funções dentro da equipe ainda é uma pendência.

------------------------------------------------------------------------

## TASK-CAD-PAC-019 --- Implementar autorização de edição

Permitir edição para:

-   gerente;
-   médico;
-   enfermeiro.

------------------------------------------------------------------------

## TASK-CAD-PAC-020 --- Restringir alteração de médico/equipe

Garantir que somente o gerente possa alterar:

-   médico responsável;
-   equipe responsável.

Essa autorização deve ser validada no backend e não somente ocultada na
interface.

------------------------------------------------------------------------

## TASK-CAD-PAC-021 --- Restringir inativação

Garantir que somente gerente possa inativar pacientes.

------------------------------------------------------------------------

## TASK-CAD-PAC-022 --- Restringir reativação

Garantir que somente gerente possa reativar pacientes.

------------------------------------------------------------------------

# 6. Frontend

## TASK-CAD-PAC-023 --- Criar tela de listagem

Criar tela de consulta de pacientes com:

-   listagem;
-   busca por nome;
-   busca por CPF;
-   filtro por status;
-   filtro por região;
-   paginação de 20 registros.

------------------------------------------------------------------------

## TASK-CAD-PAC-024 --- Criar formulário de cadastro

Criar formulário para gerente cadastrar paciente.

Campos:

-   nome completo;
-   data de nascimento;
-   CPF;
-   RG;
-   idade;
-   telefone;
-   sexo;
-   status;
-   médico responsável;
-   equipe responsável;
-   doença/estado de saúde;
-   endereço.

------------------------------------------------------------------------

## TASK-CAD-PAC-025 --- Criar tela de visualização

Criar tela para visualização dos dados do paciente conforme as
permissões do usuário.

------------------------------------------------------------------------

## TASK-CAD-PAC-026 --- Criar formulário de edição

Permitir edição dos dados do paciente para:

-   gerente;
-   médico;
-   enfermeiro.

Para médico e enfermeiro, os campos de médico responsável e equipe
responsável deverão permanecer bloqueados.

------------------------------------------------------------------------

## TASK-CAD-PAC-027 --- Criar ações de status

Disponibilizar ações de:

-   inativar;
-   reativar.

As ações deverão aparecer somente para gerente.

------------------------------------------------------------------------

# 7. Validações

## TASK-CAD-PAC-028 --- Validar campos obrigatórios

Implementar validação dos campos definidos como obrigatórios.

------------------------------------------------------------------------

## TASK-CAD-PAC-029 --- Validar CPF

Implementar validação de formato e unicidade do CPF.

------------------------------------------------------------------------

## TASK-CAD-PAC-030 --- Validar endereço

Validar os campos obrigatórios do endereço conforme a regra definida
para o cadastro.

------------------------------------------------------------------------

## TASK-CAD-PAC-031 --- Validar relacionamentos

Validar:

-   médico responsável existente e válido;
-   equipe responsável existente e válida;
-   doença/estado de saúde existente e válida.

------------------------------------------------------------------------

# 8. Auditoria

## TASK-CAD-PAC-032 --- Preparar alterações para auditoria

As operações relevantes do cadastro deverão ser compatíveis com o
requisito geral de auditoria do sistema.

Registrar, conforme a arquitetura de auditoria que será definida:

-   criação;
-   edição;
-   alteração de status;
-   alteração do médico responsável;
-   alteração da equipe responsável.

A definição completa da auditoria permanece pendente.

------------------------------------------------------------------------

# 9. Testes

## TASK-CAD-PAC-033 --- Testar cadastro

Cobrir:

-   cadastro válido;
-   campos obrigatórios;
-   CPF duplicado;
-   relacionamentos inválidos;
-   usuário sem permissão.

------------------------------------------------------------------------

## TASK-CAD-PAC-034 --- Testar consulta

Cobrir:

-   busca por nome;
-   busca por CPF;
-   filtro ativo;
-   filtro inativo;
-   filtro todos;
-   filtro por região;
-   paginação de 20 registros.

------------------------------------------------------------------------

## TASK-CAD-PAC-035 --- Testar edição

Cobrir:

-   gerente editando;
-   médico editando;
-   enfermeiro editando;
-   tentativa de alteração de médico/equipe por médico;
-   tentativa de alteração de médico/equipe por enfermeiro.

------------------------------------------------------------------------

## TASK-CAD-PAC-036 --- Testar status

Cobrir:

-   inativação pelo gerente;
-   tentativa de inativação por outros perfis;
-   reativação pelo gerente;
-   tentativa de reativação por outros perfis;
-   comportamento da listagem de pacientes inativos.

------------------------------------------------------------------------

# 10. Pendências que não devem virar implementação ainda

As seguintes questões permanecem abertas e não devem ser resolvidas por
inferência nas tasks:

-   atualização automática da idade;
-   valores permitidos para sexo;
-   múltiplas doenças/estados de saúde;
-   estrutura completa de `HealthCondition`;
-   estrutura completa de `Team`;
-   regra detalhada de bairro → região;
-   e-mail;
-   foto;
-   granularidade das permissões de visualização dos membros da equipe;
-   regras específicas de escala;
-   regras específicas de agendamento;
-   regras específicas de visita;
-   regras específicas de atendimento;
-   regras específicas de evolução;
-   regras de reavaliação.

Esses itens deverão gerar novas decisões/requisitos quando os
respectivos processos forem detalhados.

------------------------------------------------------------------------

# 11. Critério geral de decomposição

Não criar uma task específica para cada campo do paciente.

Os campos devem ser tratados dentro das funcionalidades de:

-   modelagem;
-   cadastro;
-   consulta;
-   visualização;
-   edição;
-   validação;
-   autorização.

Essa abordagem segue a orientação da documentação do projeto para
transformar processos em tasks técnicas. fileciteturn1file6
