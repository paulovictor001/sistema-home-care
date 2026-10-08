# Tasks — Plano de Cuidados

## 1. Modelagem e banco de dados

### TASK 01 — Modelar Plano de Cuidados
**Concluída — modelagem.** App `care_plans` com `CarePlan` (`care_plans`) e `CarePlanHistory` (`care_plan_history`), migration `0001_initial` e testes de modelo.

O plano contém paciente (`PROTECT`), status `DRAFT/ACTIVE/CLOSED` (default Rascunho, restrição de banco), início obrigatório, encerramento e objetivo opcionais, timestamps e autores `created_by/updated_by` (`SET_NULL`, nullable para preservar registros após exclusão do autor). O histórico contém plano (`PROTECT`), autor (`SET_NULL`), data, descrição e snapshots anteriores/novos. O admin oferece inspeção somente leitura, até o fluxo auditado ser implementado.

Nesta task foi criada a **estrutura** de histórico; gravação automática, preenchimento dos autores e autorização vêm nas TASK 13/14/19. Necessidades, frequência e recursos são TASK 02–04; exclusividade de plano ativo é TASK 06/07; transições são TASK 10. Foram priorizadas as regras/requisitos específicos do Plano sobre o modelo geral mais antigo: não foi adicionado status Suspenso nem vínculo obrigatório direto com uma avaliação.

- Criar entidade/tabela para Plano de Cuidados.
- Relacionar o plano ao paciente.
- Implementar status: Rascunho, Ativo e Encerrado.
- Criar campos:
  - data de início
  - data de encerramento
  - descrição/objetivo
  - created_at
  - updated_at
  - criado por
  - atualizado por
- Criar estrutura necessária para preservar histórico.

### TASK 02 — Modelar vínculo entre Plano e Necessidade

Implementada a modelagem `CarePlanNeed`: vínculo com plano/necessidade protegidos contra exclusão em cascata, timestamps e remoção lógica com data, motivo obrigatório e autor opcional. O vínculo removido permanece armazenado; uma nova associação cria outro registro. Há unicidade no banco para vínculos não removidos do mesmo par e validação de pertencimento ao paciente. O model valida conflitos com outros planos ativos ao salvar vínculos e ativar/reativar planos. Na TASK 07, o serviço transacional deverá tratar concorrência; validações do model não substituem essa garantia e são contornadas por `QuerySet.update`/operações em lote. API de remoção, autorização e eventos automáticos de histórico seguem nas TASK 11/13/14/19; configuração e recursos seguem nas TASK 03/04.

- Criar relacionamento entre Plano de Cuidados e Necessidades Identificadas.
- Permitir múltiplos vínculos ao longo do tempo.
- Controlar para que uma necessidade tenha somente um vínculo com plano ativo por vez.
- Permitir remoção do vínculo sem excluir ou inativar a necessidade.

### TASK 03 — Modelar configuração da necessidade no plano
- Armazenar profissional específico necessário.
- Armazenar quantidade da frequência.
- Armazenar período da frequência.
- Permitir períodos:
  - Dia
  - Semana
  - Mês

### TASK 04 — Modelar recursos do plano
- Relacionar recursos já cadastrados às necessidades do plano.
- Armazenar:
  - recurso
  - quantidade
  - observação
- Permitir zero ou mais recursos por necessidade.

## 2. Regras de negócio e validações

### TASK 05 — Validar criação do plano
- Permitir criação somente por Médico.
- Exigir paciente.
- Exigir pelo menos uma Necessidade Identificada.
- Exigir data de início.
- Permitir descrição/objetivo vazio.
- Permitir data de encerramento vazia.

### TASK 06 — Validar plano ativo por paciente
- Impedir mais de um Plano de Cuidados Ativo para o mesmo paciente.

### TASK 07 — Validar plano ativo por necessidade
- Impedir que uma Necessidade Identificada esteja vinculada a mais de um Plano de Cuidados Ativo.

### TASK 08 — Validar profissional necessário
- Permitir somente profissionais previamente cadastrados.
- Registrar o profissional específico selecionado para cada necessidade.

### TASK 09 — Validar frequência
- Exigir quantidade.
- Permitir somente os períodos:
  - Dia
  - Semana
  - Mês

### TASK 10 — Implementar regras de status
- Implementar Rascunho → Ativo somente para Médico.
- Implementar Ativo → Encerrado para Médico ou Enfermeiro.
- Implementar Encerrado → Ativo para Médico ou Enfermeiro.
- Reutilizar o mesmo registro na reativação.
- Registrar histórico das mudanças.

### TASK 11 — Implementar remoção de necessidade
- Permitir remover uma necessidade do plano.
- Exigir motivo da remoção.
- Manter a necessidade ativa em Necessidades Identificadas.
- Não excluir a necessidade.
- Não inativar a necessidade.
- Registrar a remoção no histórico.

### TASK 12 — Implementar encerramento do plano
- Alterar o plano para Encerrado.
- Manter as necessidades ativas em Necessidades Identificadas.
- Não alterar automaticamente o status das necessidades.

## 3. Backend / API

### TASK 13 — Criar endpoints do Plano de Cuidados
Implementar operações para:
- Criar plano.
- Consultar plano.
- Listar planos do paciente.
- Editar plano.
- Alterar status.
- Vincular necessidade.
- Remover necessidade.
- Configurar profissional, frequência e recursos.

### TASK 14 — Implementar autorização
Garantir no backend:
- Médico: criar e editar.
- Médico, Enfermeiro e Gerente: visualizar.
- Médico: ativar plano em Rascunho.
- Médico e Enfermeiro: encerrar.
- Médico e Enfermeiro: reativar.

## 4. Frontend

### TASK 15 — Criar tela de Plano de Cuidados
Implementar:
- Identificação do paciente.
- Status.
- Data de início.
- Data de encerramento.
- Descrição/objetivo.
- Lista de necessidades vinculadas.

### TASK 16 — Criar configuração das necessidades
Para cada necessidade permitir:
- Selecionar profissional necessário.
- Informar frequência.
- Selecionar recursos.
- Informar quantidade dos recursos.
- Informar observação dos recursos.

### TASK 17 — Implementar remoção de necessidade
- Disponibilizar ação para remover necessidade do plano.
- Solicitar motivo obrigatório.
- Informar que a remoção não exclui nem inativa a necessidade.

### TASK 18 — Implementar ações de status
Disponibilizar ações conforme permissão:
- Ativar.
- Encerrar.
- Reativar.

## 5. Auditoria e histórico

### TASK 19 — Registrar histórico do Plano
Registrar:
- Criação.
- Alterações.
- Alterações de status.
- Inclusão de necessidades.
- Remoção de necessidades.
- Motivos de remoção.
- Usuário responsável.
- Data/hora das alterações.

## 6. Testes

### TASK 20 — Testar permissões
Validar permissões de:
- Médico.
- Enfermeiro.
- Gerente.

### TASK 21 — Testar validações de criação
Validar:
- Plano sem necessidade.
- Plano com necessidade.
- Data de início ausente.
- Data de encerramento opcional.
- Descrição opcional.

### TASK 22 — Testar exclusividade de plano ativo
Validar:
- Dois planos ativos para o mesmo paciente.
- Uma necessidade em dois planos ativos.
- Reutilização de necessidade após encerramento do plano anterior.

### TASK 23 — Testar remoção de necessidade
Validar:
- Remoção com motivo.
- Remoção sem motivo.
- Permanência da necessidade em Necessidades Identificadas.
- Preservação do histórico.

### TASK 24 — Testar ciclo de status
Validar:
- Rascunho → Ativo.
- Ativo → Encerrado.
- Encerrado → Ativo.
- Preservação do mesmo registro na reativação.

## 7. Dependências e escopo futuro

### TASK 25 — Preparar integração futura com escala e agendamento
Manter o modelo preparado para que o profissional necessário definido no Plano de Cuidados possa posteriormente ser utilizado pelos processos de escala e agendamento.

Não implementar neste processo regras de:
- Escala.
- Agendamento.
- Visita.
- Atendimento.
- Evolução.
