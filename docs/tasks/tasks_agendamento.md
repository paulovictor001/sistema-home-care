# Tasks — Agendamento

## 1. Modelagem

- [ ] Revisar/implementar a entidade `visits` conforme o modelo definido.
- [ ] Relacionar `visits` com paciente.
- [ ] Relacionar `visits` com Plano de Cuidados.
- [ ] Relacionar `visits` com item do Plano.
- [ ] Relacionar `visits` com Escala.
- [ ] Relacionar `visits` com profissional.
- [ ] Relacionar `visits` com endereço do paciente.
- [ ] Implementar data, horário inicial e horário final.
- [ ] Implementar tipo de visita.
- [ ] Implementar status.
- [ ] Implementar observações.
- [ ] Implementar datas de criação e atualização.
- [ ] Criar estrutura simples para histórico de alterações relevantes.

## 2. Permissões

- [ ] Implementar permissão para criar agendamento.
- [ ] Implementar permissão para editar agendamento.
- [ ] Implementar permissão para visualizar agendamento.
- [ ] Implementar permissão para excluir agendamento.
- [ ] Implementar permissão para alterar status.
- [ ] Respeitar o modelo de permissões granulares já utilizado no sistema.

## 3. Criação do agendamento

- [ ] Criar fluxo para selecionar Escala ativa.
- [ ] Carregar dados relacionados da Escala.
- [ ] Permitir informar data.
- [ ] Permitir informar horário inicial.
- [ ] Permitir informar horário final.
- [ ] Permitir selecionar o endereço utilizado.
- [ ] Informar o tipo de visita.
- [ ] Permitir observação opcional.
- [ ] Criar a visita com status `AGENDADA`.

## 4. Validações

- [ ] Validar se a Escala está ativa.
- [ ] Validar se a data está dentro do período permitido pelo Plano.
- [ ] Validar se a data está dentro do período da Escala.
- [ ] Validar disponibilidade do profissional.
- [ ] Impedir conflito de horário do profissional.
- [ ] Impedir conflito de horário do paciente.
- [ ] Validar horário inicial e final.
- [ ] Validar existência de paciente, plano, escala e profissional.
- [ ] Impedir agendamento para Escala encerrada.
- [ ] Impedir agendamento para Escala suspensa.
- [ ] Impedir agendamento para Plano encerrado.

## 5. Geração de agendamentos

- [ ] Implementar criação de um agendamento individual.
- [ ] Implementar geração de múltiplos agendamentos a partir da frequência da Escala.
- [ ] Aplicar as mesmas validações em cada ocorrência.
- [ ] Permitir editar individualmente uma ocorrência gerada.
- [ ] Evitar criação de ocorrências conflitantes.

## 6. Edição

- [ ] Permitir editar data.
- [ ] Permitir editar horário.
- [ ] Permitir editar endereço utilizado.
- [ ] Permitir editar tipo de visita.
- [ ] Permitir editar observação.
- [ ] Reexecutar validações após alteração de data/horário.
- [ ] Não permitir alteração direta do profissional pelo Agendamento.

## 7. Status

- [ ] Implementar status `AGENDADA`.
- [ ] Implementar status `CONFIRMADA`.
- [ ] Implementar status `EM_ATENDIMENTO`.
- [ ] Implementar status `REALIZADA`.
- [ ] Implementar status `CANCELADA`.
- [ ] Implementar status `NÃO_REALIZADA`.
- [ ] Implementar regras de transição de status.
- [ ] Registrar usuário e data/hora das alterações de status.

## 8. Cancelamento e não realização

- [ ] Criar ação de cancelamento.
- [ ] Exigir motivo do cancelamento.
- [ ] Preservar a visita cancelada.
- [ ] Criar ação para marcar visita como `NÃO_REALIZADA`.
- [ ] Garantir que visitas canceladas/não realizadas não sejam tratadas como realizadas.

## 9. Histórico

- [ ] Registrar alterações relevantes.
- [ ] Registrar usuário responsável pela alteração.
- [ ] Registrar data/hora da alteração.
- [ ] Registrar alterações de data.
- [ ] Registrar alterações de horário.
- [ ] Registrar alterações de endereço.
- [ ] Registrar alterações de tipo.
- [ ] Registrar alterações de status.
- [ ] Registrar cancelamento.

## 10. Interface

- [ ] Criar listagem de agendamentos.
- [ ] Criar filtros básicos de agendamento.
- [ ] Criar formulário de criação.
- [ ] Criar formulário de edição.
- [ ] Exibir paciente.
- [ ] Exibir profissional.
- [ ] Exibir escala.
- [ ] Exibir plano.
- [ ] Exibir data e horário.
- [ ] Exibir endereço.
- [ ] Exibir tipo.
- [ ] Exibir status.
- [ ] Exibir observação.
- [ ] Exibir ações conforme as permissões do usuário.
- [ ] Criar tela/ação de confirmação.
- [ ] Criar tela/ação de cancelamento.
- [ ] Solicitar motivo ao cancelar.

## 11. Testes

- [ ] Testar permissões de criação.
- [ ] Testar permissões de edição.
- [ ] Testar permissões de visualização.
- [ ] Testar permissões de exclusão.
- [ ] Testar permissões de alteração de status.
- [ ] Testar criação somente a partir de Escala ativa.
- [ ] Testar data fora do período permitido.
- [ ] Testar horário fora da disponibilidade.
- [ ] Testar conflito do profissional.
- [ ] Testar conflito do paciente.
- [ ] Testar endereço preservado no histórico.
- [ ] Testar geração individual.
- [ ] Testar geração múltipla.
- [ ] Testar edição de ocorrência individual.
- [ ] Testar substituição de profissional somente pela Escala.
- [ ] Testar transições de status.
- [ ] Testar cancelamento com motivo obrigatório.
- [ ] Testar visita não realizada.
- [ ] Testar Escala suspensa.
- [ ] Testar Escala encerrada.
- [ ] Testar Plano encerrado.
- [ ] Testar registro de histórico.
- [ ] Testar confirmação.
- [ ] Testar que visita cancelada/não realizada não seja considerada realizada.

## 12. Integração

- [ ] Integrar Agendamento com Escala.
- [ ] Integrar Agendamento com Plano de Cuidados.
- [ ] Integrar Agendamento com Paciente e endereço.
- [ ] Integrar Agendamento com disponibilidade do profissional.
- [ ] Preparar a saída do Agendamento para o processo de Visita.
- [ ] Garantir que o Agendamento não implemente regras pertencentes ao Atendimento ou à Evolução.
