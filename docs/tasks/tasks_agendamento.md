# Tasks — Agendamento

As etapas abaixo devem ser executadas sequencialmente. Cada etapa tem critérios de teste próprios; ao concluí-la, registrar os comandos e resultados e aguardar autorização para iniciar a próxima.

## Etapa 1 — Fundação de dados e disponibilidade

- [x] Criar o app `visits`, modelos, constraints e migrations para `Visit`, `VisitHistory` e agenda semanal profissional.
- [x] Modelar `Visit` como ocorrência agendada relacionada a paciente, plano, item do plano, escala e profissional herdado.
- [x] Persistir endereço integral em snapshot, data, início/fim, tipo único, status, observação, cancelamento, confirmação, autoria e timestamps.
- [x] Modelar uma ou mais janelas por dia da semana para cada profissional; ausência de configuração significa indisponível.
- [x] Registrar permissões granulares `agendamentos.create`, `view`, `update`, `delete`, `status`; concedê-las inicialmente à categoria Gerente.
- [x] Registrar app e rotas base no projeto sem ainda expor fluxos incompletos.
- [x] Testar constraints, relações, snapshots, disponibilidade semanal e seed reversível das permissões; executar checks/migrations do Django.

**Etapa 1 concluída em 23/11/2026.** Verificações: `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `python manage.py test visits.tests_models --verbosity 2` (6 testes aprovados) e `python manage.py migrate` (migrations aplicadas). O teste também confirmou reversão e reaplicação do seed de permissões.

## Etapa 2 — Serviços e regras de criação

- [x] Consumir `care_scales.contracts.scheduling_requirement` e rejeitar escala inativa, plano encerrado ou vínculos sem profissional vigente.
- [x] Validar datas dentro dos períodos do Plano e Escala, limites inclusivos.
- [x] Validar início anterior ao fim e contenção integral na janela semanal do profissional, em `America/Sao_Paulo`.
- [x] Validar conflitos de paciente e profissional com intervalos `[início, fim)`; ignorar somente visitas canceladas/não realizadas.
- [x] Exigir endereço do paciente e inicializar snapshot; tipo inicial `Atendimento domiciliar`; observação opcional.
- [x] Criar visita individual com estado `AGENDADA` e histórico/autoria.
- [x] Testar limites temporais, escala/plano inválidos, disponibilidade, fronteiras de intervalo, conflitos, snapshot e permissões.

**Etapa 2 concluída em 23/11/2026.** Verificações: `python manage.py test visits --verbosity 1` (15 testes aprovados), `python manage.py check` e `python manage.py makemigrations --check --dry-run` sem problemas. O serviço valida período, agenda semanal, conflitos, autorização, endereço e grava histórico/autoria.

## Etapa 3 — Séries, edição e ciclo de estado

- [x] Receber datas explícitas para geração da série e exigir a quantidade exata da frequência em cada semana (segunda a domingo) ou mês civil representado.
- [x] Validar cada ocorrência independentemente, criar as válidas e devolver erros por data para as inválidas, sem rollback das válidas.
- [x] Permitir edição individual de data, horário, snapshot de endereço, tipo e observação; revalidar horário/disponibilidade/conflitos.
- [x] Manter profissional herdado da atribuição vigente da Escala, sem alteração direta pela visita.
- [x] Implementar transições: `AGENDADA → CONFIRMADA → EM_ATENDIMENTO`; também de `AGENDADA`/`CONFIRMADA` para `CANCELADA` ou `NÃO_REALIZADA`.
- [x] Exigir motivo para cancelamento; registrar autor/data da confirmação; preservar terminais; `REALIZADA` pertence à integração com Atendimento.
- [x] Não implementar exclusão física ou lógica; `delete` não apaga registros.
- [x] Testar série parcial, quantidade por período, transições, motivo, autoria, edição e bloqueio de exclusão.

**Etapa 3 concluída em 23/11/2026.** Verificações: `python manage.py test visits --verbosity 1` (30 testes aprovados) e teste mensal adicional (1 aprovado); `python manage.py check` e `python manage.py makemigrations --check --dry-run` sem problemas.

## Etapa 4 — API e interface

- [x] Criar API para listar, filtrar, consultar, criar visita individual/série, editar, confirmar, iniciar, cancelar e marcar não realizada.
- [x] Aplicar permissões granulares e serializar os dados herdados e o snapshot.
- [x] Criar cliente frontend, rotas, listagem/filtros, formulário individual/série e detalhe da visita.
- [x] Criar configuração de agenda semanal e exibir indisponibilidade para orientar o agendamento.
- [x] Exibir ações conforme permissões e estados; pedir motivo no cancelamento; não oferecer exclusão.
- [x] Testar endpoints, controles de acesso, fluxo integrado e build/lint do frontend.

**Etapa 4 concluída em 23/11/2026.** API e interface implementadas. Verificações: `python manage.py test visits --verbosity 1` (36 testes aprovados), `python manage.py check`, `python manage.py makemigrations --check --dry-run`, `npm run build` e `npm run lint` (sem erros; aviso preexistente em `Resources.tsx`).

## Etapa 5 — Integração e fechamento

- [x] Verificar integração com Escala, Plano, Paciente/endereço e fronteira com Atendimento.
- [x] Revisar histórico completo de alterações relevantes e resultados parciais da série.
- [x] Executar a suíte de testes de Agendamento e os testes existentes impactados; corrigir regressões.
- [x] Atualizar documentação/auditoria com evidências de implementação e execução.
- [x] Confirmar que canceladas/não realizadas não são contadas como atendimentos realizados: não existe módulo nem consulta agregada de Atendimento implementada; os estados permanecem distintos e `REALIZADA` não pode ser definida pelo Agendamento.

**Etapa 5 concluída em 23/11/2026.** Verificação integrada: `python manage.py test visits care_scales care_plans patients --verbosity 1` — 210 testes aprovados em 894s; `manage.py check` e `makemigrations --check --dry-run` sem problemas; frontend `npm run build` aprovado e `npm run lint` sem erros (um aviso preexistente em `Resources.tsx`). O código não contém contagem/agregação de atendimentos; a validação de `REALIZADA` fica para a integração futura com Atendimento, conforme a fronteira funcional estabelecida.
