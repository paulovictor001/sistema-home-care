# Requisitos Funcionais — Plano de Cuidados

## RF01 — Criar Plano de Cuidados

O sistema deve permitir que um Médico crie um Plano de Cuidados para um paciente.

### Regras
- O usuário deve possuir permissão de Médico.
- O paciente deve possuir pelo menos uma Necessidade Identificada.
- O plano deve possuir pelo menos uma necessidade vinculada.
- A Data de início é obrigatória.
- A descrição/objetivo geral é opcional.
- A Data de encerramento é opcional e pode ser informada antecipadamente.
- O status inicial do plano deve ser Rascunho.

## RF02 — Vincular Necessidades Identificadas

O sistema deve permitir vincular ao Plano de Cuidados as Necessidades Identificadas do paciente.

### Regras
- Uma ou mais necessidades podem ser vinculadas.
- A necessidade deve existir no cadastro de Necessidades Identificadas.
- Uma necessidade pode possuir diferentes vínculos com planos ao longo do tempo.
- Uma necessidade não pode estar vinculada a mais de um Plano de Cuidados ativo simultaneamente.

## RF03 — Configurar necessidade no Plano

O sistema deve permitir configurar, para cada necessidade vinculada:

- Profissional necessário.
- Frequência.
- Recursos necessários.

### Profissional
O sistema deve permitir selecionar um profissional específico já cadastrado.

### Frequência
O sistema deve permitir informar:
- Quantidade.
- Período: Dia, Semana ou Mês.

### Recursos
O sistema deve permitir adicionar zero ou mais recursos já cadastrados, informando:
- Recurso.
- Quantidade.
- Observação.

## RF04 — Editar Plano de Cuidados

O sistema deve permitir que um Médico edite o Plano de Cuidados.

As alterações devem atualizar automaticamente:
- Data de atualização.
- Usuário responsável pela atualização.

## RF05 — Visualizar Plano de Cuidados

O sistema deve permitir que Médico, Enfermeiro e Gerente visualizem o Plano de Cuidados.

A visualização deve apresentar, no mínimo:
- Paciente.
- Status.
- Data de início.
- Data de encerramento, quando informada.
- Descrição/objetivo, quando informado.
- Necessidades vinculadas.
- Profissional necessário por necessidade.
- Frequência por necessidade.
- Recursos por necessidade, quando existentes.
- Informações de criação e atualização.

## RF06 — Alterar status do Plano

O sistema deve permitir alterar o status conforme as permissões definidas.

### Rascunho → Ativo
Permitido somente para Médico.

### Ativo → Encerrado
Permitido para Médico ou Enfermeiro.

### Encerrado → Ativo
Permitido para Médico ou Enfermeiro.

Ao reativar um plano, o sistema deve reutilizar o mesmo registro.

## RF07 — Encerrar Plano de Cuidados

O sistema deve permitir encerrar um Plano de Cuidados ativo para Médico ou Enfermeiro.

Ao encerrar:
- O plano deve assumir o status Encerrado.
- As necessidades vinculadas devem permanecer ativas em Necessidades Identificadas.
- As necessidades não devem ser excluídas ou inativadas automaticamente.

## RF08 — Reativar Plano de Cuidados

O sistema deve permitir reativar um Plano de Cuidados encerrado para Médico ou Enfermeiro.

A reativação:
- Deve utilizar o mesmo registro.
- Deve preservar o histórico.
- Deve respeitar a regra de apenas um Plano de Cuidados ativo por paciente.
- Deve respeitar a regra de apenas um plano ativo por necessidade.

## RF09 — Remover necessidade do Plano

O sistema deve permitir remover uma Necessidade Identificada do Plano de Cuidados.

Ao remover:
- A necessidade deixa de fazer parte do plano.
- A necessidade permanece ativa em Necessidades Identificadas.
- A necessidade não deve ser excluída.
- A necessidade não deve ser inativada.
- O motivo da remoção é obrigatório.
- A remoção deve ser registrada no histórico.

## RF10 — Validar existência de necessidade

O sistema deve impedir a criação de um Plano de Cuidados sem pelo menos uma Necessidade Identificada vinculada.

## RF11 — Controlar Plano ativo por paciente

O sistema deve impedir que um paciente possua mais de um Plano de Cuidados com status Ativo simultaneamente.

## RF12 — Controlar Plano ativo por necessidade

O sistema deve impedir que uma mesma Necessidade Identificada esteja vinculada simultaneamente a mais de um Plano de Cuidados Ativo.

## RF13 — Registrar auditoria

O sistema deve registrar automaticamente:
- Data de criação.
- Data de atualização.
- Usuário que criou.
- Usuário que realizou a última atualização.

O sistema deve preservar o histórico das alterações relevantes do plano.

## RF14 — Manter separação entre plano e escala/agendamento

O sistema não deve considerar o profissional necessário definido no Plano de Cuidados como profissional efetivamente escalado ou agendado.

As regras de escala e agendamento serão tratadas em processos próprios.
