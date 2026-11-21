# Regras de Negócio — Agendamento

## Objetivo

O Agendamento transforma uma Escala ativa em visitas com data e horário definidos.

A Escala responde **quem** realizará o atendimento.  
O Agendamento responde **quando** o atendimento ocorrerá.

## Regras de negócio

### RN-AGE-01 — Permissões de criação
Podem criar agendamentos o Gerente e usuários que receberam essa permissão.

### RN-AGE-02 — Permissões de edição
Podem editar agendamentos o Gerente e usuários que receberam essa permissão.

### RN-AGE-03 — Permissões de visualização
Podem visualizar agendamentos o Gerente e usuários que receberam essa permissão.

### RN-AGE-04 — Permissões de exclusão
Podem excluir agendamentos o Gerente e usuários que receberam essa permissão.

### RN-AGE-05 — Origem do agendamento
Todo agendamento deve partir de uma Escala ativa.

### RN-AGE-06 — Profissional
O profissional do agendamento é herdado da Escala. O profissional não é alterado diretamente no Agendamento.

### RN-AGE-07 — Múltiplos agendamentos
Uma Escala pode gerar vários agendamentos.

### RN-AGE-08 — Data
A data do agendamento é obrigatória.

### RN-AGE-09 — Horário
O horário inicial e o horário final são obrigatórios.

### RN-AGE-10 — Disponibilidade
O horário agendado deve respeitar a disponibilidade cadastrada do profissional.

### RN-AGE-11 — Conflito do profissional
O profissional não pode possuir duas visitas com horários conflitantes.

### RN-AGE-12 — Conflito do paciente
O paciente não pode possuir duas visitas com horários conflitantes.

### RN-AGE-13 — Endereço
O agendamento utiliza o endereço do paciente e permite selecionar/alterar o endereço utilizado naquela visita.

### RN-AGE-14 — Histórico do endereço
O endereço utilizado fica registrado na visita e não deve ser alterado automaticamente caso o cadastro do paciente seja modificado posteriormente.

### RN-AGE-15 — Tipo de visita
No MVP existe um único tipo inicial de visita: Atendimento domiciliar.

### RN-AGE-16 — Tipo obrigatório
O tipo de visita é obrigatório.

### RN-AGE-17 — Status
Os status oficiais são:
- AGENDADA
- CONFIRMADA
- EM_ATENDIMENTO
- REALIZADA
- CANCELADA
- NÃO_REALIZADA

### RN-AGE-18 — Transição de status
As transições de status são controladas pelo fluxo definido do processo. Não é permitido alterar livremente qualquer status para qualquer outro.

### RN-AGE-19 — Alteração de status
A alteração de status pode ser realizada pelo Gerente e por usuários que receberam essa permissão.

### RN-AGE-20 — Cancelamento
O cancelamento preserva o registro da visita.

### RN-AGE-21 — Motivo do cancelamento
O motivo do cancelamento é obrigatório e será registrado como texto livre.

### RN-AGE-22 — Edição
O agendamento pode ser editado.

### RN-AGE-23 — Campos editáveis
Podem ser alterados no agendamento:
- data;
- horário;
- endereço utilizado;
- tipo de visita;
- observações.

### RN-AGE-24 — Alteração de profissional
A alteração do profissional não é feita diretamente no Agendamento. A substituição deve ocorrer na Escala.

### RN-AGE-25 — Histórico
Alterações relevantes do agendamento devem registrar o usuário responsável e a data/hora da alteração.

### RN-AGE-26 — Geração de visitas
O sistema pode gerar vários agendamentos a partir da frequência definida na Escala.

### RN-AGE-27 — Ajuste individual
Uma visita gerada pode ser alterada individualmente.

### RN-AGE-28 — Agendamento individual
Também é possível criar um único agendamento a partir de uma Escala, sem gerar toda a série.

### RN-AGE-29 — Observação
O agendamento possui observação opcional.

### RN-AGE-30 — Escala encerrada
Uma Escala encerrada não pode gerar novos agendamentos.

### RN-AGE-31 — Escala suspensa
Uma Escala suspensa não pode gerar novos agendamentos. Os agendamentos já existentes não são cancelados automaticamente.

### RN-AGE-32 — Plano encerrado
Um Plano de Cuidados encerrado não permite novos agendamentos relacionados a ele. Os registros históricos permanecem preservados.

### RN-AGE-33 — Histórico de alterações
O histórico registra alterações relevantes de:
- data;
- horário;
- endereço;
- tipo;
- status;
- cancelamento.

### RN-AGE-34 — Confirmação
A visita pode passar de AGENDADA para CONFIRMADA.

### RN-AGE-35 — Registro da confirmação
A confirmação registra o usuário responsável e a data/hora da confirmação.

### RN-AGE-36 — Antecedência
Não existe antecedência mínima obrigatória para agendamento no MVP.

### RN-AGE-37 — Alteração próxima do horário
Não existe regra especial de bloqueio para alteração ou cancelamento próximo do horário no MVP.

### RN-AGE-38 — Preservação histórica
Visitas canceladas ou não realizadas permanecem registradas e não são tratadas como atendimento realizado.

## Fluxo resumido

```text
ESCALA ATIVA
     ↓
AGENDAMENTO
     ↓
AGENDADA
     ↓
CONFIRMADA
     ↓
EM_ATENDIMENTO
     ↓
REALIZADA
```

Possibilidades alternativas:

```text
AGENDADA → CANCELADA
AGENDADA → NÃO_REALIZADA

CONFIRMADA → CANCELADA
CONFIRMADA → NÃO_REALIZADA
```
