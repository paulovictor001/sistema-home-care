## Processo 6 — **Usuários** (auditado em 21/11/2026)

> Escopo: contas de acesso, categorias, profissões, catálogo e atribuição de permissões, e vínculo mínimo com o stub de Profissionais. Os documentos próprios não possuem identificadores formais; nesta seção, requisitos e regras são referenciados pelo número da seção/tópico do respectivo arquivo. A documentação vigente em `docs/auditoria/00_AUDITORIA_MEMORIA.md` é a fonte de continuidade; o solicitado `00_CONTEXTO_E_CONTINUIDADE.md` não existe.

### 1. Resumo do processo

Controla quem acessa o sistema e quais ações cada categoria pode realizar. O gerente cria contas com CPF, senha, e-mail, categoria e profissional; pode associar um profissional livre ou criar o stub no mesmo fluxo. Em seguida administra status e dados permitidos da conta, profissões e permissões da categoria. A autenticação é por CPF e senha, com JWT em cookies HttpOnly. A exclusão definitiva da conta pretende excluir o profissional vinculado.

**Fluxo documentado/codificado**: gerente autentica → cria profissão (que gera categoria sem permissões) ou seleciona profissional livre → cria usuário com categoria correspondente à profissão → usuário autentica por CPF/senha → gerente consulta/edita/inativa/reativa ou exclui usuário; gerente configura permissões granulares das categorias e transfere profissionais antes de inativar/excluir profissões vinculadas.

**Entradas**: CPF, senha, e-mail, nome/sobrenome, categoria, vínculo/profissional e profissão; ações administrativas de status, transferência e permissões. **Saídas**: conta e vínculo profissional, sessão autenticada, autorização derivada da categoria, status sincronizado, mudanças registradas em log.

### 2. Status geral

**PARCIAL.** Gestão de usuários, categorias, profissões e permissões tem fluxo conectado entre frontend e API; autenticação e autorização estão implementadas. Há lacunas de integração com o módulo oficial de Profissionais, ausência de recuperação de senha, inconsistências possíveis entre profissão/categoria e vias de criação fora da API que não asseguram vínculo. Exclusão física pode falhar com relacionamentos protegidos. As suites existentes não foram executadas nesta auditoria → **A VALIDAR**.

### 3. Requisitos e status de implementação

#### 3.1 Regras de negócio (`regras_usuarios.md`, tópicos §2–§9; sem IDs formais)

| Regra/tópico | Status | Evidência/observação |
|---|---|---|
| §2 Usuário vinculado a profissional; vínculo imutável; exclusão em cascata | **PARCIAL** | API exige exatamente uma associação e bloqueia troca; `Professional.user` é nullable por necessidade de pool e o manager/Admin não impõe associação. Exclusão em cascata existe, mas relações `PROTECT` podem interrompê-la (P-USU-1). |
| §3 Categoria única correspondente à profissão; categoria criada com profissão e sem permissões; mudança sincronizada | **PARCIAL** | FK obrigatória e validação no serviço de criação; `Profession.save()` cria categoria. Transferência atualiza categoria e grupos. Não há relação FK entre profissão/categoria, e telas/admin permitem categoria independente ou apagar categoria espelho vazia (P-USU-2). |
| §4 Profissões flexíveis; apenas gerente administra; vínculos bloqueiam inativação/exclusão; transferência | **PARCIAL** | API faz gating e bloqueios; transferência em lote implementada. UI cria, ativa/inativa, exclui e transfere, mas não oferece edição de nome, embora RF/tarefa a exijam (P-USU-3). |
| §5 Permissões granulares por funcionalidade/ação; gerente configura inclusive categoria de gerente; categoria nova vazia | **CONCLUÍDO** | M2M, catálogo read-only, endpoint de configuração e tela agrupada por funcionalidade; verificações backend via `RequirePermission`. |
| §6 Login CPF/senha; CPF/e-mail obrigatórios e únicos; e-mail para recuperação | **PARCIAL** | Normalização/validação de CPF, unicidade e e-mail obrigatório, login implementado. Recuperação por e-mail explicitamente adiada no `AGENTS.md` (P-USU-4). |
| §7 Status sincroniza usuário/profissional e preserva vínculo | **CONCLUÍDO** | Serviço transacional e actions idempotentes de inativar/reativar; testes escritos. |
| §8 Exclusão definitiva pelo gerente e exclusão do profissional | **PARCIAL** | API aplica gerente/permissão e CASCADE; referências protegidas a usuário/profissional podem causar exceção não tratada. |
| §9 Limites do processo | **CONCLUÍDO** | Stub contém apenas nome, profissão e status; campos completos de Profissional e regras clínicas não foram antecipados. |

#### 3.2 Requisitos funcionais (`requisitos_usuarios.md`, §1–§7; sem IDs RF)

| Requisito | Status | Evidência/observação |
|---|---|---|
| §1 criar, consultar, visualizar, editar dados permitidos e bloquear troca de profissional | **PARCIAL** | API e telas conectadas; cadastro valida associação. Edição não muda vínculo/categoria conforme regra. Restrição de vínculo não é universal fora da API. |
| §1 inativar/reativar e sincronizar; excluir definitivamente pelo gerente com profissional | **PARCIAL** | Ações e controles presentes; exclusão com confirmação, sujeita ao P-USU-1. |
| §2 login CPF/senha; unicidade CPF/e-mail e e-mail obrigatório | **CONCLUÍDO** | User customizado, serializer e endpoints de auth; erros de login genéricos e usuário inativo não autentica (conforme código/testes existentes). |
| §2 recuperação de senha por e-mail | **NÃO INICIADO** | AGENTS registra recuperação adiada por ausência de SMTP. |
| §3 categorias, categorias sem usuários, relação categoria/profissão, categoria automática sem permissões e sincronização | **PARCIAL** | Criação automática e sincronização em transferências funcionam; modelo não garante identidade/consistência entre as duas entidades nem edição segura do nome correspondente. |
| §4 criar/editar profissão, bloquear inativação/exclusão com vínculo e transferir | **PARCIAL** | Backend implementa tudo; frontend não expõe edição de nome. |
| §5 permissões por categoria, categoria sem permissões e validação antes da ação | **CONCLUÍDO** | Endpoint/tela e RequirePermission aplicados. `IsGerente` mais permissão granular nas rotas administrativas. |
| §6 módulo oficial de Profissionais | **PARCIAL** | Só há stub `Professional`; não existe CRUD próprio/campos completos. |
| §7 política de senha, expiração, MFA, detalhes técnicos de recuperação, auditoria detalhada e cadastro completo de profissionais | **FORA DO MVP / A VALIDAR** | Não definidos nos documentos; política de senha usa validadores padrão configurados no projeto. Auditoria disponível é mínima, sem UI/histórico dedicado. |

#### 3.3 Tasks (`tasks_usuarios.md`, sem IDs/checkboxes)

Modelagem, backend de usuário/categoria/profissão/permissões, telas principais, sincronização e cenários de validação têm implementação correspondente. Recuperação de senha está pendente; edição de profissão não existe na UI; auditoria é mínima. Os itens estão escritos como lista sem IDs ou estado, então não se pode inferir conclusão apenas pelo documento.

### 4. Evidências do backend

- `accounts/models.py`: `User` (CPF único, e-mail único, FK obrigatória para `Category`), `Category`, `Profession`, `GranularPermission`, `UserAuditLog`. CPF normalizado no model/manager; `Profession.save()` cria categoria homônima.
- `professionals/models.py`: `Professional.user` é OneToOne nullable para admitir profissionais sem acesso; profissão `PROTECT`, status e nome. Essa nulabilidade significa que a regra “todo User tem Professional” só é garantida pelos fluxos da API, não por constraint do banco.
- `accounts/services.py`: `create_managed_user` transacional valida a profissão/categoria e vincula profissional livre ou recém-criado; `set_user_status` sincroniza status; mudança/transferência de profissão atualiza categoria e espelho de Groups; log de eventos.
- `accounts/serializers_users.py`: acumula obrigatórios, valida CPF/senha, categoria e profissional; impede troca de profissional/categoria na edição; senha write-only. `views_users.py` fornece filtros nome/CPF/status/categoria, paginação de 20, CRUD, ações de status, catálogo/permissões, profissões, transferências e profissionais livres.
- Rotas `/api/usuarios/`, `/api/categorias/`, `/api/profissoes/`, `/api/permissoes/`, `/api/profissionais-livres/`; auth em `/api/auth/{login,refresh,logout,me}/`. Permissões combinam `IsGerente` e granular por endpoint. Grupos legados são espelhados na categoria por compatibilidade com endpoints clínicos.
- Migrations `accounts/0001–0011` e `professionals/0001`; auditoria em `accounts/audit.py`, log protegido contra edição no admin.
- `accounts/tests_users.py` cobre criação, unicidade/CPF, filtros, autorização, status, login inativo, exclusão, profissão/categoria, permissões e profissionais livres. Testes existentes não foram executados; não afirmar resultado nesta etapa.

### 5. Evidências do frontend

- `App.tsx`: rotas de usuários, categorias e profissões protegidas por `RequireGerente`; `AppLayout.tsx` mostra Administração para gerente.
- `UsersList.tsx`: lista, filtros nome/CPF/categoria/status e paginação; `UserForm.tsx`: criar/editar conta, selecionar categoria e criar/vincular profissional no cadastro; categorias/profissão imutáveis na edição; erros por campo e mensagens de API.
- `UserDetail.tsx`: detalhes, editar, inativar/reativar, exclusão com confirmação e indicação dos efeitos no profissional.
- `Categories.tsx`: cria categorias, lista contagem e permissões, configura permissões; exclusão confirmada. `Professions.tsx`: criar, transferir, inativar/reativar e excluir; sem edição do nome.
- `lib/users.ts` integra as operações com `apiJson`; `lib/api.ts` inclui cookies e refresh silencioso. Fluxo conectado de usuários/categorias/profissões; sem testes específicos de páginas declarados no inventário desta auditoria. Erros de API são mostrados em alerta; ações desabilitam enquanto salvam em formulários, com tratamento inconsistente em outras telas.

### 6. Entidades e relacionamentos

```text
User (accounts_user) ── FK PROTECT ──> Category ── M2M ──> GranularPermission
    │ 1:1 reverse, mas opcional no banco
    └── Professional (professionals; user nullable, CASCADE ao excluir User)
             └── FK PROTECT ──> Profession ── save() cria Category homônima
UserAuditLog ── FK SET_NULL ──> User (sujeito e ator)
```

O modelo assegura exatamente uma categoria no usuário, mas não assegura que a categoria corresponda à profissão. O vínculo obrigatório com Profissional é garantido na API de gerenciamento e no bootstrap de superusuário, não por constraint/model `User`. A entidade profissional é explicitamente stub, com outros módulos apontando para ela.

### 7. Regras implementadas e pendentes

Implementadas: CPF/e-mail únicos, CPF normalizado; senha armazenada pelo mecanismo Django; associação validada no fluxo de criação gerenciado; profissão/categoria sincronizadas em transferência; status sincronizado; categorias sem permissões por padrão; autorização granular em endpoints; grupos legados atualizados; auditoria mínima direta.

Pendentes/limitadas: recuperação de senha; campos e cadastro oficial de profissionais; edição de nome de profissão pela UI; integridade universal User–Professional e correspondência profissão–categoria; auditoria detalhada/consulta pelo usuário; tratamento seguro de exclusão quando há dependências `PROTECT`; políticas de MFA/expiração de sessão não definidas.

### 8. Problemas encontrados

| # | Problema | Tipo | Evidência |
|---|---|---|---|
| P-USU-1 | Exclusão física do usuário chama `instance.delete()` sem capturar `ProtectedError`. Relações clínicas/de escala podem proteger User ou Professional (`Patient.responsible_doctor`, atribuições), fazendo a ação falhar como erro 500 em vez de resposta de domínio; contradiz a promessa de exclusão garantida em cascata. | Divergência/integração | `accounts/views_users.py:perform_destroy`; FKs `PROTECT` em `patients`/`care_scales` e `professionals`. |
| P-USU-2 | Correspondência profissão↔categoria é por nome e convenção, sem FK/constraint. `Profession.save()` só cria categoria no nome atual; renomear profissão no backend não renomeia a categoria. UI permite criar/excluir categorias independentemente. | Modelagem/regra | `accounts/models.py` (`Profession.save`, `User.category`), `CategoryViewSet`, `Categories.tsx`. |
| P-USU-3 | Requisito/tarefa de editar profissão não chega à interface: tela só cria, transfere, altera status e exclui. Endpoint/serializer de profissão aceita update de nome. | Integração incompleta | `Professions.tsx` × `ProfessionViewSet`/`ProfessionSerializer`. |
| P-USU-4 | Recuperação de senha não implementada; dependência de e-mail/SMTP ausente e documentada como adiada. | Funcionalidade ausente | `requisitos_usuarios.md §2`; `AGENTS.md` Users. |
| P-USU-5 | Associação obrigatória User–Professional não é garantia do banco. `UserManager.create_user` e o formulário do Django Admin criam usuário sem Professional; `Professional.user` nullable é esperado para profissionais livres, mas o lado User não tem validação central. | Divergência de invariantes | `accounts/models.py:CustomUserManager`; `accounts/admin.py`; `professionals/models.py`. |
| P-USU-6 | Testes backend e frontend não foram executados/verificados nesta auditoria; também não há cobertura de componentes/pages confirmada. | A VALIDAR / cobertura | `accounts/tests_users.py`; `frontend/.../tests` (inventário). |
| P-USU-7 | O doc-mãe não descreve o processo Usuários nem suas entidades, embora elas sejam fundacionais para autorização e seleção de profissionais. | Divergência documental | `Processos e Modelo de Dados.md §3/§15`; referência cruzada em `AGENTS.md`. |
| P-USU-8 | Auditoria registra ação e mudanças resumidas (`UPDATE` contém apenas ID); não há tela de histórico e a trilha não satisfaz auditoria detalhada. | Parcial / decisão de escopo | `accounts/audit.py`, `UserSerializer.update`, `UserAuditLogAdmin`. |

### 9. Decisões pendentes

**Consolidadas com o usuário em 23/11/2026:**

- **D-USU-1 — resolvida:** bloquear exclusão física quando houver referências protegidas e responder com explicação de domínio.
- **D-USU-2 — resolvida:** profissão e categoria terão vínculo formal 1:1; renomeação será transacional e conjunta. A categoria mantém permissões próprias.
- **D-USU-3 — resolvida:** não criar IDs formais novos; requisitos e regras sem IDs serão referenciados pelo número da seção/tópico.
- **D-USU-4 — resolvida:** recuperação de senha por e-mail entra no MVP, com SMTP configurável por ambiente.
- **D-USU-5 — resolvida para o escopo atual:** manter a auditoria mínima existente, sem interface de histórico. Política detalhada de retenção/acesso não será ampliada nesta execução.
- **Documental — resolvida:** incluir Usuários e suas entidades no doc-mãe; regras e requisitos serão referenciados por seção.

- Continuam fora das decisões consolidadas: política de senha além dos validadores existentes, expiração de sessão, MFA, retenção detalhada de auditoria e cadastro completo do módulo Profissionais. Não bloquearão as tasks aprovadas, salvo dependência técnica direta.

### 10. Dependências com outros processos

- **Profissionais**: vínculo atual usa `Professional` stub; campos específicos e gestão oficial são dependência não implementada. A lista de profissionais livres depende de criar profissionais no admin ou por fluxo futuro.
- **Cadastro do paciente**: `responsible_doctor` referencia `accounts.User` com proteção contra exclusão, impactando exclusão física (P-USU-1); catálogo de médicos depende dos Groups sincronizados.
- **Avaliação/necessidades/plano/escala**: permissões granulares são base de acesso; Groups GERENTE/MEDICO/ENFERMEIRO continuam espelhados para endpoints legados. `Professional` é usado em plano e escala, e FKs protegidas impedem cascata indiscriminada.
- **Escala**: seed `escalas.*` é só Gerente; concessão a outras categorias depende da tela de Categorias (P-ESC-11), agora funcional, embora a política de quais perfis devem receber acesso continue dependente de decisão/configuração.
- **Agendamento e visita domiciliar**: sem integração implementada; escopo corretamente excluído das regras de Usuários.

### 11. Tasks recomendadas

IDs abaixo são internos desta auditoria; `tasks_usuarios.md` não define IDs formais.

1. **TASK-USU-001 — Definir exclusão de usuários com dependências protegidas** (D-USU-1/P-USU-1) e tratar a resposta do endpoint com regra explícita e cobertura.
2. **TASK-USU-002 — Formalizar integridade profissão/categoria** (D-USU-2/P-USU-2): decidir relação, comportamento em rename e operações via UI/API/admin.
3. **TASK-USU-003 — Implementar edição de profissão na interface** (P-USU-3), respeitando vínculos e unicidade.
4. **TASK-USU-004 — Garantir invariantes de criação de usuário fora da API** (P-USU-5): alinhar manager/admin/fluxos suportados sem impedir profissionais livres.
5. **TASK-USU-005 — Decidir e implementar recuperação de senha** (P-USU-4/D-USU-4) quando aprovado para o MVP.
6. **TASK-USU-006 — Completar/auditar trilha de mudanças** (P-USU-8/D-USU-5), com escopo, retenção e acesso definidos.
7. **TASK-USU-007 — Atualizar doc-mãe e formalizar IDs** (P-USU-7/D-USU-3), incluindo entidades, fluxo, permissões e fonte da verdade.
8. **TASK-USU-008 — Executar e registrar testes existentes e ampliar cobertura frontend** (P-USU-6); validação pendente nesta auditoria.

---

**Próximo processo a ser analisado**: **Agendamento**. Concluídos nesta etapa: Cadastro do Paciente, Avaliação Inicial, Necessidades Identificadas, Plano de Cuidados, Escala e Usuários (6 de 8).

### 12. Consolidação de decisões e etapas de implementação (23/11/2026)

As decisões da seção 9 foram consolidadas antes da implementação. Ordem de trabalho aprovada para o processo Usuários:

1. **Etapa 1 — integridade profissão/categoria:** vínculo 1:1, migração dos dados existentes, renomeação atômica por API/admin e UI; validar conflitos de nomes antes de migrar.
2. **Etapa 2 — exclusão protegida e invariantes de usuário:** traduzir `ProtectedError` em resposta explicativa; garantir criação de usuário com profissional no manager, admin e API, preservando profissionais livres.
3. **Etapa 3 — edição de profissão:** expor renomeação na interface, usando a operação transacional consolidada na Etapa 1.
4. **Etapa 4 — recuperação de senha:** fluxo por e-mail com SMTP configurável, tokens de uso único/expiração e configuração documentada; nenhuma credencial será versionada.
5. **Etapa 5 — documentação final e validação integrada:** manter auditoria mínima sem UI; executar testes focados e atualizar este relatório, tarefas e doc-mãe com resultados.

Cada etapa de código será implementada e testada separadamente. Ao concluir uma etapa, o trabalho pausa para o usuário compactar o contexto e autorizar o avanço à seguinte. A recuperação de senha depende de configurar SMTP no ambiente de execução antes da validação ponta a ponta; testes podem usar backend de e-mail em memória.
