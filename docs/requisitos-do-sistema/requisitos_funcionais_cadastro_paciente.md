# Requisitos Funcionais --- Cadastro do Paciente

## 1. Objetivo

Definir os requisitos funcionais do processo de **Cadastro do Paciente**
para o sistema de gestão de atendimento domiciliar particular.

O cadastro representa o paciente e suas informações básicas e
relativamente estáveis, servindo como base para os processos
posteriores. A documentação diferencia cadastro de avaliação: o cadastro
identifica quem é o paciente, enquanto a avaliação registra uma situação
específica e atual. fileciteturn0file0L74-L117

------------------------------------------------------------------------

## 2. Escopo

Este documento contempla:

-   cadastro de paciente;
-   consulta e listagem;
-   visualização;
-   edição;
-   endereço;
-   médico responsável;
-   equipe responsável;
-   doença/estado de saúde;
-   ativação e inativação;
-   reativação;
-   filtros;
-   paginação;
-   permissões relacionadas ao cadastro.

### Fora do detalhamento atual

Os seguintes processos ainda não estão suficientemente definidos e não
terão requisitos funcionais detalhados neste documento:

-   escala;
-   agendamento;
-   visita;
-   atendimento;
-   evolução;
-   reavaliação;
-   atualização do plano decorrente desses processos.

A documentação informa que esses processos ainda precisam ser detalhados
e validados. fileciteturn1file8

------------------------------------------------------------------------

# 3. Requisitos Funcionais

## RF-PAC-001 --- Cadastrar paciente

O sistema deve permitir que o **gerente** cadastre um novo paciente.

O cadastro deve solicitar os dados definidos para esta etapa:

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

## RF-PAC-002 --- Validar dados obrigatórios

O sistema deve impedir o cadastro quando qualquer campo definido como
obrigatório não estiver preenchido.

Os campos obrigatórios são:

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

## RF-PAC-003 --- Validar CPF

O sistema deve validar o CPF informado no cadastro.

O sistema deve impedir o cadastro de um paciente quando o CPF informado
já estiver associado a outro paciente.

------------------------------------------------------------------------

## RF-PAC-004 --- Cadastrar endereço do paciente

O sistema deve permitir cadastrar o endereço do paciente.

O endereço deverá conter:

-   CEP;
-   Estado;
-   Município;
-   Bairro;
-   Rua/Avenida;
-   Número;
-   Complemento;
-   Ponto de referência;
-   Região.

Nesta definição, cada paciente possui **um único endereço**.

A documentação destaca o endereço como informação importante para o
atendimento domiciliar. fileciteturn1file3

------------------------------------------------------------------------

## RF-PAC-005 --- Associar doença/estado de saúde

O sistema deve permitir associar ao paciente uma doença/estado de saúde
cadastrada como entidade própria.

A estrutura detalhada dessa entidade e a possibilidade de múltiplas
associações ainda não foram definidas.

------------------------------------------------------------------------

## RF-PAC-006 --- Associar médico responsável

O sistema deve permitir associar um médico responsável ao paciente.

O médico responsável é o profissional relacionado à realização da
avaliação do paciente.

------------------------------------------------------------------------

## RF-PAC-007 --- Associar equipe responsável

O sistema deve permitir associar uma equipe responsável ao paciente.

A equipe deverá ser tratada como parte do módulo de profissionais.

A documentação prevê no módulo de profissionais:

-   cadastro;
-   função/especialidade;
-   disponibilidade;
-   equipe. fileciteturn1file1

A composição e as regras completas da equipe serão definidas no processo
próprio de profissionais/equipes.

------------------------------------------------------------------------

## RF-PAC-008 --- Consultar pacientes

O sistema deve permitir consultar os pacientes cadastrados.

A consulta deve permitir:

-   busca por nome;
-   busca por CPF;
-   filtro por status;
-   filtro por região.

------------------------------------------------------------------------

## RF-PAC-009 --- Filtrar pacientes por status

O sistema deve permitir filtrar pacientes por:

-   ativo;
-   inativo;
-   todos.

Pacientes inativos não devem aparecer na listagem padrão.

------------------------------------------------------------------------

## RF-PAC-010 --- Filtrar pacientes por região

O sistema deve permitir filtrar pacientes por região.

A região do paciente será relacionada ao seu bairro.

A regra técnica de relacionamento entre bairro e região ainda não foi
definida.

------------------------------------------------------------------------

## RF-PAC-011 --- Paginar pacientes

O sistema deve apresentar os pacientes utilizando paginação.

Cada página deve apresentar **20 pacientes**.

------------------------------------------------------------------------

## RF-PAC-012 --- Visualizar paciente

O sistema deve permitir visualizar os dados cadastrados de um paciente.

A visualização deve estar disponível para:

-   gerente;
-   equipe.

A diferenciação de acesso entre os diferentes membros da equipe ainda
não foi definida.

------------------------------------------------------------------------

## RF-PAC-013 --- Editar paciente

O sistema deve permitir editar os dados do paciente para:

-   gerente;
-   médico;
-   enfermeiro.

------------------------------------------------------------------------

## RF-PAC-014 --- Restringir alteração do médico responsável

O sistema deve permitir que somente o **gerente** altere o médico
responsável pelo paciente.

Médicos e enfermeiros podem editar o paciente, mas não podem alterar
essa associação.

------------------------------------------------------------------------

## RF-PAC-015 --- Restringir alteração da equipe responsável

O sistema deve permitir que somente o **gerente** altere a equipe
responsável pelo paciente.

Médicos e enfermeiros podem editar o paciente, mas não podem alterar
essa associação.

------------------------------------------------------------------------

## RF-PAC-016 --- Inativar paciente

O sistema deve permitir que somente o **gerente** inative um paciente.

A inativação deve alterar o status do paciente para **inativo**,
mantendo seus dados cadastrados.

------------------------------------------------------------------------

## RF-PAC-017 --- Reativar paciente

O sistema deve permitir que somente o **gerente** reative um paciente.

A reativação deve alterar o status do paciente para **ativo**.

------------------------------------------------------------------------

## RF-PAC-018 --- Controlar permissões do cadastro

O sistema deve aplicar as seguintes permissões:

  Funcionalidade                 Gerente   Médico   Enfermeiro   Equipe
  ---------------------------- --------- -------- ------------ --------
  Cadastrar                          Sim      Não          Não      Não
  Visualizar                         Sim      Sim          Sim      Sim
  Editar                             Sim      Sim          Sim      ---
  Alterar médico responsável         Sim      Não          Não      Não
  Alterar equipe responsável         Sim      Não          Não      Não
  Inativar                           Sim      Não          Não      Não
  Reativar                           Sim      Não          Não      Não

A permissão específica de edição para outros membros da equipe além de
médicos e enfermeiros ainda não foi definida.

------------------------------------------------------------------------

## RF-PAC-019 --- Armazenar data de nascimento e idade

O sistema deve armazenar:

-   data de nascimento;
-   idade.

A regra de atualização automática da idade ainda não foi definida.

------------------------------------------------------------------------

## RF-PAC-020 --- Manter status do paciente

O sistema deve manter o status cadastral do paciente como:

-   ativo;
-   inativo.

O paciente inativo continua armazenado e pode ser localizado utilizando
os filtros correspondentes.

------------------------------------------------------------------------

## RF-PAC-021 --- Registrar alterações relevantes

O sistema deve permitir que as alterações relevantes do cadastro sejam
compatíveis com o mecanismo geral de auditoria do sistema.

A documentação do produto estabelece auditoria como requisito não
funcional para alterações importantes. fileciteturn1file1

Os detalhes da auditoria específica do cadastro ainda não foram
definidos.

------------------------------------------------------------------------

# 4. Requisitos ainda não definidos

Os seguintes pontos não devem ser tratados como requisitos fechados até
que haja uma decisão:

-   valores permitidos para sexo;
-   atualização automática da idade;
-   possibilidade de múltiplas doenças/estados de saúde;
-   estrutura completa da entidade doença/estado de saúde;
-   estrutura completa da entidade equipe;
-   regra técnica de bairro → região;
-   inclusão de e-mail;
-   inclusão de foto;
-   nível de acesso dos demais membros da equipe;
-   exclusão física do paciente;
-   regras específicas relacionadas a escala;
-   regras específicas relacionadas a agendamento;
-   regras específicas relacionadas a visita;
-   regras específicas relacionadas a atendimento;
-   regras específicas relacionadas a evolução.

------------------------------------------------------------------------

# 5. Princípio de não antecipação

Os requisitos deste documento não devem criar regras de negócio para
processos que ainda não foram especificados.

Em particular, não devem ser definidos aqui comportamentos de:

-   escala;
-   agendamento;
-   visita;
-   atendimento;
-   evolução.

Quando esses processos forem detalhados, novos requisitos poderão
estabelecer suas relações com o cadastro do paciente.

Até essa definição, qualquer dependência deverá ser registrada como
**pendência ou dependência futura**, sem assumir uma regra operacional.
