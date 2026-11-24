# Tasks — Visita Domiciliar

Agendamento já criou `Visit` e concluiu suas etapas de implementação/testes em 23/11/2026 (`docs/tasks/tasks_agendamento.md`). Atendimento mínimo deve ser implementado antes da integração que permite concluir uma visita. Executar cada etapa sequencialmente, testar e aguardar autorização do usuário antes da etapa seguinte.

## Etapa 1 — Complementar persistência operacional e permissões

- [x] Adicionar à `Visit` instante e profissional de início e de conclusão.
- [x] Persistir justificativa de não realização no registro, além do evento de histórico.
- [x] Garantir autoria/data/hora para as ações operacionais e preservação dos eventos.
- [x] Criar permissões `visitas.view`, `update`, `confirm`, `cancel`, `start`, `finish`, `not_realized`; conceder inicialmente à categoria Gerente.
- [x] Garantir que `CarePlanNeed` seja a relação do item de Plano e manter o item da Escala em campo separado.
- [x] Testar migrations, constraints, histórico, seed reversível e consistência dos vínculos.

**Etapa 1 concluída em 23/11/2026.** Migration `0005_visit_not_realized_reason_and_more` adiciona a justificativa e impede estado `NAO_REALIZADA` sem texto; o serializer expõe o dado. O histórico preserva evento, ator nominal e instante, mesmo se a conta do ator for removida. Seed de permissões de Visita testado em reversão/reaplicação. `python manage.py test visits.tests_models visits.tests_services attendance.tests_api --verbosity 1`: 39 testes aprovados. `manage.py check`, `makemigrations --check --dry-run` e `git diff --check` concluídos; sem problemas de sistema ou alterações de migration pendentes.

## Etapa 2 — Serviços e API de operação

- [x] Separar as operações de Visita das permissões de Agendamento.
- [x] Confirmar visitas `AGENDADA` com `visitas.confirm`; cancelar com motivo e `visitas.cancel`; registrar não realização com justificativa e `visitas.not_realized`.
- [x] Iniciar somente visita `CONFIRMADA`, pelo usuário associado ao profissional responsável, com `visitas.start`; registrar timestamp e autor profissional.
- [x] Preservar as transições terminais e impedir retorno de visitas canceladas/não realizadas.
- [x] Integrar com Atendimento: permitir `REALIZADA` apenas após registro válido e por fluxo autorizado com `visitas.finish`; registrar timestamp e profissional responsável.
- [x] Não aceitar alteração direta de paciente, Plano, profissional herdado, item do Plano, item da Escala ou endereço histórico fora das regras já existentes de Agendamento.
- [x] Testar as ações por permissão, identidade profissional, motivo obrigatório, estados inválidos, Atendimento ausente/válido, autoria e histórico.

**Etapa 2 concluída em 23/11/2026.** O endpoint de status usa `visitas.confirm`, `visitas.cancel`, `visitas.not_realized` e `visitas.start`; justificativa de não realização é normalizada, persistida e auditada. A conclusão segue exclusivamente pelo endpoint de Atendimento com `visitas.finish`, identidade profissional responsável e Atendimento válido. `python manage.py test visits.tests_models visits.tests_services visits.tests_api attendance.tests_api --verbosity 1`: 47 testes aprovados. `manage.py check` e `makemigrations --check --dry-run` passaram; sem novas migrations.

## Etapa 3 — Interface conectada

- [x] Exibir no detalhe os dados operacionais, justificativa e histórico.
- [x] Mostrar início/conclusão com profissional e data/hora.
- [x] Exibir formulário/acesso ao Atendimento durante `EM_ATENDIMENTO`.
- [x] Condicionar ações às permissões específicas e pedir confirmação/motivo quando aplicável.
- [x] Tratar carregamento, vazio, erro, sucesso e validação.
- [x] Testar fluxos da interface e executar build/lint.

**Etapa 3 concluída em 23/11/2026.** Detalhe exibe os dados operacionais, snapshot do endereço, justificativas, horários/autoria profissional e histórico; ações usam `visitas.confirm/cancel/not_realized/start/finish`, pedem confirmação e exigem motivo nas ações cabíveis. Atendimento fica acessível durante `EM_ATENDIMENTO`. Teste de navegador `node tests/attendance.browser.mjs` cobriu registro e conclusão do Atendimento, permissões, confirmação e não realização com justificativa. `npm run build` passou; `npm run lint` terminou sem erros, com avisos existentes de `react(set-state-in-effect)` em `Visits.tsx` e `Resources.tsx`.

## Etapa 4 — Fechamento integrado

- [x] Testar Plano → Escala → Agendamento/Visit → Atendimento → Visita `REALIZADA`.
- [x] Executar regressão de visits, atendimento, care_scales, care_plans, patients e accounts.
- [x] Executar `manage.py check`, verificação de migrations, build e lint.
- [x] Atualizar auditoria de Visita com evidências, limitações e resultados executados.

**Etapa 4 concluída em 24/11/2026.** Regressão backend `python manage.py test visits attendance care_scales care_plans patients accounts --verbosity 1`: 279 testes aprovados em 993,219 s. A cadeia foi verificada por testes de Plano (backend e 4 testes frontend), Escala (backend, 3 testes frontend e navegador), e Visita/Atendimento (backend e navegador, incluindo conclusão em `REALIZADA`). `manage.py check`, `makemigrations --check --dry-run`, `npm run build` e `git diff --check` passaram. `npm run lint` terminou sem erros, com dois avisos `react(set-state-in-effect)` em `Visits.tsx` e `Resources.tsx`. Não foi executado um único teste ponta a ponta com banco real cobrindo todos os módulos simultaneamente; a integração é exercitada por regressão backend ampla e testes de navegador com APIs simuladas por fluxo.

## Fora do MVP

- [ ] Não implementar checklist configurável.
- [ ] Não implementar catálogo de motivos de não realização.
- [ ] Não implementar reagendamento dentro da Visita.
- [ ] Não implementar troca direta de profissional.
- [ ] Não implementar regras clínicas automáticas.
