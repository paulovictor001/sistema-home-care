# 04 — Auditoria de Regras de Negócio e Requisitos Funcionais

> Etapa 4. Auditoria estática documental, sem execução de testes ou alteração de código. Data: 21/11/2026. As classificações descrevem evidência no repositório; “CONCLUÍDO” não significa validado em runtime.

## Escopo e critério

Foram cruzados `docs/auditoria/00_AUDITORIA_MEMORIA.md`, `01_INVENTARIO.md`, `02_AUDITORIA_PROCESSOS.md`, `03_AUDITORIA_TECNICA.md`; os documentos originais em `docs/regras-de-negocio/`, `docs/requisitos-do-sistema/` e `docs/tasks/`; backend Django (models, serializers, views, services, permissions, URLs e testes), rotas/páginas/clientes React e `AGENTS.md` fornecido no contexto. As referências de implementação abaixo apontam os locais primários; os resultados detalhados por ID reproduzem a inspeção estática da etapa 2 e foram confrontados com as fontes originais nesta etapa.

**Status:** CONCLUÍDO = funcionalidade correspondente encontrada e sem divergência material conhecida; PARCIAL = parte ausente, quebrada, provisória ou com cobertura incompleta; DIVERGENTE = comportamento contradiz requisito/regra; NÃO INICIADO = não há fluxo correspondente; FORA DO MVP = exclusão explícita do escopo; A VALIDAR = evidência estática/testes existentes sem execução. Quando necessário, combinam-se status (ex.: `CONCLUÍDO / A VALIDAR`).

## Visão geral por processo

| Processo | Regras | Requisitos | Cobertura observada |
|---|---:|---:|---|
| Cadastro do paciente | RN-CAD-PAC-001…024 | RF-PAC-001…021 | Parcial: 19 RN concluídas, RN-002 divergente, RN-005/009 parciais, RN-007 não iniciada, RN-015 fora do MVP; requisitos com RF-PAC-007 parcial e itens de idade/auditoria com ressalvas documentadas. |
| Avaliação inicial | RN-AVL-001…017 + §§8–9 | RF-AVL-001…020 | Parcial: 15/19 concluídas, 3 parciais, 1 divergente; RF: 16 concluídos, 3 parciais e 1 divergente. |
| Necessidades identificadas | RN-NEC §§2–11 (sem IDs formais) | RF-NEC-001…021 | Parcial: 16/18 regras concluídas, 1 parcial, 1 divergente; RF: 17 concluídos, 3 parciais, 1 divergente. |
| Plano de cuidados | RN-PLC §§2–10 (sem IDs formais) | RF01…RF14 | Parcial: 26/28 regras concluídas, 1 parcial, 1 não iniciada; 13/14 requisitos concluídos e RF05 parcial. |
| Escala | RN-ESC-01…027 | RF-ESC-01…024 | Parcial: 26/27 regras concluídas e RN-ESC-25 parcial; 23/24 requisitos concluídos e RF-ESC-22 parcial. |
| Usuários | regras por seção, sem IDs formais | requisitos por seção, sem IDs formais | Parcial: CRUD e administração conectados; recuperação de senha adiada; Profissional é stub; decisões e testes pendentes. |
| Agendamento | RN-AGE-01…038 | RF-AGE-01…036 | Não iniciado; contrato preparatório da Escala não constitui agendamento. |
| Visita domiciliar | RN-VIS-01…040 | RF-VIS-01…035 | Não iniciado; nenhum app/modelo/API/tela. |

As contagens e exceções decorrem das análises por processo em `02_AUDITORIA_PROCESSOS.md`; testes de backend/frontend mencionados ali não foram executados e ficam **A VALIDAR**.

## Cadastro do paciente

**Fontes:** `regras_negocio_cadastro_paciente.md` (RN-CAD-PAC-001…024), `requisitos_funcionais_cadastro_paciente.md` (RF-PAC-001…021), `tasks_cadastro_paciente.md`.

**Implementação:** backend `backend/sistema_home_care/patients/{models,serializers,views,urls,audit}.py`; autorização em `accounts/permissions.py`; telas `src/pages/{PatientsList,PatientForm,PatientDetail}.tsx`, cliente `src/lib/patients.ts`; testes `patients/tests.py`, `tests_health_conditions.py`, `accounts/tests.py`. API `/api/pacientes/` (CRUD e ações `inativar`/`reativar`), catálogo de médicos e tipos nos endpoints de pacientes. Acesso: gerente cria/inativa/reativa e altera responsáveis; gerente/médico/enfermeiro consulta/edita conforme campos; backend impõe permissões.

| IDs e descrição documentada | Status e evidência resumida |
|---|---|
| RN-CAD-PAC-001…004 — ator, obrigatórios, CPF único, nascimento/idade | 001, 003, 004 CONCLUÍDOS; 002 DIVERGENTE: create agrega `responsible_doctor`, `health_condition` e `address`, não todos os obrigatórios definidos pelo doc. Model/serializer/validator; `patients/tests.py`. |
| RN-CAD-PAC-005…009 — saúde, endereço único, região, médico, equipe | 005 PARCIAL: catálogo HealthCondition mínimo; 006, 008 CONCLUÍDOS; 007 NÃO INICIADO como regra própria de região; 009 PARCIAL: `responsible_team` JSON provisório sem validação. |
| RN-CAD-PAC-010…015 — troca de responsáveis, status, (re)ativação, consulta inativos e efeitos | 010–014 CONCLUÍDOS; 015 FORA DO MVP explicitamente sem efeito operacional implementado. |
| RN-CAD-PAC-016…020 — busca, filtros, paginação | CONCLUÍDOS: nome/CPF/status/região e 20 por página em `patients/views.py` e `PatientsList.tsx`. |
| RN-CAD-PAC-021…024 — visualização, edição, autorização e ações idempotentes | CONCLUÍDOS na API/UI; não se inferiu validação em execução. |
| RF-PAC-001…006, 008…009, 011…014, 016…018, 020…021 | Correspondentes em telas/API descritas, em geral CONCLUÍDOS / A VALIDAR. RF-PAC-007 PARCIAL (equipe JSON livre); RF-PAC-010 região conforme campo de bairro/região com limitação documental indicada na auditoria de processo. |
| RF-PAC-015, 019 | 015 acompanha a limitação de equipe. 019: nascimento é dado persistido; cálculo/armazenamento de idade deve ser lido conforme requisito original e não se deve inferir idade clínica dinâmica; ressalva registrada em `02_AUDITORIA_PROCESSOS.md`. |

**Divergências e evidências:** `02_01_CADASTRO_DO_PACIENTE.md` (RN-002, RN-005/007/009/015 e RF); `patients/models.py` evidencia o campo JSON provisório e a entidade mínima HealthCondition. Cobertura de teste existente não foi executada. Tasks marcadas/concluídas não foram tomadas como prova de validação; lista de divergências e tasks sem evidência está na seção Consistência.

## Avaliação inicial

**Fontes:** `regras_negocio_avaliacao_inicial.md` (RN-AVL-001…017 e §§8–9), `requisitos_funcionais_avaliacao_inicial.md` (RF-AVL-001…020), `tasks_avaliacao_inicial.md`.

**Implementação:** backend `assessments/{models,serializers,views,permissions,urls}.py`; telas `AssessmentForm.tsx`, `AssessmentDetail.tsx`, `AssessmentsHistory.tsx`; edição de necessidade em `NeedEditForm.tsx`; cliente `lib/assessments.ts`. Endpoints sob `/api/avaliacoes/` e `/api/necessidades/`. Médico/enfermeiro criam/editam; gerente, médico e enfermeiro visualizam, sujeito às permissões granulares. Testes backend em `assessments/tests*.py`; sem testes frontend de avaliação identificados.

| IDs e descrição documentada | Status e evidência resumida |
|---|---|
| RN-AVL-001…004 — tipo, criadores, obrigatórios, origem | CONCLUÍDOS na API/formulário. |
| RN-AVL-005 — responsável | PARCIAL: atribuição existe, mas casos de profissional inativo/escopo demandam validação conforme Processo 2. |
| RN-AVL-006…007 — avaliações múltiplas e edição | CONCLUÍDOS. |
| RN-AVL-008 — alteração pelo gerente | DIVERGENTE: API permite troca em condições previstas, mas a tela não oferece a ação do gerente. |
| RN-AVL-009…017 — consulta/status, criação e dados da necessidade, prioridade/status inicial, plano e recursos | CONCLUÍDOS salvo RN-AVL-015 (integração em preparação, vínculo filtrado para necessidades IDENTIFIED) e itens parciais descritos no Processo 2; recursos são selecionados do catálogo existente. |
| §§8–9 da RN | Contados como dois itens na auditoria anterior; documentação/limites de interpretação e compatibilidade foram mapeados no Processo 2. |
| RF-AVL-001…005, 007…011, 013…018, 020 | CONCLUÍDOS / A VALIDAR conforme fluxo de formulário, detalhe, histórico e associação com plano. |
| RF-AVL-006 | DIVERGENTE: ação de alteração de responsável pelo gerente não está disponível na interface. |
| RF-AVL-002, 012, 019 | PARCIAIS: validação agregada/recursos/acesso têm ressalvas detalhadas no Processo 2; regra de API não implica equivalência completa de UX. |

Detalhamento das três regras parciais e dos RF parciais: `02_02_AVALIACAO_INICIAL.md` (PA-1…PA-14, DA-1…DA-6). Testes backend existentes (86 no inventário dessa etapa) e ausência de testes frontend não foram validados por execução.

## Necessidades identificadas

**Fontes:** `regras_negocio_necessidades_identificadas.md` (seções §§2–11 sem IDs), `requisitos_funcionais_necessidades_identificadas.md` (RF-NEC-001…021), `tasks_necessidades_identificadas.md`.

**Implementação:** backend `assessments/{models,serializers,views,permissions,urls}.py`, catálogo em `patients/{models,views,urls}.py`; telas de avaliação/detalhe e `NeedTypes.tsx`; cliente `lib/assessments.ts`. Endpoints `/api/necessidades/`, `/api/tipos-necessidade/` (catálogo e status, sem operações completas de administração de tipo). Testes `assessments/tests_needs_api.py`, `tests_need_permissions.py`, `tests_need_inactivation.py`, `patients/tests.py` etc. A matriz de ação usa permissões granulares.

| IDs e descrição documentada | Status e evidência resumida |
|---|---|
| RN-NEC §§2, 4, 6–11 — criação, vínculo, campos/status, edição/consulta, histórico, não antecipar estados, integração futura, acesso, validação | CONCLUÍDOS segundo Processo 3, com validação em backend e fluxo de avaliação; execução dos testes pendente. |
| RN-NEC §3 — exclusão | PARCIAL: exclusão física pode ser bloqueada por vínculos; preservação histórica não é uniforme em todos os cenários. |
| RN-NEC §5 — administração de tipos | DIVERGENTE: interface `/tipos` chama `/api/tipos/` inexistente; backend não implementa criação/edição dos tipos conforme requisito. |
| RF-NEC-001…009, 011…012, 015…017, 019…021 | CONCLUÍDOS / A VALIDAR em API e telas da avaliação/detalhe. |
| RF-NEC-010, 014, 018 | PARCIAIS conforme exclusão, ativação de tipos e controle de acesso catalogados no Processo 3. |
| RF-NEC-013 | DIVERGENTE: administração de tipos não possui endpoint funcional correspondente; página `NeedTypes.tsx` usa caminho órfão. |

Não há item de menu para tipos e a rota tem restrição de Gerente, mas isso não cria funcionalidade backend. `02_03_NECESSIDADES_IDENTIFICADAS.md` registra PN-1…PN-11 e DN-1…DN-5. Aproximadamente 46 testes backend encontrados, não executados; nenhum teste frontend.

## Plano de cuidados

**Fontes:** `regras_negocio_plano_cuidados.md` (seções §§2–10 sem IDs), `requisitos_funcionais_plano_cuidados.md` (RF01…RF14), `tasks_plano_cuidados.md` (sem IDs/checkboxes).

**Implementação:** backend `care_plans/{models,serializers,views,permissions,services,contracts}.py`, endpoint `/api/planos-cuidados/`; frontend `CarePlans.tsx`, `CarePlanDetail.tsx`, `PlanNeedConfiguration.tsx`, `PlanNeedRemoval.tsx`, `lib/carePlans.ts`. Gating por `canPlan` no frontend e `has_plan_permission`/seeds em `accounts/migrations/0010_seed_care_plan_permissions.py`; API aplica granular permissions. Testes em `care_plans/tests*.py`; frontend `tests/carePlans.test.mjs`.

| IDs e descrição documentada | Status e evidência resumida |
|---|---|
| RN-PLC §§2, 3.2…10 — criação, vínculo/configuração, edição/consulta, status/encerramento/reativação, exclusividade, auditoria e fronteiras | CONCLUÍDOS segundo Processo 4, com fluxo de API/UI conectado. |
| RN-PLC §3.1 — plano obrigatório | NÃO INICIADO: criação não exige plano completo obrigatório antes da ativação, conforme a regra analisada. |
| RN-PLC §4.1 — remover última necessidade | PARCIAL: caso-limite sem decisão/garantia uniforme documentada ou coberta. |
| RF01…RF04, RF06…RF14 | CONCLUÍDOS / A VALIDAR. |
| RF05 — exibir criação/atualização | PARCIAL: timestamps/modelo existem, mas exibição requerida não está integral na UI. |

56 testes backend em 17 arquivos e 3 testes frontend foram encontrados, sem execução. Casos não especificados: edição de plano encerrado, intervalo invertido, profissional inativo e remoção da última necessidade. `02_04_PLANO_DE_CUIDADOS.md` (PC-1…PC-11, DPC-1…DPC-7) contém localização e análise detalhada.

## Escala

**Fontes:** `regras_negocio_escala.md` (RN-ESC-01…027), `requisitos_funcionais_escala.md` (RF-ESC-01…024), `tasks_escala.md` (itens desmarcados, apesar de tarefas/PRs listados em `execucao_tasks_a_fazer.md`).

**Implementação:** backend `care_scales/{models,services,views,serializers,permissions,planning,contracts,audit}.py`, API `/api/escalas/`; frontend `CareScales.tsx`, `CareScaleDetail.tsx`, `ScaleNeedManagement.tsx`, `lib/careScales.ts`; rotas em `App.tsx`; acesso pelo menu `/acesso/` em `AppLayout.tsx`. A API e menu restringem por permissão granular, atualmente seed para Gerente. Testes em 28 arquivos `care_scales/tests*.py`, testes declarativos `tests/careScales.test.mjs` e roteiro `tests/careScales.browser.mjs`.

| IDs e descrição documentada | Status e evidência resumida |
|---|---|
| RN-ESC-01…024, RN-ESC-026…027 — permissão, vínculos, necessidades/profissionais, frequência, período/status, observações, disponibilidade, separação Agendamento, histórico | CONCLUÍDOS segundo Processo 5, com ressalvas operacionais e de decisão catalogadas ali; testes não rodados. |
| RN-ESC-025 — encerrada não agenda | PARCIAL: contrato `scheduling_requirement` impede consumo futuro, mas Agendamento inexiste; não comprova bloqueio de geração de ocorrências. |
| RF-ESC-01…021, RF-ESC-023…024 | CONCLUÍDOS / A VALIDAR conforme implementação e limitações documentadas no Processo 5. |
| RF-ESC-022 — histórico e impedir novos agendamentos | PARCIAL: histórico está presente; parte de agendamento não tem consumidor. |

37 testes backend, 2 casos frontend e um e2e foram encontrados e não executados. Questões relevantes: possibilidade de escala sobre plano não ativo, exclusão em qualquer estado, observação/frequência e ausência de superusuário em `canScale`; ver `02_05_ESCALA.md` (P-ESC-1…12, D-ESC-1…7). O inventário de IDs da etapa anterior estava desatualizado; prevalecem os arquivos originais RN-ESC-01…027.

## Usuários

**Fontes:** `regras_usuarios.md`, `requisitos_usuarios.md`, `tasks_usuarios.md` (documentos sem IDs formais); decisões de continuidade em `AGENTS.md`.

**Implementação:** backend `accounts/{models,services,serializers_users,views_users,permissions,urls_users}.py`, `professionals/models.py`; endpoints `/api/usuarios/`, `/api/categorias/`, `/api/profissoes/`, `/api/permissoes/` e `/api/profissionais-livres/`. Páginas `UsersList`, `UserForm`, `UserDetail`, `Categories`, `Professions`; cliente `lib/users.ts`. Gerente com permissão granular administra. `accounts/tests_users.py` cobre os serviços/API (30 testes segundo memória), não executados.

As capacidades de criação, consulta, edição, ativação/inativação, categorias/permissões e profissões têm correspondência frontend/API. Recuperação de senha foi adiada; campos profissionais permanecem stub; regras sem ID precisam ser citadas por título/seção e não permitem rastreabilidade automatizada. `02_06_USUARIOS.md` (P-USU-1…8, D-USU-1…5) contém divergências e escopo residual.

## Agendamento

**Fontes:** `regras_negocio_agendamento.md` (RN-AGE-01…038), `requisitos_funcionais_agendamento.md` (RF-AGE-01…036), `tasks_agendamento.md`.

**Resultado:** NÃO INICIADO para o processo. Não há app, model, migration, serializer, view, URL, cliente ou tela de agendamento. Não há endpoints de `/api/agendamentos/`; não há permissões de processo definidas/implementadas. Sem operações ou fluxo frontend. O contrato de escala `care_scales/contracts.py`/`tests_scheduling_contract.py` é uma preparação sem consumidor e não atende RF/ RN de agendamento.

| Conjunto | Descrição coberta e classificação |
|---|---|
| RN-AGE-01…038 | Permissões, origem/vínculos, agenda, disponibilidade/conflitos, endereço, status/transições, cancelamento, edição, geração individual/série, histórico/confirmacão/antecedência: todos NÃO INICIADOS. |
| RF-AGE-01…036 | Criação e geração, validação, manutenção das ocorrências, estados, histórico, visualização, exclusão e persistência: todos NÃO INICIADOS. |

Teste de processo inexistente; testes de contrato da Escala não são evidência de Agendamento. Ver `02_07_AGENDAMENTO.md` (P-AGE-1…7, D-AGE-1…9). Decisões pendentes incluem disponibilidade, conflito, recorrência, identidade da ocorrência compartilhada com Visita, estados e autorização.

## Visita domiciliar

**Fontes:** `regras_negocio_visita_domiciliar.md` (RN-VIS-01…040), `requisitos_funcionais_visita_domiciliar.md` (RF-VIS-01…035), `tasks_visita_domiciliar.md`.

**Resultado:** NÃO INICIADO. Sem app/modelo/migration/API/URL/cliente/página/testes ou permissões próprias. Portanto não existem telas, endpoints ou operações para visualizar/iniciar/finalizar/cancelar/não realizar visita.

| Conjunto | Descrição coberta e classificação |
|---|---|
| RN-VIS-01…040 | Autorização, criação pelo agendamento, vínculos, visualização, estados, início/término, registro de atendimento, não realização/cancelamento, fronteiras e histórico: todos NÃO INICIADOS. |
| RF-VIS-01…035 | Tela/dados, origem e vínculos, ações de status, integração com Registro do Atendimento, permissões, auditoria e preservação: todos NÃO INICIADOS. |

**Divergência documental:** RF-VIS §11 afirma que a entidade `visits` foi definida em Agendamento; `Processos e Modelo de Dados.md` e código não apresentam essa entidade. Registro do Atendimento também não está definido/implementado. Ver `02_08_VISITA_DOMICILIAR.md` (P-VIS-1…6, D-VIS-1…7).

## Consistência transversal

### Regras sem implementação ou implementação parcial

- Cadastro: RN-CAD-PAC-002 diverge; RN-CAD-PAC-005/009 parciais; 007 ausente; 015 fora do MVP.
- Avaliação: RN-AVL-008 sem ação de UI gerente; RN-AVL-002/003/005 parciais; decisões de recursos, interpretação e histórico requerem confirmação.
- Necessidades: administração de tipos está quebrada/ausente; exclusão e ativação de catálogo incompletas.
- Plano: exigência de plano completo e caso da última necessidade não resolvidos; timestamps não aparecem como requerido.
- Escala: integração que depende de agendamento é apenas contrato, sem consumidor.
- Usuários: recuperação de senha adiada; entidade Profissional é stub.
- Agendamento e Visita: regras e requisitos inteiros sem implementação.

### Funcionalidade sem requisito ou com rastreabilidade insuficiente

- `HealthCondition` é catálogo mínimo; `responsible_team` é JSON provisório. A documentação do processo não define plenamente seu catálogo/equipe real.
- Auditorias (`PatientAuditLog`, `UserAuditLog`, histórico do plano/escala) implementam infraestrutura e eventos além de telas de consulta/retention especificadas em todos os documentos. Requisito de “registrar” não equivale a requisito de consulta/retention.
- Perfis/categorias e permissões granulares fornecem administração além do modelo de processo do doc-mãe, que não contém processo Usuários; `regras_usuarios.md`/`requisitos_usuarios.md` são fontes separadas sem IDs.
- A tela `NeedTypes.tsx` e rota associada existem, mas o endpoint chamado não existe. É uma tela sem funcionalidade efetiva, não funcionalidade não documentada.
- Contrato `scheduling_requirement` em Escala é preparação técnica sem requisito implementado de agendamento.

### Contradições, duplicidades e definições pendentes

- **Agendamento × Visita:** RF-VIS §11 pressupõe entidade definida no Agendamento, embora processo/doc-mãe/repositório não a definam. RN/RF dividem criação, identidade e status entre processos; resolver ocorrência compartilhada antes de construir ambos.
- **Requisitos duplicados por responsabilidade:** RN/RF da Escala excluem datas/horários e conflitos para Agendamento; RN/RF de Visita encaminham troca de profissional à Escala e mudança temporal ao Agendamento. Isso é sobreposição intencional de fronteira, mas exige um dono transacional claro e contratos consistentes.
- **Cadastro:** divergência entre lista de obrigatórios no documento e agregação efetiva do serializer; definir se doença/estado, médico e endereço são simultaneamente obrigatórios e alinhar RN/RF.
- **IDs ausentes:** regras de Necessidades, Plano e Usuários e requisitos de Plano/Usuários usam seções/títulos em vez de IDs estáveis; a mesma ideia reaparece nas regras/requisitos do processo, dificultando contagem e detecção de duplicidade. Não foram inferidas duplicidades semânticas como defeito quando a repetição exprime atores diferentes ou validação em camadas.
- **Decisões sem especificação suficiente:** região e equipe do paciente; estados e regras de avaliação; exclusão/inativação e tipos de necessidade; fim de plano/última necessidade; critérios de escala e profissionais; disponibilidade/recorrência/conflitos de agendamento; estados, autoria, atendimento e vínculo de visita. Ver decisões D*/P* em `02_AUDITORIA_PROCESSOS.md`.

### Tasks concluídas sem evidência suficiente

- `tasks_escala.md` contém itens desmarcados enquanto `execucao_tasks_a_fazer.md` relaciona TA-120…154/PRs como concluídos; o código dá evidência estática de grande parte da escala, mas os testes/e2e não foram rodados e RN-ESC-25/RF-ESC-22 seguem parciais.
- `tasks_plano_cuidados.md` não tem estado de conclusão; não pode ser usada como prova de entrega. A evidência é o código + testes encontrados, com lacunas em RF05 e regras de borda.
- Nos demais processos, marcações em tasks não são atestado de fluxo completo: as divergências do Cadastro, UI de Avaliação, página de Tipos e ausência de Agendamento/Visita prevalecem sobre qualquer marcação. Comparar task por task sem IDs/estado normalizado não permite afirmar conclusões mais granulares do que as documentadas em `02_AUDITORIA_PROCESSOS.md`.

### Implementações sem testes comprovados

- Nenhum teste foi executado nesta auditoria. Existência de teste é evidência de intenção/cobertura declarada, não de funcionamento atual.
- Sem testes frontend para Cadastro? há arquivos de teste de planos/escalas no inventário, mas não foi confirmada cobertura automatizada para todos os fluxos/telas; Avaliação e necessidades não têm teste frontend identificado.
- Processos Agendamento e Visita não possuem testes próprios. Teste de contrato de Escala não substitui teste de integração com consumidor.
- Cobertura de autorização, casos de borda e permissões de grupos versus permissões granulares deve ser validada em execução; a API é a autoridade efetiva, não o gating visual.

## Limitações e conclusão

O relatório é estático. Não foram executados testes, builds, checks, migrações ou chamadas HTTP; não foi inspecionado banco nem ambiente. Os códigos de teste citados são arquivos encontrados em etapas anteriores. A conclusão de alto nível é que Cadastro, Avaliação, Necessidades, Plano, Escala e Usuários possuem implementação em graus diferentes; Agendamento e Visita continuam sem fluxo. Regras documentais e implementações parciais devem orientar a matriz de rastreabilidade, backlog e decisões antes do plano de execução.
