# Regras de Negócio — Registro do Atendimento

## 1. Objetivo e fronteira

O Atendimento registra o que foi efetivamente realizado durante uma `Visit`. Ele é separado do evento operacional da Visita e da Evolução, que acompanha mudanças do estado do paciente.

## 2. Registro mínimo

- **RN-ATE-01:** Um Atendimento pertence a exatamente uma Visita.
- **RN-ATE-02:** Cada visita pode ter no máximo um Atendimento válido no MVP.
- **RN-ATE-03:** A descrição dos cuidados/procedimentos efetivamente realizados é obrigatória e não pode ser vazia após remover espaços.
- **RN-ATE-04:** Observações adicionais são opcionais.
- **RN-ATE-05:** Paciente e profissional são derivados da visita e não podem divergir dela.
- **RN-ATE-06:** O atendimento registra usuário responsável e data/hora de criação e atualização.
- **RN-ATE-07:** Somente o profissional responsável por uma visita `EM_ATENDIMENTO` pode registrar ou atualizar seu Atendimento. A conta deve estar ativa e ter a permissão granular da operação.
- **RN-ATE-08:** Gerente e usuários com `atendimentos.view` podem consultar atendimentos; operações de gravação exigem `atendimentos.create` ou `atendimentos.update` e o vínculo com o profissional responsável.
- **RN-ATE-09:** O registro não é apagado fisicamente. Alterações relevantes mantêm autor, data/hora e conteúdo anterior/novo.
- **RN-ATE-10:** O Atendimento válido permite concluir a Visita como `REALIZADA`, registrando instante e profissional responsável. Sem descrição válida, a visita permanece `EM_ATENDIMENTO`.
- **RN-ATE-11:** O MVP não inclui formulário configurável, interpretação clínica automática, prescrição, evolução longitudinal ou anexos.

## 3. Permissões

O catálogo granular usa `atendimentos.view`, `atendimentos.create`, `atendimentos.update` e `atendimentos.delete`. A categoria Gerente recebe inicialmente as permissões; outras categorias podem recebê-las pela administração. `delete` não permite apagar registros.

## 4. Implementação

As regras RN-ATE-01 a RN-ATE-11 estão implementadas no app `attendance` e integradas ao fluxo de conclusão da Visita. A regressão integrada e os checks finais desta entrega são documentados em `docs/tasks/tasks_atendimento.md` e na auditoria do Processo 8.
