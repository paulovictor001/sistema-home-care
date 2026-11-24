## Processo 8 — Visita domiciliar (revisado em 24/11/2026)

### 1. Resumo e status

A Visita registra operacionalmente a ocorrência criada pelo Agendamento. O módulo `visits` implementa `Visit`, Agendamento, disponibilidade, histórico, API e tela. O Registro do Atendimento implementa modelo/histórico, permissões próprias, API, gravação na tela de Visitas e conclusão da visita mediante Atendimento válido. As Etapas 1–3 da Visita adicionaram justificativa persistida para não realização, permissões operacionais específicas e interface conectada ao Atendimento. A Etapa 4 concluiu regressão integrada e fechamento documental em 24/11/2026.

**Status: IMPLEMENTADO E VALIDADO.** A ocorrência é a própria entidade `Visit`; não deve ser recriada. `REALIZADA` é alcançada pelo fluxo de conclusão integrado ao Atendimento, que exige cuidados/procedimentos registrados e a permissão `visitas.finish`. As quatro etapas de implementação, testes e documentação foram concluídas.

### 2. Requisitos e implementação observada

| Área | Status | Evidência |
|---|---|---|
| Origem, identidade e dados | IMPLEMENTADO em Agendamento | `visits.models.Visit` é a ocorrência, ligada a Patient, CarePlan, CarePlanNeed, CareScale, ScaleNeed e Professional; snapshot integral de endereço. |
| Agendamento e histórico | IMPLEMENTADO | `visits.services` cria/edita ocorrências, grava `VisitHistory`, autoria, confirmação e motivo de cancelamento; série parcial e disponibilidade semanal. |
| Consulta e interface | IMPLEMENTADO | API em `/api/agendamentos/`; `src/lib/visits.ts` e `src/pages/Visits.tsx` exibem estado, endereço, justificativas, horários, autoria profissional e histórico; ações usam permissões específicas. |
| Confirmação, início, cancelamento, não realização | IMPLEMENTADO na API | Endpoint de status usa permissões `visitas.confirm`, `visitas.start`, `visitas.cancel` e `visitas.not_realized`; cancelamento e não realização exigem motivo. Início exige profissional ativo vinculado à conta e responsável pela visita. Estados terminais não retornam. |
| Conclusão REALIZADA | IMPLEMENTADO | A API de Atendimento conclui a visita somente após registro válido, com `visitas.finish`; grava instante e profissional responsável. |
| Permissões específicas de Visita | IMPLEMENTADO na API | Catálogo `visitas.view`, `update`, `confirm`, `cancel`, `start`, `finish` e `not_realized` criado com concessão inicial ao Gerente e seed reversível. Operações de status e conclusão usam as permissões próprias. |
| Histórico | IMPLEMENTADO para início/conclusão | `VisitHistory` registra ator, instante e dados anterior/novo. Início e conclusão também persistem instante e profissional na Visita. |
| Exclusão | IMPLEMENTADO | Visitas não podem ser apagadas; cancelamento preserva ocorrência e histórico. |

### 3. Inspeção de modelo e fluxo

- `Visit.plan_need` referencia `care_plans.CarePlanNeed`; `Visit.scale_need` mantém a atribuição da Escala separada. Isso resolve a correspondência conceitual do antigo `care_plan_item_id`.
- O endereço é armazenado integralmente no snapshot da ocorrência e edição não altera o cadastro do paciente.
- `VisitStatus` tem `AGENDADA`, `CONFIRMADA`, `EM_ATENDIMENTO`, `REALIZADA`, `CANCELADA` e `NAO_REALIZADA`.
- O fluxo de transição e conclusão mantém a Visita como entidade; início/conclusão persistem usuário ator e instante (`started_by`, `started_at`, `finished_by`, `finished_at`). A não realização persiste `not_realized_reason`, exigido pela API e por constraint do banco, além de registrá-lo no histórico.
- `VisitHistory` usa `PROTECT`, `actor`, nome do ator, evento, instante e JSON anterior/novo.
- As rotas existentes são `agendamentos/`, `agendamentos/<id>/`, `agendamentos/<id>/status/` e agenda semanal do profissional; o status exige permissões próprias de Visita. Atendimento usa `atendimentos/visitas/<id>/` e a conclusão integrada usa `atendimentos/visitas/<id>/concluir/`.

### 4. Decisões consolidadas

- **Identidade:** o agendamento persiste a própria ocorrência `Visit`.
- **Dependência:** Registro do Atendimento mínimo será implementado antes da conclusão de Visita. Atendimento exige descrição não vazia dos cuidados/procedimentos efetivamente realizados; observações adicionais são opcionais; paciente e profissional são herdados da visita.
- **Estados:** mantém-se o fluxo definido em Agendamento: `AGENDADA → CONFIRMADA → EM_ATENDIMENTO → REALIZADA`; de `AGENDADA`/`CONFIRMADA` também se pode ir para `CANCELADA` ou `NÃO_REALIZADA`; estados terminais não retornam.
- **Atores:** Gerente ou usuário com permissão granular pode confirmar, cancelar ou marcar não realizada. Somente o profissional responsável, autenticado pela conta vinculada e com permissão da ação, inicia e conclui sua própria visita; conclusão é executada pelo fluxo de Atendimento.
- **Permissões:** Agendamento conserva `agendamentos.*`. Visita usa `visitas.view`, `.update`, `.confirm`, `.cancel`, `.start`, `.finish` e `.not_realized`; Gerente recebe todas inicialmente.
- **Dados e auditoria:** início e conclusão guardam timestamp e profissional; não realização guarda justificativa textual. Histórico mantém ator, instante, evento e dados anterior/novo. Registros não são apagados.
- **Modelo do Plano:** a Visita aponta para `CarePlanNeed` e conserva também `ScaleNeed` como vínculo operacional.
- **Fronteira:** Visita contém estado operacional; Atendimento registra cuidados realizados; Evolução permanece processo separado. Checklist configurável, catálogo de motivos, reagendamento na Visita, troca direta de profissional e interpretação clínica automática ficam fora do MVP.

### 5. Dependências e sequência executada

Agendamento já está implementado e validado (Etapas 1–5 em `docs/tasks/tasks_agendamento.md`). Não foi recriado. A sequência aprovada foi executada:

1. Atendimento mínimo — modelo/autorização, API e regras, interface e regressão integrada concluídos.
2. Visita — persistência operacional/permissões, serviços/API para confirmação/cancelamento/não realização, interface e regressão integrada concluídos.

As etapas e testes estão decompostos em `docs/tasks/tasks_atendimento.md` e `docs/tasks/tasks_visita_domiciliar.md`. Visita — Etapa 1 foi concluída em 23/11/2026 com 39 testes aprovados; Etapa 2 com 47 testes (`visits.tests_models`, `visits.tests_services`, `visits.tests_api`, `attendance.tests_api`); Etapa 3 com teste de navegador para Atendimento, permissões, confirmação e não realização justificada. Na Etapa 3, `npm run build` passou e `npm run lint` terminou sem erros, com avisos `react(set-state-in-effect)` em `Visits.tsx` e `Resources.tsx`. Cada etapa exige teste, relatório de conclusão e autorização do usuário para avançar.

### 6. Evidência de execução

O relatório atualizado de Agendamento registra em 23/11/2026: `python manage.py test visits care_scales care_plans patients --verbosity 1` com 210 testes aprovados. Para o Atendimento, em 23/11/2026, `python manage.py test attendance visits care_scales care_plans patients accounts --verbosity 1` aprovou 273 testes; `manage.py check` não encontrou problemas e `makemigrations --check --dry-run` não detectou alterações. Na Visita, Etapa 2 teve 47 testes focados aprovados e a Etapa 3 teve teste de navegador aprovado.

**Fechamento da Etapa 4 (24/11/2026):** `python manage.py test visits attendance care_scales care_plans patients accounts --verbosity 1` aprovou 279 testes em 993,219 s. `python manage.py check` não encontrou problemas; `python manage.py makemigrations --check --dry-run` informou `No changes detected`. No frontend, `npm run build` passou, `npm run lint` terminou sem erros e com os dois avisos `react(set-state-in-effect)` já mencionados. `node --test tests/carePlans.test.mjs` aprovou 4 testes; `node --test tests/careScales.test.mjs` aprovou 3 testes; `node tests/careScales.browser.mjs` e `node tests/attendance.browser.mjs` passaram, sendo este último cobrindo gravação do Atendimento, permissões, confirmação, justificativa e conclusão da Visita em `REALIZADA`. Limitação: os testes de navegador usam APIs simuladas por fluxo; não houve um cenário único de ponta a ponta ligado a banco real percorrendo todos os módulos.
