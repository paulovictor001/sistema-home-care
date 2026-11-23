# Requisitos Funcionais — Agendamento

## RF-AGE-01 — Criar agendamento
O sistema deve permitir que o Gerente e usuários com permissão criem um agendamento.

## RF-AGE-02 — Selecionar escala
O sistema deve permitir selecionar uma Escala ativa para originar o agendamento.

## RF-AGE-03 — Herdar dados da escala
O sistema deve utilizar a Escala para identificar o paciente, plano, item do plano e profissional relacionados ao agendamento.

## RF-AGE-04 — Informar data
O sistema deve exigir a data da visita.

## RF-AGE-05 — Informar horário
O sistema deve exigir horário inicial e horário final.

## RF-AGE-06 — Validar disponibilidade
O sistema deve verificar se o horário escolhido está dentro da disponibilidade cadastrada do profissional.

## RF-AGE-07 — Validar conflito do profissional
O sistema deve impedir agendamento conflitante para o mesmo profissional.

## RF-AGE-08 — Validar conflito do paciente
O sistema deve impedir agendamento conflitante para o mesmo paciente.

## RF-AGE-09 — Selecionar endereço
O sistema deve permitir utilizar o endereço do paciente no agendamento e registrar o endereço utilizado na visita.

## RF-AGE-10 — Preservar endereço utilizado
O sistema deve preservar o endereço utilizado no agendamento, mesmo que o cadastro do paciente seja alterado posteriormente.

## RF-AGE-11 — Informar tipo de visita
O sistema deve exigir o tipo de visita, utilizando o tipo inicial definido para o MVP.

## RF-AGE-12 — Criar visita
Ao confirmar o agendamento, o sistema deve criar o registro correspondente na entidade `visits`.

## RF-AGE-13 — Status inicial
Uma nova visita deve iniciar com status `AGENDADA`.

## RF-AGE-14 — Confirmar visita
O sistema deve permitir alterar uma visita de `AGENDADA` para `CONFIRMADA` conforme a permissão do usuário.

## RF-AGE-15 — Controlar status
O sistema deve controlar as transições de status da visita conforme as regras definidas para o processo.

## RF-AGE-16 — Cancelar visita
O sistema deve permitir cancelar uma visita preservando seu registro.

## RF-AGE-17 — Informar motivo do cancelamento
O sistema deve exigir um motivo ao cancelar uma visita.

## RF-AGE-18 — Marcar como não realizada
O sistema deve permitir registrar uma visita como `NÃO_REALIZADA` conforme o fluxo definido.

## RF-AGE-19 — Editar agendamento
O sistema deve permitir editar agendamentos para usuários com permissão.

## RF-AGE-20 — Editar data e horário
O sistema deve permitir alterar data, horário inicial e horário final, executando novamente as validações de disponibilidade e conflitos.

## RF-AGE-21 — Editar endereço
O sistema deve permitir alterar o endereço utilizado no agendamento.

## RF-AGE-22 — Editar tipo e observação
O sistema deve permitir alterar o tipo de visita e a observação.

## RF-AGE-23 — Não alterar profissional diretamente
O sistema não deve permitir alterar o profissional diretamente pelo Agendamento. A substituição deve ser feita na Escala.

## RF-AGE-24 — Gerar série de agendamentos
O sistema deve permitir gerar múltiplos agendamentos a partir da frequência da Escala.

## RF-AGE-25 — Gerar agendamento individual
O sistema deve permitir gerar somente um agendamento a partir da Escala.

## RF-AGE-26 — Editar ocorrência individual
O sistema deve permitir alterar individualmente uma visita gerada.

## RF-AGE-27 — Restringir escala encerrada
O sistema deve impedir a criação de novos agendamentos a partir de Escala encerrada.

## RF-AGE-28 — Restringir escala suspensa
O sistema deve impedir a criação de novos agendamentos a partir de Escala suspensa sem alterar automaticamente os agendamentos já existentes.

## RF-AGE-29 — Restringir plano encerrado
O sistema deve impedir novos agendamentos vinculados a Plano de Cuidados encerrado.

## RF-AGE-30 — Observação
O sistema deve permitir registrar uma observação opcional no agendamento.

## RF-AGE-31 — Histórico
O sistema deve registrar usuário e data/hora das alterações relevantes.

## RF-AGE-32 — Histórico de alterações
O sistema deve manter histórico das alterações relevantes de data, horário, endereço, tipo, status e cancelamento.

## RF-AGE-33 — Confirmação
O sistema deve registrar o usuário e a data/hora quando uma visita for confirmada.

## RF-AGE-34 — Visualização
O sistema deve permitir visualizar os agendamentos conforme as permissões definidas.

## RF-AGE-35 — Exclusão
O sistema deve permitir excluir agendamentos conforme a permissão definida, respeitando a preservação dos registros que já representem histórico operacional.

## RF-AGE-36 — Persistência
O sistema deve armazenar os dados do agendamento/visita conforme o modelo `visits`:
- paciente;
- plano de cuidados;
- item do plano;
- escala;
- profissional;
- endereço utilizado;
- data;
- horário inicial;
- horário final;
- tipo de visita;
- status;
- observações;
- data de criação;
- data de atualização.
