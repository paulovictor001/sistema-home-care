# Regras de Negócio --- Cadastro do Paciente

## 1. Objetivo

Definir as regras de negócio do processo de **Cadastro do Paciente** no
sistema de gestão de atendimento domiciliar particular.

O cadastro representa as informações de identificação e contexto
relativamente estável do paciente e serve como base para os processos
posteriores.

A documentação de processos diferencia o cadastro da avaliação: o
cadastro responde principalmente **"Quem é o paciente?"**, enquanto a
avaliação registra uma situação clínica específica e atual.
fileciteturn0file0L74-L117

------------------------------------------------------------------------

## 2. Escopo

Este documento contempla somente o processo de cadastro e manutenção
cadastral do paciente.

Inclui:

-   cadastro do paciente;
-   consulta/listagem de pacientes;
-   visualização dos dados do paciente;
-   edição dos dados do paciente;
-   gerenciamento do endereço único;
-   associação de médico responsável;
-   associação de equipe responsável;
-   associação de doença/estado de saúde;
-   ativação e inativação do paciente;
-   regras de consulta, filtros e paginação;
-   permissões relacionadas ao cadastro.

### Processos ainda não especificados

Os processos abaixo ainda não possuem definição funcional
suficientemente detalhada na documentação e, portanto, **não terão
regras de negócio antecipadas neste documento**:

-   escala;
-   agendamento;
-   visita;
-   atendimento;
-   evolução;
-   reavaliação;
-   atualização do plano decorrente desses processos.

A documentação original informa que esses processos ainda precisam ser
detalhados e validados. fileciteturn1file8

Quando uma regra do cadastro tiver dependência desses processos, essa
dependência deverá permanecer explicitamente como **não especificada**
até que o processo correspondente seja definido.

------------------------------------------------------------------------

## 3. Dados do paciente

O cadastro deverá possuir os seguintes dados definidos para esta etapa:

-   Nome completo;
-   Data de nascimento;
-   CPF;
-   RG;
-   Idade;
-   Telefone;
-   Sexo;
-   Status;
-   Médico responsável;
-   Equipe responsável;
-   Doença/estado de saúde;
-   Endereço.

A documentação de processos também prevê e-mail e foto no modelo
conceitual do paciente. Esses campos não foram definidos nas decisões de
negócio desta etapa e, portanto, ficam como **pendência de validação**,
não como regra obrigatória. fileciteturn1file3

------------------------------------------------------------------------

## 4. Regras de cadastro

### RN-CAD-PAC-001 --- Responsável pelo cadastro

Somente o **gerente** pode cadastrar um novo paciente.

### RN-CAD-PAC-002 --- Campos obrigatórios

Os seguintes campos são obrigatórios:

-   Nome completo;
-   Data de nascimento;
-   CPF;
-   RG;
-   Idade;
-   Telefone;
-   Sexo;
-   Status;
-   Médico responsável;
-   Equipe responsável;
-   Doença/estado de saúde;
-   Endereço.

### RN-CAD-PAC-003 --- CPF único

O CPF de um paciente não pode ser igual ao CPF de outro paciente
cadastrado no sistema.

A unicidade deve ser garantida pela regra de negócio e pelo modelo de
dados.

### RN-CAD-PAC-004 --- Data de nascimento e idade

O sistema deverá armazenar tanto a data de nascimento quanto a idade.

A regra de atualização automática da idade ao longo do tempo ainda
precisa ser definida.

**Status:** pendência de definição.

### RN-CAD-PAC-005 --- Doença/estado de saúde

Doença/estado de saúde será representado por uma **entidade
cadastrável**.

O paciente deverá ser associado a um registro dessa entidade, em vez de
utilizar somente texto livre.

A estrutura detalhada da entidade e a possibilidade de múltiplas
doenças/condições ainda não foram especificadas.

**Status:** pendência de definição.

### RN-CAD-PAC-006 --- Endereço único

Cada paciente poderá possuir **um único endereço**.

O endereço deverá contemplar os dados definidos para atendimento
domiciliar, incluindo:

-   CEP;
-   Estado;
-   Município;
-   Bairro;
-   Rua/Avenida;
-   Número;
-   Complemento;
-   Ponto de referência;
-   Região.

A documentação destaca a importância do endereço para a operação de
atendimento domiciliar. fileciteturn1file3

### RN-CAD-PAC-007 --- Região

A região do paciente será determinada a partir do **bairro**.

A forma técnica de relacionamento entre bairro e região ainda deverá ser
definida durante a modelagem.

### RN-CAD-PAC-008 --- Médico responsável

O paciente deverá possuir um médico responsável.

O médico é o profissional relacionado à realização da avaliação do
paciente.

### RN-CAD-PAC-009 --- Equipe responsável

O paciente deverá possuir uma equipe responsável.

A equipe representa o conjunto de profissionais envolvidos no
atendimento, podendo incluir enfermeiros, motorista e outros
profissionais.

A equipe deverá ser tratada como conceito próprio do módulo de
profissionais, pois a documentação prevê cadastro de profissionais,
função/especialidade, disponibilidade e equipe. fileciteturn1file1

### RN-CAD-PAC-010 --- Alteração do médico e da equipe

Somente o **gerente** pode alterar:

-   médico responsável;
-   equipe responsável.

Médicos e enfermeiros podem editar o paciente, mas não podem alterar
essas duas associações.

------------------------------------------------------------------------

## 5. Status do paciente

### RN-CAD-PAC-011 --- Status

O paciente possui status:

-   Ativo;
-   Inativo.

### RN-CAD-PAC-012 --- Inativação

Somente o **gerente** pode inativar um paciente.

### RN-CAD-PAC-013 --- Reativação

Somente o **gerente** pode reativar um paciente.

### RN-CAD-PAC-014 --- Consulta de pacientes inativos

Pacientes inativos não aparecem na listagem padrão de pacientes.

Eles devem aparecer quando o usuário utilizar:

-   filtro **Inativo**; ou
-   filtro **Todos**.

### RN-CAD-PAC-015 --- Efeitos da inativação

O cadastro de paciente inativo permanece armazenado.

A definição de quais processos operacionais serão bloqueados pela
inativação não será detalhada neste documento, pois depende de processos
ainda não especificados, especialmente escala/agendamento e atendimento.

------------------------------------------------------------------------

## 6. Consulta e listagem

### RN-CAD-PAC-016 --- Consulta por nome

O sistema deverá permitir consultar pacientes pelo nome.

### RN-CAD-PAC-017 --- Consulta por CPF

O sistema deverá permitir consultar pacientes pelo CPF.

### RN-CAD-PAC-018 --- Filtro por status

O sistema deverá permitir filtrar pacientes por:

-   Ativo;
-   Inativo;
-   Todos.

### RN-CAD-PAC-019 --- Filtro por região

O sistema deverá permitir filtrar pacientes por região.

Como a região será determinada pelo bairro, a origem dessa informação
deverá ser consistente com o cadastro de endereço.

### RN-CAD-PAC-020 --- Paginação

A listagem de pacientes deverá utilizar paginação.

Cada página deverá apresentar **20 pacientes**.

------------------------------------------------------------------------

## 7. Permissões

### RN-CAD-PAC-021 --- Visualização

Gerente e equipe podem visualizar os pacientes.

A regra de visualização detalhada por função dentro da equipe ainda não
foi especificada.

### RN-CAD-PAC-022 --- Edição

Gerente, médicos e enfermeiros podem editar os dados do paciente.

### RN-CAD-PAC-023 --- Restrição de edição do responsável

Mesmo podendo editar o cadastro, médicos e enfermeiros não podem
alterar:

-   médico responsável;
-   equipe responsável.

Essas alterações são exclusivas do gerente.

### RN-CAD-PAC-024 --- Inativação e reativação

Inativação e reativação são operações exclusivas do gerente.

------------------------------------------------------------------------

## 8. Equipe

A equipe será tratada como uma entidade/processo próprio do módulo de
profissionais.

A documentação prevê, no módulo de profissionais:

-   cadastro;
-   função/especialidade;
-   disponibilidade;
-   equipe. fileciteturn1file1

Neste processo de cadastro do paciente, apenas será mantida a associação
entre o paciente e sua equipe responsável.

Não serão definidas aqui:

-   regras de criação da equipe;
-   regras de composição da equipe;
-   disponibilidade dos profissionais;
-   escala;
-   substituição de profissionais;
-   profissional específico de cada visita.

Esses pontos pertencem a processos ainda não detalhados.

------------------------------------------------------------------------

## 9. Sexo

O campo sexo faz parte do cadastro obrigatório.

A lista exata de valores permitidos ainda não foi definida.

**Status:** pendência de definição.

------------------------------------------------------------------------

## 10. Exclusão

Não foi definida uma operação de exclusão física do paciente.

A documentação trabalha com status ativo/inativo e o processo atualmente
definido contempla inativação. fileciteturn0file0L152-L194

Até nova decisão, não deverá ser criada uma regra de exclusão física
como parte do cadastro.

------------------------------------------------------------------------

## 11. Auditoria

A documentação do produto estabelece auditoria como requisito não
funcional para registrar alterações importantes realizadas no sistema.
fileciteturn1file1

As alterações do cadastro deverão, portanto, ser compatíveis com a
futura regra geral de auditoria.

Os detalhes de quais campos, formato e retenção do histórico de
auditoria ainda não foram definidos neste processo.

------------------------------------------------------------------------

## 12. Pendências de definição

Permanecem abertas as seguintes decisões:

1.  Como a idade será atualizada automaticamente a partir da data de
    nascimento.
2.  Quais valores o campo sexo aceitará.
3.  Se um paciente poderá possuir mais de uma doença/estado de saúde.
4.  Estrutura detalhada da entidade de doença/estado de saúde.
5.  Quais campos de paciente podem ser editados por médicos e
    enfermeiros, além da restrição já definida para médico/equipe
    responsável.
6.  Se todos os membros da equipe possuem exatamente o mesmo nível de
    visualização.
7.  Estrutura definitiva da entidade equipe.
8.  Regras de bairro → região.
9.  Se e-mail e foto farão parte do cadastro desta versão.
10. Regras de auditoria específicas do cadastro.

------------------------------------------------------------------------

## 13. Princípio para processos futuros

Nenhuma regra relacionada a escala, agendamento, visita, atendimento ou
evolução deverá ser criada por inferência a partir deste cadastro.

Quando esses processos forem detalhados, suas regras poderão estabelecer
dependências com o cadastro do paciente.

Até lá, o cadastro deverá permanecer limitado às regras explicitamente
definidas neste documento.
