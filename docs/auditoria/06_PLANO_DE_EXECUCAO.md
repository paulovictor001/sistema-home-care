# 06 — Plano de execução recomendado

Plano derivado do `05_BACKLOG_GERAL.md` e dos relatórios de auditoria, atualizado em 23/11/2026 após consolidação das decisões de Usuários, Agendamento, Visita e Atendimento. A sequência respeita dependências de segurança, domínio, persistência, backend/API, frontend e validação.

## 1. Correções necessárias

### 1.1 Segurança antes de disponibilizar o sistema

1. **SEC-01 — CSRF para autenticação por cookie (P0).** Definir token/origem, integrar Django e cliente React e cobrir mutações. É a única prioridade P0 porque a ausência de proteção está comprovada e permite tentativa de ações autenticadas via navegador; precisa ser fechada antes de exposição externa.
2. **SEC-02 — Configuração por ambiente (P1).** Retirar defaults inseguros de implantação: `DEBUG`, hosts/origens, cookies seguros e credenciais padrão do MinIO. Não há achado crítico confirmado; trata-se de pré-condição para publicar com segurança.
3. **INF-01 — Persistência Compose (P1).** Corrigir o volume que não contém o arquivo SQLite efetivo e validar o ciclo de vida usando dados sintéticos.

### 1.2 Decisões e correções de integridade

4. **DOM-01 — Resolver regras dos cinco processos existentes.** Aprovar as decisões D1–D4, DA-1…6, DN-1…5, DPC-1…7 e D-ESC-1…7 antes de alterar comportamento. As decisões D-USU-1…5 foram consolidadas em 23/11/2026; implementar Usuários conforme seção 2.1.
5. **DOM-02 — Definir Profissional/Equipe e invariantes.** Confirmar modelo e relações antes de substituir JSON ou mudar chaves estrangeiras; planejar migração dos dados provisórios.
6. **SEC-03 — Matriz de autorização.** Tornar API, guardas e menus coerentes com decisões aprovadas; executar validações por perfil.
7. **INF-02 — Escolher banco do ambiente alvo e verificar migrations/schema.** Confirmar estado atual antes de qualquer release ou migração.

## 2. Finalização de funcionalidades existentes

Sequência após decisões aplicáveis:

1. **APP-01 — Cadastro de Paciente:** alinhar obrigatórios, equipe/condição/região e autorização; completar apresentação de nomes e validações do formulário.
2. **APP-02 — Avaliação e Necessidades:** habilitar a ação de gerente na avaliação, corrigir a integração da tela de tipos e concluir o tratamento de operações protegidas. CRUD de tipos só entra se o escopo aprovado assim determinar.
3. **APP-03 — Plano e Escala:** aplicar regras decididas de obrigatoriedade, estados, profissionais e casos de borda; exibir timestamps do Plano; manter RN-ESC-25/RF-ESC-22 como parciais até existir consumidor funcional.
4. **APP-04 — Usuários/Profissões:** implementar as cinco etapas da seção 2.1, com testes por etapa e pausa para autorização do usuário entre etapas.
5. **QA-01 — Validação dos seis processos existentes:** executar testes backend, lint/build e verificações de migrations em ambiente controlado. Registrar comandos, resultado e limitações. A auditoria não executou essas verificações; não assumir que os testes encontrados estão verdes.

### 2.1 APP-04 — Etapas de Usuários consolidadas em 23/11/2026

1. **Integridade profissão/categoria:** relação formal 1:1, migração segura dos dados, rename conjunto e transacional via API/admin. Rejeitar migração se houver conflito de nomes ou relação ambígua; preservar permissões da categoria.
2. **Exclusão e invariantes:** responder com erro de domínio explicativo quando `ProtectedError` bloquear exclusão; garantir profissional obrigatório em manager/admin/API e preservar profissionais livres sem usuário.
3. **Edição na interface:** permitir renomear profissão usando a operação atômica da etapa 1.
4. **Recuperação de senha:** fluxo por e-mail com SMTP configurável por ambiente; tokens seguros de uso único e expiração, sem credenciais no repositório. Testar envio com backend em memória; validar entrega real apenas quando houver SMTP configurado.
5. **Fechamento documental e validação:** atualizar requisitos/tasks e registrar execução. Auditoria continua mínima, sem tela de histórico.

Cada etapa de código precisa de testes próprios. Ao terminar e reportar uma etapa, aguardar autorização do usuário antes de iniciar a próxima.

## 3. Desenvolvimento de funcionalidades operacionais

Decisões de Agendamento, identidade `Visit`, fronteiras, atores, permissões, modelo e critério mínimo do Atendimento foram consolidados em 23/11/2026. Agendamento (APP-05) já foi implementado e testado nas cinco etapas descritas em `docs/tasks/tasks_agendamento.md`.

Sequência restante, com pausa e autorização entre cada etapa:

1. **APP-06 — Registro do Atendimento:** modelo/histórico e permissões; serviços/API; interface; regressão. O conteúdo mínimo obrigatório é descrição dos cuidados/procedimentos realizados, com observações adicionais opcionais.
2. **APP-07 — Visita domiciliar:** completar campos operacionais e permissões próprias; integrar conclusão somente após Atendimento; expor ações e histórico na interface; regressão completa.
3. **QA-01/QA-02:** testar Plano→Escala→Agendamento/Visit→Atendimento→Visita realizada, autorização, estados, persistência, migrations, build e lint.

Os planos testáveis estão em `docs/tasks/tasks_atendimento.md` e `docs/tasks/tasks_visita_domiciliar.md`. Cada etapa deve ser reportada como concluída e aguardar autorização do usuário antes de iniciar a próxima.

## 4. Testes e validação

1. Preparar ambiente com configuração segura e banco persistente; usar dados sintéticos.
2. Executar a suíte backend encontrada e registrar falhas por processo; não tratar quantidade de métodos como cobertura suficiente.
3. Rodar `makemigrations --check`/verificação de migrations, checks Django, lint e build frontend.
4. Declarar scripts/dependências frontend e integração CI em **QA-02**; tornar Playwright/browser independente de caminho local fixo.
5. Cobrir lacunas de frontend identificadas, especialmente Cadastro, Avaliação e Necessidades; expandir cobertura de autorização e falhas de API.
6. Exercitar integração Django↔MinIO somente se arquivos entrarem no escopo aprovado; healthcheck do serviço não comprova upload, download ou existência do bucket.
7. Confirmar persistência de dados no Compose após recriação e documentar backup/restore.

Critérios para encerrar a validação: resultados reproduzíveis registrados; migrations coerentes; fluxos críticos e permissões validados; erros de execução tratados ou aceitos com risco explícito; status A VALIDAR removido apenas para o que foi executado.

## 5. Melhorias futuras

- **DOC-01:** normalizar estados de tasks antigas e manter evidências rastreáveis.
- **INF-03:** completar ou retirar MinIO conforme decisão de uso de arquivos.
- **FUT-01:** MFA, expiração de sessão e políticas adicionais de senha permanecem para decisão futura. Recuperação de senha passou a integrar o MVP por decisão de 23/11/2026 (APP-04 etapa 4).
- **FUT-02:** tratamento global de erros, refatoração de páginas/apps motivada por repetição e eventual migração de banco para concorrência/produção.
- Regras e requisitos de Usuários sem IDs formais serão referenciados por seção/tópico; não será criada nova convenção de identificadores nesta execução.

## Marcos e critérios de passagem

| Marco | Saída necessária | Não iniciar antes de |
|---|---|---|
| M1 — Base segura e persistente | CSRF especificado/implementado, configuração por ambiente e persistência validada | Publicação ou uso com dados operacionais |
| M2 — Decisões dos processos existentes | Decisões registradas para Cadastro, Avaliação, Necessidades, Plano, Escala e Usuários | Alterações de comportamento dependentes dessas decisões |
| M3 — Processos existentes finalizados | APP-01…04 aceitos e QA-01 registrado | Declarar os seis processos prontos para MVP |
| M4 — Contrato operacional | Agendamento/Visita/Atendimento modelados e documentados de forma coerente | Concluído em 23/11/2026 |
| M5 — Fluxo operacional novo | APP-05…07 conectados e integrados | APP-05 concluído; APP-06 e APP-07 pendentes |
| M6 — Validação e manutenção | QA-01/02 e DOC-01 completos | Fechar status A VALIDAR e publicar versão |

## Limitações

Este plano combina auditoria estática com as evidências de execução registradas por etapa nos documentos de Agendamento e nos próximos planos. Resultados anteriores não substituem os testes das novas etapas de Atendimento e Visita.
