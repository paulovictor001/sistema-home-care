# 05 — Backlog geral consolidado

Consolidação da auditoria estática revisada em 23/11/2026. As referências P*/D* e AT-* apontam para as evidências detalhadas nos relatórios; identificadores TASK-* são chaves deste backlog e não substituem IDs dos documentos-fonte. APP-05 já foi implementado; APP-06/07 foram autorizados e têm etapas próprias.

## Critérios de prioridade

- **P0** — risco de segurança ou perda de dados que impede disponibilizar o sistema com segurança. Nesta consolidação, somente CSRF de mutações autenticadas por cookie recebe P0: é um risco comprovado no código e precisa ser fechado antes de expor a aplicação a usuários em navegador. Não há achado crítico confirmado em execução.
- **P1** — necessário para um MVP utilizável e consistente, inclusive fluxos já existentes, integridade/persistência no modo de operação previsto e processos operacionais centrais.
- **P2** — importante para ampliar robustez, operação ou cobertura, mas pode vir depois do núcleo do MVP.
- **P3** — melhoria futura, otimização ou funcionalidade expressamente adiada.

## Visão consolidada

| Processo/área | Situação auditada | Principais pendências |
|---|---|---|
| Cadastro de paciente | Parcial | Divergência de obrigatórios/status, equipe e condição de saúde provisórias, regra de região, autorização, exibição e validação de formulário. |
| Avaliação inicial | Parcial | Ação de gerente ausente na UI, decisões sobre responsáveis/recursos/auditoria e validação de regras. |
| Necessidades | Parcial | Tela de tipos aponta para API inexistente; operações e permissões do catálogo precisam de decisão; exclusão vinculada pode falhar. |
| Plano de cuidados | Parcial | Regra de obrigatoriedade e bordas do plano sem decisão; timestamps incompletos na UI. |
| Escala | Parcial | Sem consumidor para bloqueio de agendamento; decisões de elegibilidade, exclusão e disponibilidade. |
| Usuários/Profissionais | Parcial | Decisões consolidadas em 23/11/2026: exclusão bloqueada com referências protegidas; vínculo 1:1 profissão/categoria; vínculo obrigatório usuário/profissional; recuperação de senha incluída no MVP via SMTP; auditoria permanece mínima. Execução ainda pendente; Profissional permanece stub. |
| Agendamento | Implementado e testado | Etapas 1–5 concluídas em 23/11/2026; ver `tasks_agendamento.md` e auditoria do Processo 7. |
| Visita domiciliar | Parcial | Ocorrência `Visit`, Agendamento, histórico, API e tela existentes; faltam permissões/ações operacionais próprias, timestamps e integração com Atendimento. |
| Segurança/infraestrutura | Riscos estáticos confirmados | CSRF, defaults de desenvolvimento/MinIO e caminho de persistência SQLite no Compose. |
| Qualidade/validação | A validar | Nenhum teste, build, lint, migração, API ou storage foi executado na auditoria. Testes frontend sem integração declarada. |

## Backlog

### Segurança

#### SEC-01 — Proteger mutações autenticadas por cookie contra CSRF

- **Descrição:** Integrar validação CSRF ao fluxo de JWT em cookie; definir emissão/renovação do token e política de origem para métodos inseguros, cobrindo login, refresh e logout conforme o desenho adotado.
- **Justificativa:** Sem a proteção, o navegador pode enviar cookies automaticamente em requisições cross-site. É o único achado de risco alto classificado P0 antes de exposição a usuários.
- **Prioridade:** P0.
- **Dependências:** Decidir/documentar política de origem e cookies; precede qualquer disponibilização externa.
- **Critérios de aceite:** Mutações sem token CSRF válido são rejeitadas; cliente autorizado obtém e envia o token corretamente; testes cobrem origens permitidas/negadas e ciclo de autenticação; comportamento documentado.
- **Módulos relacionados:** `accounts` (autenticação), `sistema_home_care/settings.py`, `frontend/sistema-home-care/src/lib/api.ts`.
- **Evidências:** AT-01, AT-06; `03_AUDITORIA_TECNICA.md` §Alto/Melhoria AT-15.

#### SEC-02 — Definir configuração segura por ambiente e segredos

- **Descrição:** Separar desenvolvimento e implantação; carregar `DEBUG`, hosts, origens e atributos seguros de cookie de configuração explícita; substituir credenciais padrão do MinIO e validar variáveis obrigatórias. Definir servidor apropriado ao ambiente implantado.
- **Justificativa:** `DEBUG=True`, hosts/origens fixos, `runserver` e credenciais padrão estão no caminho de implantação Compose. O risco depende de exposição, mas são bloqueadores para publicação segura, não falhas críticas de runtime já observadas.
- **Prioridade:** P1.
- **Dependências:** Definir ambientes de execução e origens/domínios alvo; SEC-01 para exposição autenticada.
- **Critérios de aceite:** Configuração de produção falha de forma clara se segredos/configuração exigidos faltarem; debug desligado e credenciais não padrão; hosts/origens explícitos; cookies seguros quando HTTPS; desenvolvimento local continua documentado.
- **Módulos relacionados:** `settings.py`, `docker-compose.yml`, `.env.docker.example`, Dockerfiles.
- **Evidências:** AT-02, AT-05, AT-13, AT-14.

#### SEC-03 — Formalizar autorização e invariantes entre grupos e permissões

- **Descrição:** Resolver divergências de autorização já identificadas, incluindo `pacientes.update_manager`, menus/rotas condicionados a permissões e alinhamento entre grupos legados e permissões granulares; manter API como autoridade.
- **Justificativa:** Há operações com regra por grupo apesar de permissão granular existente e navegação visível para perfis que recebem 403. A matriz é essencial para um MVP multi-perfil.
- **Prioridade:** P1.
- **Dependências:** Decisões D3 do Cadastro, DA-1/DA-6 da Avaliação, DN-2 de Necessidades e D-AGE-9/D-VIS-4 para processos novos.
- **Critérios de aceite:** Matriz aprovada por ação; endpoints negam ações não autorizadas; menus e rotas refletem permissões; cobertura de permissões para perfis permitidos e negados.
- **Módulos relacionados:** `accounts/permissions.py`, seeds de permissões, `patients`, `assessments`, `AppLayout.tsx`, guards de rotas.
- **Evidências:** P3/P6 (Processo 1), PA-*, PN-*, P-USU-*, D-AGE-9, D-VIS-4; AT-07 (limite de apresentação).

### Infraestrutura e banco de dados

#### INF-01 — Corrigir e validar persistência de dados no Compose

- **Descrição:** Fazer o volume nomeado persistir exatamente o arquivo SQLite configurado, ou decidir e preparar outro banco; validar ciclo de recriação em ambiente descartável.
- **Justificativa:** O destino montado e o arquivo SQLite divergem; recriar o container pode perder dados. Para o fluxo Compose documentado, persistência é necessária ao MVP.
- **Prioridade:** P1.
- **Dependências:** Antes de operações com dados que precisem sobreviver à recriação; se migrar banco, decisão operacional e plano de migração.
- **Critérios de aceite:** Banco fica no caminho persistido; registro sintético sobrevive à recriação conforme esperado; instruções de backup/restore e migração documentadas; sem uso de dados reais no teste de ciclo.
- **Módulos relacionados:** `docker-compose.yml`, `settings.py`, documentação de execução.
- **Evidências:** AT-03, AT-10, AT-16.

#### INF-02 — Definir estratégia de banco e verificar schema/migrations

- **Descrição:** Decidir banco suportado para MVP e produção; verificar migrations versus models e constraints/índices no ambiente alvo; definir política de backup e integridade.
- **Justificativa:** SQLite é o único configurado; drift não foi confirmado, e concorrência/implantação multi-instância não foram avaliadas. Evita assumir capacidade operacional sem evidência.
- **Prioridade:** P1 para validar o SQLite no modo de implantação escolhido; migração para banco de serviço pode ser P2 se implantação multi-instância não fizer parte do MVP.
- **Dependências:** INF-01; decisão de implantação/concorrência.
- **Critérios de aceite:** Banco alvo e limitações documentados; verificação de migrations limpa; constraints essenciais mapeadas e verificadas; procedimento de backup/restore validado.
- **Módulos relacionados:** `backend/*/migrations`, `settings.py`, Compose.
- **Evidências:** AT-09, AT-10, AT-20.

#### INF-03 — Decidir uso do MinIO e completar ou retirar integração declarativa

- **Descrição:** Confirmar se uploads/downloads entram no MVP. Se sim, provisionar bucket de modo idempotente, usar configuração `STORAGES`, política privada e validar autorização; se não, remover dependências/configuração inertes em tarefa posterior.
- **Justificativa:** Storage está configurado, mas não existe fluxo de arquivo de domínio e o bucket é manual. Não é bloqueador enquanto nenhum processo exigir arquivos.
- **Prioridade:** P2; elevar a P1 apenas se um requisito do MVP depender de arquivo.
- **Dependências:** Decisão de escopo de arquivos e ambiente.
- **Critérios de aceite:** Decisão registrada; no caminho de uso, upload/download autorizado funciona com bucket provisionado automaticamente e erros cobertos; no caminho sem uso, configuração não é apresentada como capacidade pronta.
- **Módulos relacionados:** `settings.py`, `docker-compose.yml`, `requirements.txt`, futuros campos/serviços de arquivo.
- **Evidências:** AT-04, AT-17.

### Processo e decisões de negócio

#### DOM-01 — Resolver decisões de domínio que bloqueiam consistência dos fluxos existentes

- **Descrição:** Aprovar e registrar decisões do Cadastro, Avaliação, Necessidades, Plano e Escala: obrigatoriedade de equipe/status/sexo; escopo de atualização de responsáveis e recursos; administração e exclusão de tipos/necessidades; obrigação e bordas de plano; elegibilidade de plano/escala, frequência e disponibilidade.
- **Justificativa:** Implementar antes da decisão consolidaria comportamento contraditório ou anteciparia regras que a auditoria deliberadamente não inferiu.
- **Prioridade:** P1.
- **Dependências:** Decisões de negócio pelos responsáveis do produto; consolidar conflitos entre docs originais e código.
- **Critérios de aceite:** Cada decisão D1–D4, DA-1…6, DN-1…5, DPC-1…7 e D-ESC-1…7 tem resultado, responsável e fonte atualizada; itens fora do MVP ficam explicitamente adiados.
- **Módulos relacionados:** `docs/regras-de-negocio`, `docs/requisitos-do-sistema`, `docs/Processos e Modelo de Dados.md`; `patients`, `assessments`, `care_plans`, `care_scales`.
- **Evidências:** relatórios `02_01`…`02_05`, seções 9; `04_AUDITORIA_REGRAS_E_REQUISITOS.md` §§Consistência.

#### DOM-02 — Definir modelo de Profissional/Equipe e invariantes de Usuários

- **Descrição:** Definir cadastro oficial de profissionais/equipes e relações com usuário, profissão e categoria; incluir regras de rename/transferência, profissionais livres e inativação; garantir invariantes para criação via API/admin/manager. Atualizar Cadastro, Avaliação, Plano e Escala conforme decisão.
- **Justificativa:** `Professional` é stub, `responsible_team` é JSON e várias seleções dependem de profissionais consistentes; mudanças futuras de FK podem exigir migração.
- **Prioridade:** P1 para o escopo clínico que exige equipe/profissional real; modelagem deve preceder alteração de banco e formulários dependentes.
- **Dependências:** Decisões D-USU-2/D-USU-3 e pendências de equipe do Cadastro; decidir se entra no MVP.
- **Critérios de aceite:** Modelo e fonte de verdade documentados; migração de dados/campos planejada; relações profissão-categoria e usuário-profissional têm invariantes coerentes; fluxos de criar, transferir, inativar e consultar cobertos.
- **Módulos relacionados:** `professionals`, `accounts`, `patients`, `assessments`, `care_plans`, `care_scales`.
- **Evidências:** P1/P8, PA-*, PC-*, P-ESC-*, P-USU-2/P-USU-5; D-USU-2.

#### DOM-03 — Definir ocorrência, Agendamento, Visita e Registro do Atendimento (concluído)

- **Descrição:** Resolver identidade da ocorrência (`Visit` versus Agendamento separado), limites entre Agendamento/Visita/Atendimento/Evolução, estados/transições, endereço histórico, recorrência, conflitos, duração, elegibilidade por plano/escala, exclusão, autorização e dados necessários para concluir visita.
- **Justificativa:** São decisões estruturais e relacionais compartilhadas; construir Agendamento e Visita sem contrato comum arrisca schema incompatível e perda de histórico. Registro do Atendimento é pré-requisito declarado da conclusão da Visita.
- **Prioridade:** P1 para iniciar Agendamento/Visita no MVP; a implementação depende de resolução documental primeiro.
- **Dependências:** Decisões D-AGE-1…9 e D-VIS-1…7; definição do processo de Atendimento; participação de responsáveis de domínio.
- **Critérios de aceite:** Documento-mãe e RN/RF concordam sobre entidade/ownership; estados e atores têm transições explícitas; decisões temporais, endereço, exclusão e permissões estão registradas; Registro do Atendimento tem escopo e critério de conclusão definidos.
- **Módulos relacionados:** `docs/Processos e Modelo de Dados.md`, docs de Agendamento/Visita e novo doc de Atendimento; `care_scales`, futuros `scheduling`, `visits`, `care_records`.
- **Evidências:** P-AGE-2…6, D-AGE-1…9, P-VIS-2…5, D-VIS-1…7; RF-VIS §11; `04_AUDITORIA_REGRAS_E_REQUISITOS.md` §Consistência.

**Concluído em 23/11/2026.** Decididos: `Visit` é a própria ocorrência; os estados/atores e permissões granulares estão especificados; endereço é snapshot; CarePlanNeed é o vínculo do item do Plano; Atendimento mínimo exige descrição dos cuidados/procedimentos realizados e observações adicionais opcionais.

#### DOM-04 — Atualizar documentação de domínio e rastreabilidade (concluído)

- **Descrição:** Atualizar doc-mãe para refletir processos existentes, entidade Profissional/Usuários, limites de Escala, Necessidades e Plano, e contratos de Agendamento/Visita; normalizar referências estáveis para fontes sem IDs ou seção/título citados.
- **Justificativa:** Doc-mãe está desatualizado em partes e fontes sem IDs tornam duplicidade, cobertura e aceite difíceis de acompanhar.
- **Prioridade:** P1 para decisões e novos fluxos; depois, normalização de IDs pode ser P2.
- **Dependências:** DOM-01 a DOM-03; decisões aprovadas antes de reescrever regra.
- **Critérios de aceite:** Fontes de verdade e precedência estão claras; doc-mãe e documentos específicos não se contradizem; backlog aponta IDs formais ou seção/título estável.
- **Módulos relacionados:** `docs/Processos e Modelo de Dados.md`, `docs/regras-de-negocio`, `docs/requisitos-do-sistema`, `docs/tasks`.
- **Evidências:** P-AGE-4/5/6, P-VIS-2, P-USU-7, PC-8, P-ESC-2/3, AT-08.

**Concluído em 23/11/2026** para Agendamento, Visita e Atendimento. Ver doc-mãe, regras/requisitos/tarefas de Visita e Atendimento e auditoria do Processo 8.

### Backend, frontend e persistência funcional

#### APP-01 — Fechar divergências do Cadastro de Paciente

- **Descrição:** Após DOM-01/DOM-02, alinhar obrigatórios/status/sexo, validar regra de equipe/condição/região, aplicar autorização granular de troca de médico/equipe, tratar idade/CPF conforme decisão e exibir nomes de referências em detalhe.
- **Justificativa:** Cadastro é pré-requisito dos fluxos clínicos e tem divergência documental e incompletude visível.
- **Prioridade:** P1.
- **Dependências:** DOM-01 e, para equipe real, DOM-02; SEC-03 para matriz de permissão.
- **Critérios de aceite:** API e UI têm obrigatórios idênticos ao requisito aprovado; regra de equipe e autorização verificada no backend; detalhe mostra nomes; filtros e status continuam coerentes; testes de API e formulário cobrem os cenários aprovados.
- **Módulos relacionados:** `patients/{models,serializers,views}.py`, `PatientForm.tsx`, `PatientDetail.tsx`, `PatientsList.tsx`, `accounts/permissions.py`.
- **Evidências:** RN-CAD-PAC-002/005/007/009, P1–P6/P9/P11, D1–D4; `04_AUDITORIA_REGRAS_E_REQUISITOS.md` §Cadastro.

#### APP-02 — Completar ações de Avaliação e administração de Necessidades

- **Descrição:** Corrigir a ação de troca de responsável pelo gerente; corrigir cliente/rota de Tipos; implementar operações CRUD apenas conforme decisão de DOM-01 e perfil aprovado; definir tratamento de exclusão/inativação de necessidades protegidas e apresentação uniforme dos erros.
- **Justificativa:** A ação de gerente diverge entre API e UI; a página de tipos é inoperante; exclusão vinculada resulta em erro não tratado.
- **Prioridade:** P1 para ação de avaliação e integridade de necessidade; CRUD de tipos condicionado ao escopo decidido.
- **Dependências:** DOM-01 (DA/DN); SEC-03; preservar relação com Avaliação e Plano.
- **Critérios de aceite:** Gerente consegue executar apenas a troca autorizada; rota e API de tipos correspondem; operações respeitam perfil e unicidade; exclusão protegida retorna resposta de domínio sem 500 e UI explica/bloqueia conforme regra; histórico segue política aprovada.
- **Módulos relacionados:** `assessments/views.py`, `patients/views.py`, `NeedTypes.tsx`, `AssessmentDetail.tsx`, `NeedEditForm.tsx`, `lib/assessments.ts`.
- **Evidências:** PA-2/PA-5/PA-13, DA-1…6, PN-1…5, DN-1…5; RF-AVL-006, RF-NEC-013.

#### APP-03 — Completar regras de Plano e Escala e interface associada

- **Descrição:** Implementar decisões aprovadas sobre obrigatoriedade/ativação, remoção da última necessidade, datas, plano encerrado e profissional inativo; exibir criação/atualização do plano; alinhar escala às regras de plano, exclusão, frequência, disponibilidade e permissões; conectar bloqueio de escala ao Agendamento quando o consumidor existir.
- **Justificativa:** Há lacunas de regra e UI em processos já conectados; bloqueio de agendamento da Escala não pode ser declarado efetivo sem consumidor.
- **Prioridade:** P1 para regras que afetem integridade e aceite do plano/escala; integração agendamento depende de APP-05.
- **Dependências:** DOM-01/DOM-02; APP-05 para consumidor de `scheduling_requirement`.
- **Critérios de aceite:** Casos aprovados são validados no serviço/API e mostrados na UI; histórico e status coerentes; fronteira Plano→Escala não permite estados inválidos conforme decisão; contrato de escala é exercitado por Agendamento.
- **Módulos relacionados:** `care_plans/{models,services,views}.py`, `CarePlanDetail.tsx`, `care_scales/{services,contracts}.py`, telas de escala.
- **Evidências:** RN-PLC §3.1/§4.1, RF05, DPC-1…7, D-ESC-1…7, RN-ESC-25/RF-ESC-22; PC-*/P-ESC-*.

#### APP-04 — Corrigir fluxos e consistência de Usuários/Profissões

- **Descrição:** Tratar exclusão física com dependências protegidas, implementar edição de profissão na UI ou remover expectativa conforme decisão, corrigir invariantes dos caminhos admin/API e garantir respostas de domínio; completar a trilha conforme escopo aprovado.
- **Justificativa:** Exclusão protegida pode gerar 500; UI não expõe edição disponível na API; invariantes do banco não cobrem todos os caminhos.
- **Prioridade:** P1 para erros 500/integridade; auditoria detalhada P2 conforme escopo.
- **Dependências:** decisões D-USU-1/2/4/5 consolidadas; SEC-03 para permissões.
- **Critérios de aceite:** Tentativas de excluir entidade protegida têm comportamento documentado e status HTTP apropriado; UI e API oferecem operações concordantes; caminhos suportados preservam invariantes; cobertura para relações vinculadas e desvinculadas.
- **Módulos relacionados:** `accounts/{models,services,views_users}.py`, `professionals/models.py`, `Professions.tsx`, telas de usuário.
- **Evidências:** P-USU-1…3/P-USU-5/P-USU-8, D-USU-1/2/5.

**Execução de Usuários acordada em etapas:** (1) integridade 1:1 profissão/categoria e rename transacional; (2) exclusão protegida e invariantes manager/admin/API para usuário/profissional; (3) edição de profissão na UI; (4) recuperação de senha com SMTP configurável; (5) documentação e validação integrada. Cada etapa de código deve ter testes próprios e aguardar autorização do usuário antes da seguinte.

#### APP-05 — Implementar Agendamento como processo do MVP

- **Descrição:** Após DOM-03/DOM-04, modelar ocorrências e histórico, consumir contrato da Escala, relacionar paciente/endereço/plano/item/escala/profissional, validar disponibilidade e conflitos, suportar criação individual/série, edição, status e autorização; entregar API e UI conectadas.
- **Justificativa:** Processo não iniciado e necessário para operacionalizar visitas; contrato atual da Escala não substitui agendamento.
- **Prioridade:** P1 se visita domiciliar operacional integra o MVP; caso contrário, reclassificar o processo como fase seguinte por decisão de produto.
- **Dependências:** DOM-02, DOM-03, DOM-04, INF-02 e SEC-03; tarefas de banco antes de API; serviços/API antes de UI.
- **Critérios de aceite:** Fluxo documentado cobre RN-AGE-01…38/RF-AGE-01…36 aprovados; ocorrências são persistidas com relações/histórico; conflitos/recorrência e estados aplicados; autorização no backend; integração testa bloqueio de escala não ativa; lista, detalhe, filtros e ações funcionam.
- **Módulos relacionados:** futuro app `scheduling`/`appointments`, migrations, serializers/views/services/permissions, `src/lib`, páginas e rotas.
- **Evidências:** Processo 7 P-AGE-1…7, D-AGE-1…9.

**Status atualizado:** concluído nas cinco etapas de `docs/tasks/tasks_agendamento.md`; o código usa app `visits` e entidade `Visit`.

#### APP-06 — Definir e implementar Registro do Atendimento

- **Descrição:** Especificar entidade, dados clínicos, autoria, vínculo à visita e condição de preenchimento; implementar persistência/API/UI com autorização e histórico conforme fonte aprovada.
- **Justificativa:** Visita realizada não pode ser finalizada sem registro, segundo RN-VIS-20/RF-VIS-13…15; módulo não existe e foi excluído das auditorias funcionais presentes.
- **Prioridade:** P1 como dependência da finalização de Visita; escopo clínico deve ser aprovado separadamente.
- **Dependências:** DOM-03/DOM-04; APP-05 e SEC-03.
- **Critérios de aceite:** Documento define conteúdo e estados; registro associa-se à ocorrência correta, preserva autoria e histórico; acesso é restrito; Visita só finaliza quando o critério aprovado for atendido.
- **Módulos relacionados:** futuro app `care_records`/`attendances`, app de visitas, migrations, API e UI.
- **Evidências:** P-VIS-4, D-VIS-2/D-VIS-7, RN-VIS-20, RF-VIS-13…15.

**Decisão/execução:** escopo mínimo consolidado e autorizado em 23/11/2026. Implementar conforme `docs/tasks/tasks_atendimento.md`, antes de concluir APP-07.

#### APP-07 — Implementar Visita domiciliar

- **Descrição:** Após definição da identidade compartilhada com Agendamento, criar fluxo de confirmação/início/finalização/cancelamento/não realização, dados operacionais e histórico, integração com escala/plano/paciente/endereço e Registro do Atendimento.
- **Justificativa:** Processo totalmente ausente; depende de ocorrência agendada e atendimento.
- **Prioridade:** P1 apenas se operação de visitas estiver no MVP; deve seguir APP-05 e APP-06.
- **Dependências:** APP-05, APP-06, DOM-03/DOM-04, SEC-03.
- **Critérios de aceite:** RN-VIS-01…40/RF-VIS-01…35 aprovados têm cobertura; transições e atores validados; visita preserva snapshot/referência histórica definida; registro de atendimento requerido antes de finalização; API/UI integradas.
- **Módulos relacionados:** futuro app `visits` ou entidade definida em DOM-03, API, migrations, rotas e telas.
- **Evidências:** Processo 8 P-VIS-1…6, D-VIS-1…7.

**Status atualizado:** parcialmente atendido por APP-05. Completar conforme `docs/tasks/tasks_visita_domiciliar.md` após APP-06.

### Testes e validação

#### QA-01 — Executar e registrar validação dos fluxos existentes

- **Descrição:** Em ambiente controlado, executar os testes backend existentes, verificações de migrations, lint/build frontend e validar fluxos de Cadastro, Avaliação, Necessidades, Plano, Escala e Usuários; resolver falhas encontradas por tasks ligadas.
- **Justificativa:** A auditoria não executou nada; existência de arquivos de teste não demonstra funcionamento. Esta validação fecha o estado A VALIDAR antes de ampliar escopo.
- **Prioridade:** P1.
- **Dependências:** SEC-01 e INF-01 para ambiente seguro/persistente; fixtures/dados descartáveis; correções necessárias podem voltar às tasks APP-*.
- **Critérios de aceite:** Comandos suportados documentados; resultados e ambiente registrados; migrations consistentes; fluxos críticos e permissões aprovados; nenhuma evidência de teste marcada concluída sem execução.
- **Módulos relacionados:** `backend/*/tests*.py`, `frontend/sistema-home-care/tests`, `package.json`, CI.
- **Evidências:** AT-08/AT-09, P7/P10, PA-6, PN-*, PC-*, P-ESC-*, P-USU-6; `01_INVENTARIO.md` §9.

#### QA-02 — Formalizar testes frontend e integração contínua

- **Descrição:** Declarar ferramenta, dependências e scripts frontend existentes (incluindo Playwright quando aplicável), tornar configurações de browser portáveis e integrar testes/checks ao CI; ampliar cobertura de telas sem cobertura confirmada.
- **Justificativa:** Testes frontend encontrados não têm execução claramente declarada e não há pipeline CI identificado; avaliação e necessidades não têm testes frontend identificados.
- **Prioridade:** P1 para testes de fluxos MVP; infraestrutura de CI pode ser faseada, mas deve preceder conclusão de qualidade.
- **Dependências:** QA-01 e definição do ambiente CI.
- **Critérios de aceite:** `package.json` declara scripts/dependências reproduzíveis; pipeline executa validações; testes cobrem fluxos e permissões prioritários sem depender de caminho local fixo.
- **Módulos relacionados:** `frontend/sistema-home-care/package.json`, `tests/`, configuração CI.
- **Evidências:** AT-08/AT-19, P7, PA-6, PN-*, P-ESC-9/10, P-AGE-7, P-VIS-6.

### Documentação e operação

#### DOC-01 — Atualizar estado das tasks existentes e registrar decisões

- **Descrição:** Revisar documentos de tasks de processo contra código e backlog; registrar estado com evidência, sem tratar marcação antiga como prova; documentar decisões aprovadas e escopo adiado.
- **Justificativa:** `tasks_escala.md` tem itens desmarcados apesar de implementação; tasks do Plano não têm estado; Agendamento/Visita têm tarefas ainda pendentes; status atual está distribuído.
- **Prioridade:** P2.
- **Dependências:** DOM-01…04 e resultados de QA-01.
- **Critérios de aceite:** Tasks existentes distinguem implementado, parcial, pendente e validado; referências ao backlog consolidado; nenhuma conclusão afirmada sem evidência.
- **Módulos relacionados:** `docs/tasks/*`, `docs/auditoria/`.
- **Evidências:** relatórios individuais `02_01`…`02_08`, §§3.3/11; `04_AUDITORIA_REGRAS_E_REQUISITOS.md` §Consistência.

#### FUT-01 — Recuperação de senha e políticas avançadas de conta

- **Descrição:** Definir e implementar recuperação por e-mail/SMTP e políticas de expiração/MFA se aprovadas.
- **Justificativa:** Recuperação foi explicitamente adiada e políticas não estão definidas; não bloqueia o MVP atual conforme `AGENTS.md`.
- **Prioridade:** P3 (reavaliar para P2 conforme requisito operacional).
- **Dependências:** Decisão D-USU-4/D-USU-5; serviço de e-mail.
- **Critérios de aceite:** Fluxo e políticas aprovados; tokens de recuperação expiram e não revelam existência de conta; envio e auditoria testados.
- **Módulos relacionados:** `accounts`, configuração SMTP e telas de autenticação.
- **Evidências:** P-USU-4, D-USU-4/D-USU-5; `AGENTS.md` §Users.

#### FUT-02 — Melhorias de arquitetura e experiência não bloqueantes

- **Descrição:** Padronizar tratamento global de erros, revisar apresentação de formulários e decompor módulos/páginas conforme repetição observada; avaliar mudança para banco de produção quando houver necessidade multi-instância.
- **Justificativa:** São débitos de manutenção e operação futura, não impedimentos comprovados para o MVP local.
- **Prioridade:** P2–P3 conforme decisão de implantação.
- **Dependências:** QA-01 e evidência de necessidade; INF-02 para migração de banco.
- **Critérios de aceite:** Mudanças justificadas por repetição/necessidade observada; erros DRF de campo preservam contexto; migração de banco só ocorre com plano e validação.
- **Módulos relacionados:** `src/lib/api.ts`, páginas React, apps Django e infraestrutura.
- **Evidências:** AT-07/AT-10/AT-11/AT-12/AT-18.

## Dependências principais

```text
SEC-01 ──> exposição segura da API
SEC-02 + INF-01 ──> ambiente Compose confiável
DOM-01 ──> APP-01, APP-02, APP-03
DOM-02 ──> APP-01, APP-04, APP-05
DOM-03 + DOM-04 ──> APP-06 ──> APP-07 (APP-05 concluído)
INF-02 ──> novas migrations/processos
SEC-03 ──> operações existentes e novos processos
QA-01 ──> QA-02/DOC-01 e aceite das funcionalidades
```

Dependências de UI/API: concluir contrato e validação no backend antes de fechar integração da tela. Dependências de banco: decisões de entidade e relações precedem migrations; planejar migração de dados para campos provisórios. Dependências externas: MinIO só entra na sequência se uploads forem aprovados para MVP.

## Evidências consolidadas

- `00_AUDITORIA_MEMORIA.md`: histórico, decisões anteriores, limites e status de validação.
- `01_INVENTARIO.md`: módulos, telas, endpoints, banco, infraestrutura e testes encontrados.
- `02_AUDITORIA_PROCESSOS.md` é o índice; relatórios `02_01`…`02_08` contêm evidências detalhadas, RN/RF, problemas P*, decisões D* e tasks sugeridas.
- `03_AUDITORIA_TECNICA.md`: achados AT-01…20 e validações técnicas pendentes.
- `04_AUDITORIA_REGRAS_E_REQUISITOS.md`: mapeamento por RN/RF e divergências transversais.

Nenhuma task acima foi implementada ou validada nesta etapa. A classificação pode mudar após decisões de escopo do MVP e execução em ambiente controlado.
