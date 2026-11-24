# Contexto e continuidade da auditoria

Fonte de retomada das etapas da auditoria do sistema Home Care. Atualizado em 21/11/2026.

## Estado atual

| Etapa | Entregável | Estado |
|---|---|---|
| 1. Inventário | `01_INVENTARIO.md` | Concluída |
| 2. Auditoria dos processos | `02_AUDITORIA_PROCESSOS.md` + `02_01`…`02_08` | Concluída — oito auditorias em arquivos separados |
| 3. Auditoria técnica | `03_AUDITORIA_TECNICA.md` | Concluída |
| 4. Regras e requisitos | `04_AUDITORIA_REGRAS_E_REQUISITOS.md` | Concluída |
| 5. Consolidação e backlog geral | `05_BACKLOG_GERAL.md` | **Consolidada** (21/11/2026) |
| 6. Plano de execução | `06_PLANO_DE_EXECUCAO.md` | **Concluído** (21/11/2026) |

## Resumo da etapa 4

Criado `04_AUDITORIA_REGRAS_E_REQUISITOS.md`, cruzando documentos originais de regras, requisitos e tasks com inventário e auditorias anteriores, código Django/React e arquivos de testes encontrados. Não houve alteração dos documentos originais nem execução de testes/builds/servidores.

- Cadastro do paciente, Avaliação Inicial, Necessidades Identificadas, Plano de Cuidados, Escala e Usuários têm implementação parcial em graus distintos.
- Agendamento e Visita Domiciliar não têm implementação de processo. O contrato preparatório de Agendamento na Escala não é um fluxo funcional.
- Lacunas principais: regra de obrigatórios no Cadastro, equipe/problemas de saúde provisórios, mudança de responsável da avaliação sem UI, administração de tipos de necessidade quebrada, bordas do Plano, bloqueio de agendamento da Escala sem consumidor, recuperação de senha e entidade profissional incompleta.
- Conflito de documentação: RF-VIS §11 assume `visits` definida em Agendamento, sem entidade no doc-mãe ou código. Registro do Atendimento também não está definido/implementado.
- Tarefas concluídas não foram tratadas como evidência suficiente. Testes encontrados não foram executados; toda conclusão de runtime permanece A VALIDAR.
- Regras sem IDs formais em Necessidades, Plano e Usuários reduzem rastreabilidade. Ver matrizes e divergências no relatório etapa 4.

## Evidências e limites

Consultar `02_AUDITORIA_PROCESSOS.md` como índice e os arquivos `02_01`…`02_08` para evidência e decisões P*/D*; `03_AUDITORIA_TECNICA.md` para configuração e riscos técnicos; `04_AUDITORIA_REGRAS_E_REQUISITOS.md` para o cruzamento por regra/requisito, telas, endpoints, permissões e testes. Documentos-fonte preservados em `../regras-de-negocio/`, `../requisitos-do-sistema/` e `../tasks/`.

Auditoria estática em 21/11/2026. Não foram executados testes, builds, comandos de validação, chamadas HTTP ou operações de banco/storage. Não foram abertos arquivos de credenciais nem banco de dados.

## Consolidação e plano (etapa 5)

Criados `05_BACKLOG_GERAL.md` e `06_PLANO_DE_EXECUCAO.md` em 21/11/2026. Os achados dos relatórios 00–04 foram agrupados sem duplicar tarefas, preservando referências P*/D*/AT-* e IDs RN/RF quando existentes; regras sem IDs permanecem referenciadas por processo, seção e título nos relatórios de origem.

- Backlog classificado P0–P3 com justificativa; apenas CSRF em mutações autenticadas por cookie foi P0, como pré-condição à exposição. Não houve achado crítico confirmado pela auditoria estática.
- Dependências de segurança, banco/infraestrutura, decisões de domínio, backend/frontend e processos entre si estão explicitadas. As tasks Agendamento, Atendimento e Visita permanecem condicionadas à confirmação do escopo do MVP e às decisões de modelagem.
- Plano separa correções necessárias, finalização dos processos existentes, funcionalidades ausentes, validação e melhorias futuras.
- Nenhuma task foi implementada. Nenhum teste/build/check foi executado; estados que dependem de execução continuam A VALIDAR.

Auditoria consolidada. Próximo passo: revisão e aprovação do backlog/plano e das decisões de negócio pendentes antes de iniciar desenvolvimento. Não há matriz de rastreabilidade separada nesta etapa; as referências de evidência estão mantidas no backlog e nos relatórios 02–04.

## Organização dos relatórios de processo

Em 21/11/2026, o conteúdo de cada uma das oito auditorias foi separado em `02_01_CADASTRO_DO_PACIENTE.md` até `02_08_VISITA_DOMICILIAR.md`. `02_AUDITORIA_PROCESSOS.md` agora é o índice. Referências deste contexto e do backlog foram atualizadas; as referências históricas da memória apontam para os novos arquivos individuais.
