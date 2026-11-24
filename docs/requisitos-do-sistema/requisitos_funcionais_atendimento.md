# Requisitos Funcionais — Registro do Atendimento

## Objetivo

Registrar os cuidados/procedimentos efetivamente realizados em uma visita e fornecer o requisito operacional para sua conclusão.

## Requisitos

- **RF-ATE-01:** O sistema deve permitir consultar o Atendimento conforme a permissão `atendimentos.view`.
- **RF-ATE-02:** O sistema deve criar um Atendimento associado a uma única `Visit` em estado `EM_ATENDIMENTO`.
- **RF-ATE-03:** O Atendimento deve exigir a descrição dos cuidados/procedimentos realizados.
- **RF-ATE-04:** O Atendimento deve permitir observações adicionais opcionais.
- **RF-ATE-05:** Paciente e profissional devem ser herdados da visita; o cliente não pode substituí-los.
- **RF-ATE-06:** O sistema deve registrar autor e timestamps de criação/atualização.
- **RF-ATE-07:** O sistema deve permitir atualizar o registro com permissão e manter histórico de alterações.
- **RF-ATE-08:** Somente o profissional responsável pela visita pode registrar ou atualizar seu Atendimento, com conta ativa e permissão granular correspondente.
- **RF-ATE-09:** Após um Atendimento válido, o profissional responsável pode concluir a visita como `REALIZADA`, se possuir `visitas.finish`; a conclusão registra instante e profissional.
- **RF-ATE-10:** O sistema deve bloquear conclusão sem descrição válida e impedir a conclusão de visita em estado diferente de `EM_ATENDIMENTO`.
- **RF-ATE-11:** O sistema não deve permitir exclusão física ou lógica do Atendimento.
- **RF-ATE-12:** O sistema deve manter dados do Atendimento fora dos campos operacionais da Visita e fora do processo de Evolução.

## Fora do MVP

Checklist configurável, catálogo de procedimentos, interpretação clínica automática, evolução longitudinal, prescrição e anexos.

## Evidência de implementação

Implementado nas Etapas 1–3 de `docs/tasks/tasks_atendimento.md`: modelo e histórico, API de consulta/gravação e conclusão da visita, e interface integrada à tela de Visitas. A regressão integrada e o fechamento documental ficam registrados na Etapa 4.
