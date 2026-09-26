# Regras de Negócio — Avaliação Inicial

## 1. Objetivo

A Avaliação Inicial registra a situação atual do paciente, identifica suas necessidades e consolida informações que servirão de entrada para o plano de cuidados.

A avaliação é um registro próprio e não substitui nem altera o cadastro permanente do paciente.

## 2. Escopo

Este documento trata exclusivamente da Avaliação Inicial.

Os processos de escala, agendamento, visita, atendimento e evolução ainda não estão suficientemente definidos e, portanto, não devem ter regras de negócio antecipadas neste processo.

## 3. Registro da avaliação

### RN-AVL-001 — Tipo da avaliação

O processo utilizará, neste momento, somente o tipo:

- Avaliação inicial.

Reavaliação não será implementada como tipo de avaliação neste momento.

### RN-AVL-002 — Profissionais autorizados a criar

Somente:

- Médico;
- Enfermeiro.

podem criar uma Avaliação Inicial.

### RN-AVL-003 — Campos obrigatórios

A avaliação somente poderá ser salva quando todos os seguintes campos obrigatórios estiverem preenchidos:

- Paciente;
- Profissional responsável;
- Data da avaliação;
- Hora da avaliação;
- Tipo da avaliação;
- Motivo da solicitação;
- Queixa principal.

### RN-AVL-004 — Origem da solicitação

A origem da solicitação será selecionada em uma lista padronizada:

1. Família;
2. Médico;
3. Hospital;
4. Clínica;
5. Outro.

### RN-AVL-005 — Profissional responsável

A avaliação possui um profissional responsável.

O profissional responsável pode ser alterado.

O gerente também pode realizar essa alteração.

### RN-AVL-006 — Múltiplas avaliações

Um paciente pode possuir várias avaliações.

Cada avaliação deve permanecer como um registro próprio, compondo o histórico do paciente.

Uma nova avaliação não deve sobrescrever uma avaliação anterior.

## 4. Edição e visualização

### RN-AVL-007 — Edição

Médicos e enfermeiros podem editar avaliações.

### RN-AVL-008 — Alteração pelo gerente

O gerente pode alterar o profissional responsável pela avaliação.

### RN-AVL-009 — Visualização

Podem visualizar as avaliações:

- Gerente;
- Médico;
- Enfermeiro.

## 5. Status da avaliação

### RN-AVL-010 — Status

A Avaliação Inicial não possuirá status próprio neste momento.

O registro existe após ser salvo com os campos obrigatórios preenchidos.

## 6. Necessidades identificadas

### RN-AVL-011 — Criação da necessidade

A necessidade deve ser criada dentro da tela da avaliação e vinculada à avaliação correspondente.

### RN-AVL-012 — Dados da necessidade

A necessidade deve possuir:

- Tipo;
- Descrição;
- Prioridade;
- Status.

### RN-AVL-013 — Prioridade

A prioridade da necessidade utilizará os seguintes valores:

- Baixa;
- Média;
- Alta;
- Urgente.

### RN-AVL-014 — Status inicial da necessidade

Uma necessidade criada durante a avaliação será registrada inicialmente com o status:

- Identificada.

A evolução posterior dos status deverá ser definida quando o processo correspondente for detalhado.

### RN-AVL-015 — Relação com o plano de cuidados

A avaliação identifica a necessidade.

A definição de como a necessidade será atendida pertence ao plano de cuidados e não deve ser antecipada na Avaliação Inicial.

## 7. Recursos

### RN-AVL-016 — Recursos utilizados na avaliação

Os recursos identificados durante a avaliação devem ser selecionados entre recursos já cadastrados no sistema.

### RN-AVL-017 — Dados do recurso

Cada recurso associado à avaliação deve registrar:

- Recurso;
- Quantidade;
- Observação.

## 8. Informações clínicas

A avaliação pode registrar informações como anamnese, HDA, situação atual, observações, informações relevantes, conclusão e recomendação/conduta.

No MVP, essas informações devem ser registradas e consultadas pelo profissional autorizado, sem interpretação automática pelo sistema.

## 9. Histórico

Todas as avaliações realizadas para o paciente devem permanecer disponíveis no histórico.

O cadastro de uma nova avaliação não deve substituir registros anteriores.

## 10. Modelo conceitual

A estrutura principal da avaliação deve representar uma relação:

Paciente → Avaliação → Necessidades → Plano de cuidados

Os recursos identificados na avaliação são associados ao registro da avaliação e poderão servir posteriormente como entrada para outros processos.

## 11. Pendências que não devem virar regra agora

Ainda precisam ser validados antes de implementação definitiva:

- valores e estrutura detalhada dos campos clínicos;
- estrutura detalhada dos tipos de necessidade;
- evolução dos status das necessidades;
- possibilidade de editar necessidades após a avaliação ser utilizada no plano;
- regras de recursos, estoque, farmácia e logística;
- regras do plano de cuidados;
- escala;
- agendamento;
- visita;
- atendimento;
- evolução;
- reavaliação.

## 12. Princípio de não antecipação

Enquanto os processos posteriores não forem definidos e validados, nenhuma regra operacional deve ser criada antecipadamente para determinar escala, agenda, visitas, atendimento ou evolução.
