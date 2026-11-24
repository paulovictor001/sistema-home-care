# Requisitos Funcionais — Necessidades Identificadas

## RF-NEC-001 — Criar necessidade
O sistema deve permitir que Médico e Enfermeiro criem uma necessidade vinculada a uma avaliação.

## RF-NEC-002 — Vincular à avaliação
Cada necessidade deve estar vinculada a uma avaliação existente.

## RF-NEC-003 — Múltiplas necessidades
O sistema deve permitir múltiplas necessidades para uma mesma avaliação.

## RF-NEC-004 — Selecionar tipo
O sistema deve permitir selecionar o tipo a partir da entidade própria de tipos. Somente tipos ativos devem estar disponíveis para novas necessidades.

Tipos iniciais: Enfermagem, Fisioterapia, Médico, Nutrição, Terapia Ocupacional, Fonoaudiologia, Psicologia e Outro.

## RF-NEC-005 — Descrição obrigatória
O sistema deve exigir a descrição para permitir o salvamento.

## RF-NEC-006 — Prioridade obrigatória
O sistema deve exigir a prioridade, limitada a Baixa, Média, Alta ou Urgente.

## RF-NEC-007 — Status inicial
Toda nova necessidade deve ser criada com status **Identificada**.

## RF-NEC-008 — Editar
Médico e Enfermeiro podem editar necessidades.

## RF-NEC-009 — Visualizar
Médico e Enfermeiro podem consultar diretamente necessidades e histórico. O Gerente pode visualizar necessidades aninhadas nas avaliações às quais tem acesso, mas não pode consultar a lista, detalhe ou histórico pelo endpoint direto.

## RF-NEC-010 — Excluir
Médico e Enfermeiro podem excluir fisicamente uma necessidade sem histórico de situação e sem vínculo com plano. A API deve recusar com erro claro a exclusão de necessidades com histórico ou vínculo protegido por plano. A interface deve ocultar a ação quando o vínculo com plano for conhecido; se houver histórico, deve exibir a mensagem de bloqueio retornada pela API.

## RF-NEC-011 — Inativar
Gerente, Médico e Enfermeiro podem inativar necessidades.

## RF-NEC-012 — Preservar histórico
A inativação deve preservar o registro e seu histórico.

## RF-NEC-013 — Administrar tipos
Gerente, Médico e Enfermeiro com `tipos_necessidade.manage` podem criar, editar, ativar e inativar tipos. Criação e edição mantêm nome obrigatório e único e descrição opcional.

## RF-NEC-014 — Ativar/inativar tipos
O sistema deve permitir ativar e inativar tipos. Tipos inativos não podem ser usados em novos cadastros.

## RF-NEC-015 — Preservar vínculos históricos
A inativação de um tipo não deve remover ou invalidar vínculos históricos das necessidades que já o utilizam.

## RF-NEC-016 — Não implementar transições futuras
O sistema não deve implementar, neste processo, as demais transições de status que serão definidas no Plano de Cuidados.

## RF-NEC-017 — Preparar para Plano de Cuidados
A estrutura da necessidade deve permitir sua utilização posterior como base do Plano de Cuidados.

## RF-NEC-018 — Controle de acesso

| Ação | Gerente | Médico | Enfermeiro |
|---|---|---|---|
| Criar necessidade | Não definido | Sim | Sim |
| Visualizar diretamente (lista, detalhe e histórico) | Não | Sim | Sim |
| Visualizar dentro da avaliação | Sim, com `avaliacoes.view` | Sim | Sim |
| Editar necessidade | Não definido | Sim | Sim |
| Excluir necessidade | Não definido | Sim | Sim |
| Inativar necessidade | Sim | Sim | Sim |
| Administrar tipos | Sim | Sim | Sim |

Permissões não definidas não devem ser inventadas na implementação.

## RF-NEC-019 — Validar campos obrigatórios
O sistema deve impedir o salvamento quando estiver ausente qualquer campo obrigatório: avaliação vinculada, tipo, descrição ou prioridade.

## RF-NEC-020 — Manter dados
O sistema deve armazenar os dados necessários para identificar a necessidade, avaliação de origem, tipo, descrição, prioridade, status e informações de criação/atualização.

## RF-NEC-021 — Reativar com histórico
Gerente, Médico e Enfermeiro, com `necessidades.reactivate`, podem reativar necessidades. A necessidade deve voltar às consultas de ativas, preservando o status clínico e os eventos anteriores. O sistema deve registrar quem reativou, quando e os dados anteriores; repetir a operação não deve duplicar eventos. A tela de avaliação deve oferecer Reativar para registros inativos conforme a permissão do usuário.
