# Regras de Negócio — Necessidades Identificadas

## 1. Objetivo
Definir as regras para o cadastro e gerenciamento das necessidades identificadas a partir da avaliação inicial do paciente.

## 2. Relação com a Avaliação Inicial
- Toda necessidade deve estar vinculada a uma avaliação.
- Uma avaliação pode possuir múltiplas necessidades.
- Cada necessidade é um registro independente.
- As necessidades fazem a ligação entre a avaliação e o futuro Plano de Cuidados.

## 3. Permissões
- **Criar:** Médico e Enfermeiro.
- **Visualizar:** Médico e Enfermeiro.
- **Editar:** Médico e Enfermeiro.
- **Excluir:** Médico e Enfermeiro.
- **Inativar:** Gerente, Médico e Enfermeiro.

A permissão de visualização do Gerente não foi definida neste escopo.

## 4. Dados da Necessidade
A necessidade possui:
- Tipo
- Descrição
- Prioridade
- Status

Descrição e prioridade são obrigatórias.

Prioridades permitidas:
- Baixa
- Média
- Alta
- Urgente

## 5. Tipo da Necessidade
O tipo é uma entidade própria.

Tipos iniciais:
- Enfermagem
- Fisioterapia
- Médico
- Nutrição
- Terapia Ocupacional
- Fonoaudiologia
- Psicologia
- Outro

A administração dos tipos pode ser realizada por Gerente, Médico e Enfermeiro.

O tipo possui situação ativa/inativa. Tipos inativos não podem ser selecionados para novas necessidades, mas seus vínculos históricos devem ser preservados.

## 6. Status
Toda nova necessidade deve ser criada com o status **Identificada**.

Os demais status e suas transições serão definidos posteriormente junto ao Plano de Cuidados.

## 7. Exclusão e Inativação
Exclusão e inativação são operações distintas.
- A exclusão remove a necessidade conforme a persistência definida na implementação.
- A inativação mantém o registro e preserva seu histórico.
- Uma necessidade inativada não deve ser tratada como ativa.

## 8. Relação com o Plano de Cuidados
As necessidades identificadas serão utilizadas como base para o futuro Plano de Cuidados.

Este documento não define criação, aprovação, execução ou alteração do Plano de Cuidados.

## 9. Fora do escopo
Não são definidas aqui regras de:
- demais status e transições;
- frequência de atendimento;
- escala;
- agendamento;
- visita;
- atendimento;
- evolução;
- recursos, estoque ou farmácia relacionados à execução do cuidado.

## 10. Princípio
As necessidades devem representar aquilo que foi identificado na avaliação, sem antecipar regras operacionais dos processos posteriores.

## 11. Reativação (extensão solicitada)
- Gerente, Médico e Enfermeiro podem reativar uma necessidade inativada, com a permissão granular `necessidades.reactivate`.
- A necessidade volta a ser ativa, mantendo seus dados e o status clínico `Identificada`.
- A reativação preserva todos os eventos anteriores e registra ator, data e snapshot anterior à alteração.
- Repetir a reativação de uma necessidade já ativa não gera outro evento nem altera a data de atualização.
- A reativação da necessidade não altera a situação do tipo associado e não constitui transição clínica do Plano de Cuidados.
