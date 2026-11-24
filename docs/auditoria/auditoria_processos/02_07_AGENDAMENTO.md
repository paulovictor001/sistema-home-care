## Processo 7 — **Agendamento** (auditado em 21/11/2026)

- `RN`: `docs/regras-de-negocio/regras_negocio_agendamento.md` (RN-AGE-01…042)
- `RF`: `docs/requisitos-do-sistema/requisitos_funcionais_agendamento.md` (RF-AGE-01…039)
- `TASK`: `docs/tasks/tasks_agendamento.md` (5 etapas com critérios de teste)
- Documento-mãe: `docs/Processos e Modelo de Dados.md` §3, §8, §9.3–9.4, §10–11, §14–15
- Decisão complementar: `care_scales/contracts.py` (`scheduling_requirement`) e auditoria do Processo 5

### 1. Resumo do processo

Agendamento transforma uma Escala ativa em uma ou mais visitas datadas, com horários definidos. Paciente, plano, item e profissional vêm da Escala; o endereço usado fica preservado no registro da visita. O processo implementa criação individual ou em série, validação de período, disponibilidade e conflitos, edição de ocorrência, transições controladas, confirmação, cancelamento com motivo e histórico.

**Entradas**: escala e vínculos ativos, frequência, disponibilidade profissional, período do plano/escala, data/horário, endereço e tipo. **Saídas**: visita(s) agendada(s), estado e histórico. As cinco etapas de implementação e integração foram concluídas em 23/11/2026.

### 2. Status geral

**IMPLEMENTAÇÃO CONCLUÍDA (Etapas 1 a 5 em 23/11/2026).** O backend contém modelos, serviços, API e agenda semanal; o frontend contém listagem, filtros, criação individual/série, detalhe, edição e ações de estado conforme permissões. A regressão de Escala, Plano, Paciente e Agendamento foi executada; a fronteira com Atendimento permanece definida e respeitada: este módulo não registra atendimento nem conclui uma visita.

### 3. Requisitos e status de implementação

#### 3.1 Regras de negócio

| Regras | Status | Evidência/observação |
|---|---|---|
| RN-AGE-01…04, 19 — permissões CRUD e alteração de status | **IMPLEMENTADO** | Permissões granulares são checadas por endpoint; `delete` retorna bloqueio e a interface não oferece exclusão. |
| RN-AGE-05…07, 24 — origem em Escala ativa, profissional herdado, múltiplos agendamentos e substituição na Escala | **PARCIAL** | Serviços individual/série consomem `scheduling_requirement()` e exigem profissional com atribuição vigente; substituição continua sendo feita na Escala. |
| RN-AGE-08…09, 26…28 — data/horários obrigatórios, geração em série, edição individual e agendamento avulso | **IMPLEMENTADO** | API e interface expõem criação individual/série com resultado por data e edição individual. |
| RN-AGE-10…12 — disponibilidade e conflitos do profissional/paciente | **IMPLEMENTADO NO SERVIÇO** | Criação e edição exigem contenção integral em janela semanal e aplicam conflitos `[início,fim)`; canceladas/não realizadas são ignoradas. |
| RN-AGE-13…14 — selecionar endereço e preservá-lo historicamente | **IMPLEMENTADO** | API devolve snapshot integral; criação/edição persistem snapshot da ocorrência. |
| RN-AGE-15…16, 23, 29 — tipo obrigatório, edição e observação | **IMPLEMENTADO** | API e interface permitem consultar e editar dados permitidos, com revalidação do serviço. |
| RN-AGE-17…18, 20…21, 34…35, 38 — status, transições, confirmação/cancelamento, motivo e preservação | **IMPLEMENTADO** | API/interface expõem transições permitidas, motivo de cancelamento e confirmação; `REALIZADA` pertence ao Atendimento. |
| RN-AGE-22, 25, 33 — edição e histórico de mudanças | **IMPLEMENTADO** | API serializa histórico de edição/transição com autor e dados anterior/novo; detalhe exibe eventos. |
| RN-AGE-30…32 — escala encerrada/suspensa e plano encerrado | **PARCIAL** | Criação consome contrato que rejeita escala não ativa e exige Plano ativo, incluindo rejeição de encerrado. Visitas existentes não são alteradas. |
| RN-AGE-36…37 — sem antecedência mínima/bloqueio próximo ao horário | **NÃO INICIADO** | Regras negativas mantidas para o MVP; ainda sem fluxo de edição/cancelamento para verificar comportamento. |

#### 3.2 Requisitos funcionais

| Requisitos | Status | Evidência/observação |
|---|---|---|
| RF-AGE-01…05, 09…13, 19, 21…23, 30, 34, 36 — criar, selecionar Escala, herdar dados, endereço, tipo, status, editar, visualizar e persistir | **IMPLEMENTADO** | Endpoints e interface cobrem seleção de Escala, snapshot, detalhe, filtros e edição. |
| RF-AGE-06…08, 20 — validar disponibilidade/conflitos e revalidar edição | **IMPLEMENTADO** | Serviços validam disponibilidade, período, horário e conflitos em criação e edição. |
| RF-AGE-14…18 — confirmar, controlar status, cancelar e marcar não realizada | **IMPLEMENTADO** | API e interface expõem transições válidas; histórico, confirmação e motivo são persistidos. |
| RF-AGE-24…26 — gerar série/ocorrência individual e editar ocorrência | **IMPLEMENTADO** | Série com datas explícitas e resposta parcial por ocorrência; edição por visita. |
| RF-AGE-27…29 — restrições por escala/plano | **PARCIAL** | Criação consome contrato da Escala, requer Plano ativo e valida datas dentro dos períodos. |
| RF-AGE-31…33 — histórico e autoria/data de confirmação | **IMPLEMENTADO** | Criação, edição e estados gravam eventos serializados; confirmação registra ator e instante. |
| RF-AGE-35 — exclusão preservando histórico operacional | **IMPLEMENTADO** | Exclusão é negada pela API; cancelamento com motivo preserva ocorrência e histórico. |

As tasks foram concluídas nas cinco etapas documentadas. As classificações refletem código e evidências de testes; itens parciais indicam limites de integração mantidos no escopo.

### 4. Evidências do backend

- `settings.py` instala `visits`; `sistema_home_care/urls.py` inclui o módulo. Rotas: `GET/POST /api/agendamentos/`, `GET/PATCH/DELETE /api/agendamentos/<id>/`, `POST /api/agendamentos/<id>/status/` e `GET/PUT /api/agendamentos/profissionais/<id>/agenda/`.
- `visits/models.py` persiste `Visit`, `VisitHistory` e `ProfessionalWeeklyAvailability`; migrations `0001_initial` e `0002_seed_scheduling_permissions` aplicadas. Testes `visits.tests_models`: 5 aprovados; `manage.py check` e `makemigrations --check --dry-run` sem problemas.
- `care_scales/contracts.py`: `scheduling_requirement(scale)` exige status `ACTIVE` e devolve paciente, plano, período, itens e profissionais vigentes; `visits/services.py` consome o contrato ao criar cada visita.
- `care_scales/models.py`: há escala, necessidades, atribuições, substituições e `ProfessionalPlanningInfo`. Esta última armazena `availability_notes` como texto, não disponibilidade temporal estruturada.
- `visits/services.py` inclui `create_visit()`, `create_visit_series()`, `edit_visit()`, `transition_visit()` e `delete_visit()` (bloqueada); os fluxos autorizados gravam histórico.
- `visits/tests_services.py` cobre criação/snapshot, frequência semanal e mensal, processamento parcial, edição/revalidação, transições, autoria, cancelamento e bloqueio de exclusão. `visits/tests_api.py` cobre endpoints, permissões, edição, estados, série e agenda semanal.
- Etapa 4: `python manage.py test visits --verbosity 1` — 36 testes aprovados; `manage.py check` sem problemas; `makemigrations --check --dry-run` sem alterações. Frontend: `npm run build` aprovado; `npm run lint` sem erros e com aviso preexistente em `src/pages/Resources.tsx`.
- Etapa 5: `python manage.py test visits care_scales care_plans patients --verbosity 1` — **210 testes aprovados em 894s**; `manage.py check`, `makemigrations --check --dry-run` e build do frontend sem problemas; lint sem erros, com um aviso preexistente em `Resources.tsx`. A cobertura inclui o contrato da Escala e mantém `REALIZADA` fora das transições do Agendamento.

### 5. Evidências do frontend

- `src/App.tsx` registra `/agendamentos` e `/agendamentos/:id`; `src/lib/visits.ts` consome as rotas do backend.
- `src/pages/Visits.tsx` implementa lista/filtros, criação individual/série, edição, detalhe/histórico, ações de estado, cancelamento com motivo e configuração de agenda semanal.
- Navegação e ações são condicionadas às permissões da sessão; o formulário informa que ausência de janelas representa indisponibilidade.

### 6. Entidades e relacionamentos

Entidades aprovadas para implementação:

```text
Visit (conceitual: visits)
 ├─> Patient
 ├─> CarePlan ─> CarePlanNeed
 ├─> CareScale ─> ScaleNeed ─> ScaleAssignment ─> Professional
 ├─> endereço utilizado (snapshot integral)
 └─> data, início/fim, tipo, status, observação, timestamps
VisitHistory (ator, instante, campos anterior/novo)
ProfessionalWeeklyAvailability (dias e janelas semanais)
```

O contrato da Escala é consumido pelos serviços de criação individual e em série. Os fluxos operacionais e o fechamento integrado foram implementados e verificados na Etapa 5.

### 7. Regras implementadas e pendentes

**Implementado nas Etapas 1 a 4**: persistência, snapshot, disponibilidade, permissões, serviços, API e interface. Os testes exercitam integração com escala, plano e paciente.

**Fechamento**: Etapa 5 concluiu a regressão integrada e confirmou a fronteira com Atendimento. Não existe ainda módulo nem consulta agregada de Atendimento no backend; portanto, não há contagem implementada que possa incluir canceladas/não realizadas. Seus estados são distintos de `REALIZADA`, e o Agendamento rejeita essa transição. O módulo Visita domiciliar/Atendimento será responsável pelo registro clínico e pela transição futura para `REALIZADA`.

**Limites**: não há antecipação de registro clínico ou evolução. Ficou definido que `Visit` representa a ocorrência agendada; registro clínico e conclusão pertencem ao processo Atendimento.

### 8. Problemas encontrados

| # | Problema identificado na auditoria | Tipo | Evidência | Situação após consolidação |
|---|---|---|---|---|
| P-AGE-1 | Processo sem implementação backend/frontend; RFs não executáveis. | Funcionalidade ausente | Serviços/API e telas presentes nas Etapas 2–4. | Resolvido nesta etapa. |
| P-AGE-2 | Contrato da Escala não possui consumidor; bloqueio da escala não se aplica a criação de visita. | Integração incompleta | `care_scales/contracts.py`, consumido nos serviços de criação e séries. | Resolvido para fluxo API/interface. |
| P-AGE-3 | Disponibilidade atual é texto informativo, insuficiente para validar horário. | Modelagem/dependência | Agenda estruturada com API GET/PUT e configuração de interface. | Resolvido nesta etapa. |
| P-AGE-4 | Entidade `visits` não está detalhada no doc-mãe §15. | Divergência documental | §15 listava entidades até Plano. | Resolvido nesta consolidação documental. |
| P-AGE-5 | Disponibilidade, conflitos e operação real ainda apareciam como pontos a validar no doc-mãe §11. | Regra indefinida | §11 “Escala e agendamento”. | Regras decididas e registradas. |
| P-AGE-6 | Semântica de exclusão, histórico e fronteira Agendamento/Visita/Atendimento incompleta. | Decisão/modelagem | RF-AGE-35; RN-AGE-17/20/25/33/38; doc-mãe §3/§14. | Regras e fronteiras decididas e registradas. |
| P-AGE-7 | Sem testes do processo; testes do contrato da Escala não foram executados. | Cobertura / A VALIDAR | `visits.tests_models`, `visits.tests_services` e `visits.tests_api`. | Resolvido: 210 testes de Agendamento e dependências (Escala, Plano e Paciente) aprovados na Etapa 5; build/lint frontend aprovados na Etapa 4. |

### 9. Decisões consolidadas

- **D-AGE-1 — Disponibilidade:** agenda semanal estruturada e bloqueante, configurada no perfil do profissional com dias da semana e uma ou mais janelas por dia; agenda ausente bloqueia. Horário local `America/Sao_Paulo`.
- **D-AGE-2 — Conflitos e fuso:** intervalos semiabertos `[início, fim)`; qualquer sobreposição conflita para paciente/profissional. Canceladas e não realizadas não bloqueiam. Horários usam `America/Sao_Paulo`, fuso local do atendimento.
- **D-AGE-3 — Série:** usuário seleciona datas explicitamente; quantidade informada deve corresponder à frequência por semana (segunda a domingo) ou mês civil representado; validar por ocorrência, criar as válidas e reportar as rejeitadas sem rollback.
- **D-AGE-4 — Períodos:** data dentro dos períodos do Plano e da Escala, com limites inclusivos.
- **D-AGE-5 — Endereço histórico:** snapshot integral por visita; edição muda somente o snapshot daquela ocorrência.
- **D-AGE-6 — Estados/fronteiras:** fluxo `AGENDADA → CONFIRMADA → EM_ATENDIMENTO → REALIZADA`; de `AGENDADA`/`CONFIRMADA` podem ir para `CANCELADA`/`NÃO_REALIZADA`. Terminais não mudam. `REALIZADA` e registro clínico pertencem ao Atendimento.
- **D-AGE-7 — Exclusão:** sem exclusão física ou lógica; cancelar com motivo preserva visita e histórico.
- **D-AGE-8 — Entidade:** `Visit` representa a própria ocorrência agendada.
- **D-AGE-9 — Permissões:** codenames granulares `agendamentos.create/view/update/delete/status`; Gerente recebe todas inicialmente, outras categorias podem receber pela administração. `delete` não apaga visitas.

Não há decisões funcionais pendentes para iniciar as etapas aprovadas. Detalhes de UX e validações técnicas serão tratados dentro das tasks, sem alterar essas regras.

### 10. Dependências com outros processos

- **Escala**: origem obrigatória, profissional e frequência; contrato consumido no agendamento. Substituição profissional permanece na Escala.
- **Plano de Cuidados**: plano e item relacionados; plano encerrado deve bloquear novas visitas.
- **Cadastro do paciente**: paciente e endereço corrente; visita preserva o endereço usado.
- **Profissionais/Usuários**: agenda semanal estruturada e configuração via API/interface; permissões granulares podem ser administradas nas categorias.
- **Visita/Atendimento**: `Visit` representa a ocorrência de Agendamento; registro clínico e conclusão pertencem ao Atendimento. Atendimento e Evolução não foram auditados aqui.

### 11. Tasks recomendadas

As decisões funcionais (TASK-AGE-001) e a consolidação documental (TASK-AGE-002) foram concluídas nesta etapa. A implementação está decomposta em `docs/tasks/tasks_agendamento.md`, com cinco etapas testáveis e checkpoints de autorização entre elas.

1. **Etapa 1 — Fundação de dados e disponibilidade:** concluída; modelos, migrations, snapshots, agenda semanal e permissões.
2. **Etapa 2 — Serviços e regras de criação:** concluída; contrato da Escala, limites de Plano/Escala, horário, disponibilidade, conflitos, snapshot e histórico inicial.
3. **Etapa 3 — Séries, edição e estados:** concluída; datas explícitas, processamento parcial, edição e ciclo de estados/histórico.
4. **Etapa 4 — API e interface:** concluída; endpoints, permissões, telas e configuração semanal.
5. **Etapa 5 — Integração e fechamento:** concluída em 23/11/2026; 210 testes aprovados, documentação fechada e fronteira com Atendimento registrada. Registro clínico, transição para `REALIZADA` e eventuais relatórios de atendimento permanecem no escopo do processo Atendimento, ainda não implementado.

---

**Próximo processo a ser analisado**: **Visita domiciliar**. Concluídos nesta etapa: Cadastro do Paciente, Avaliação Inicial, Necessidades Identificadas, Plano de Cuidados, Escala, Usuários e Agendamento (7 de 8).
