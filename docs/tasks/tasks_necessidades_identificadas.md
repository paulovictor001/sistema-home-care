# Tasks — Processo de Necessidades Identificadas

## 1. Modelagem de dados
- [x] Criar entidade/tabela de tipos de necessidade.
- [x] Definir campos do tipo: `id`, `name`, `description`, `status`, `created_at`, `updated_at`.
- [x] Criar entidade/tabela de necessidades.
- [x] Definir vínculo com avaliação (`assessment_id`).
- [x] Definir vínculo com tipo (`need_type_id`).
- [x] Definir `description`, `priority`, `status`, `created_at`, `updated_at`.
- [x] Garantir relação de uma avaliação para múltiplas necessidades.
- [x] Definir prioridades: Baixa, Média, Alta e Urgente.
- [x] Definir status inicial `Identificada`.

## 2. Tipos de necessidade
- [x] Cadastrar Enfermagem.
- [x] Cadastrar Fisioterapia.
- [x] Cadastrar Médico.
- [x] Cadastrar Nutrição.
- [x] Cadastrar Terapia Ocupacional.
- [x] Cadastrar Fonoaudiologia.
- [x] Cadastrar Psicologia.
- [x] Cadastrar Outro.
- [x] Implementar criação e edição de tipos (nome obrigatório e único; descrição opcional).
- [x] Implementar ativação e inativação de tipos.
- [x] Impedir seleção de tipos inativos em novas necessidades.
- [x] Preservar vínculos históricos com tipos inativados (FK `PROTECT` em `CareNeed`).
- [x] Restringir endpoints de administração de tipos aos três perfis; acesso à tela aguarda DN-2.

> Implementação — TA-78: endpoints `POST /api/tipos-necessidade/<id>/inativar/` e `/reativar/`, idempotentes e preservando o registro. A API de criação de `CareNeed` já existente no `upstream/main` mantém a validação de tipo ativo e o vínculo histórico por FK `PROTECT`. Autorização específica da administração dos tipos permanece na TA-88.

> Implementação — TA-73 (model): `assessments.NeedType` (`need_types`, ordering por nome) com `NeedTypeStatus` ACTIVE/INACTIVE (default ACTIVE), `name` único com strip em `clean()`/`save()`, seed idempotente dos 8 tipos via `patients/0005` e migração de estado `assessments/0004` (sem recriar tabela), admin `NeedTypeAdmin` em `assessments` e testes `NeedTypeModelTests` (7). Histórico preservado por FK `PROTECT` em `CareNeed`; administração autorizada por `tipos_necessidade.manage`.

## 3. Backend — Necessidades
- [x] Implementar criação vinculada a avaliação.
- [x] Validar avaliação existente.
- [x] Validar tipo obrigatório e ativo.
- [x] Validar descrição obrigatória.
- [x] Validar prioridade obrigatória e válida.
- [x] Definir automaticamente status `Identificada`.
- [x] Implementar consulta.
- [x] Implementar edição.
- [x] Permitir exclusão sem plano/histórico; bloquear vínculos protegidos e registros com histórico.
- [x] Implementar inativação.
- [x] Preservar histórico na inativação.
- [x] Implementar autorização por perfil.

## 4. Frontend — Necessidades
> Backend de consulta/edição/exclusão (RF-NEC-008/009/010): `GET /api/necessidades/` (20 por página, filtro opcional `?assessment=<id>`), `GET /api/necessidades/<id>/`, `PUT/PATCH` e `DELETE /api/necessidades/<id>/`. Exclusão retorna 204 quando não há vínculo com plano ou histórico; retorna 400 com mensagem clara nos casos bloqueados. Acesso direto restrito à equipe clínica. Edição permite tipo, descrição e prioridade; avaliação de origem e status continuam read-only. Quando vinculada a plano, a edição exibe aviso e pede confirmação. Tipo histórico inativo pode ser mantido; a troca exige um tipo ativo. Criação segue no endpoint da avaliação.

- [x] Criar seção de necessidades associada à avaliação.
- [x] Exibir necessidades existentes.
- [x] Criar formulário com Tipo, Descrição, Prioridade e Status.
- [x] Disponibilizar somente tipos ativos para novos cadastros.
- [x] Disponibilizar prioridades definidas.
- [x] Exibir status inicial `Identificada`.
- [x] Implementar edição conforme perfil.
- [x] Permitir exclusão quando não houver plano/histórico e informar por que não é possível nos casos bloqueados.
- [x] Implementar inativação conforme perfil.
- [x] Exibir informações históricas necessárias.

## 5. Administração dos tipos
- [x] Criar tela/área de manutenção dos tipos e conectá-la a `/api/tipos-necessidade/`.
- [x] Permitir criação e edição de nome e descrição.
- [x] Permitir ativação e inativação.
- [x] Indicar estado ativo/inativo e listar ambos os estados na manutenção.
- [x] Restringir rota, menu e endpoints aos três perfis com `tipos_necessidade.manage`.

## 6. Autorização
- [x] Autorizar Médico e Enfermeiro a criar.
- [x] Autorizar Médico e Enfermeiro a visualizar.
- [x] Autorizar Médico e Enfermeiro a editar.
- [x] Restringir exclusão à equipe clínica com `necessidades.delete`.
- [x] Autorizar Gerente, Médico e Enfermeiro a inativar.
- [x] Autorizar Gerente, Médico e Enfermeiro a administrar tipos no backend.
- [x] Não assumir permissões além das definidas; criação/edição e acesso à tela seguem as decisões DN-1/DN-2.

## 7. Testes

- [x] Testar criação vinculada a avaliação.
- [x] Testar múltiplas necessidades na mesma avaliação.
- [x] Testar campos obrigatórios.
- [x] Testar prioridades válidas.
- [x] Testar status inicial `Identificada`.
- [x] Testar edição.
- [x] Testar exclusão permitida sem vínculos e bloqueada com plano ou histórico.
- [x] Testar inativação e preservação do histórico.
- [x] Testar criação, edição, validação de nome e permissões dos tipos.
- [x] Testar ativação/inativação de tipos.
- [x] Testar que tipo inativo não aparece em novos cadastros.
- [x] Testar preservação de vínculos históricos (`CareNeed` usa FK `PROTECT`).
- [x] Testar permissões por perfil.

## 8. Fora do escopo
Não implementar neste processo (limites respeitados):
- [x] Novos status além de `Identificada`.
- [x] Transições de status.
- [x] Regras do Plano de Cuidados.
- [x] Frequência de atendimento.
- [x] Escala.
- [x] Agendamento.
- [x] Visita.
- [x] Atendimento.
- [x] Evolução.
- [x] Regras de estoque, farmácia ou logística da execução do cuidado.

## 9. Organização
As tasks devem permanecer agrupadas por funcionalidade/processo, evitando uma task isolada para cada campo. A implementação deve seguir modelagem, backend/regras, frontend, autorização e testes.

## Inativação com histórico — RF-NEC-011/012

- `POST /api/necessidades/<id>/inativar/`: Gerente, Médico e Enfermeiro com `necessidades.inactivate` (migration `accounts.0007`). Resposta contém somente id, situação e data; a ação não concede consulta clínica ao Gerente.
- `is_active` e `inactivated_at` são somente leitura. A inativação preserva descrição, prioridade, tipo, avaliação e status clínico `IDENTIFIED`, sem antecipar transições do Plano de Cuidados.
- A alteração e o evento `CareNeedHistory` são transacionais. Repetir a ação mantém a data original e não duplica histórico. O evento guarda ator, nome do ator, data e snapshot anterior à inativação; FK `SET_NULL` preserva o evento se o ator for removido.
- Listagem padrão retorna somente ativas; `?situacao=ativo|inativo|todos` permite consultar as demais. Detalhe e avaliação mantêm os registros inativos identificados como tal.
- `GET /api/necessidades/<id>/historico/`: Médico/Enfermeiro com `necessidades.view`. Histórico somente leitura no admin. Eventos anteriores à implementação não são reconstruídos.
- Detalhe da avaliação oferece botões Inativar/Reativar com confirmação e indicação de situação/data; equipe clínica pode consultar o histórico de inativação/reativação.

## Reativação com histórico — RF-NEC-021
- [x] Endpoint idempotente `POST /api/necessidades/<id>/reativar/` para Gerente/Médico/Enfermeiro com `necessidades.reactivate` (migration `accounts.0008`).
- [x] Restaurar `is_active=True` e limpar `inactivated_at`, mantendo dados e status clínico. Datas anteriores permanecem no histórico.
- [x] Registrar evento `REACTIVATE` transacional com snapshot, ator e data, preservando eventos `INACTIVATE`.
- [x] Botão Reativar no detalhe da avaliação e histórico com identificação de ambas as ações.
- [x] Testar permissões, ciclos, idempotência, filtros, preservação dos dados e rollback.

Esta extensão substitui a indicação anterior de reativação fora do escopo, por solicitação explícita do usuário.

Validação executada em 22/11/2026: suíte completa `python manage.py test assessments patients accounts --noinput` — 205 testes passaram; após o ajuste final de acesso a tipos inativos, `python manage.py test assessments.tests_need_permissions assessments.tests_needs_api --noinput` — 23 passaram. Frontend: `node --test tests/assessments.test.mjs` — 5 testes passaram.

## Decisões de exclusão e visualização — 22/11/2026

- Médico e Enfermeiro podem excluir fisicamente uma necessidade sem histórico e sem vínculo com plano. Vínculo protegido por plano ou eventos de histórico bloqueiam a exclusão com HTTP 400 e mensagem específica.
- A interface oculta Excluir quando a necessidade está vinculada a plano; se houver histórico, apresenta a resposta clara da API. Uma exclusão permitida retorna 204.
- O Gerente mantém a visualização das necessidades aninhadas em avaliações que pode consultar. A lista, o detalhe e o histórico diretos continuam restritos à equipe clínica.
- Gerente, Médico e Enfermeiro podem criar/editar nome e descrição de tipos e alterar sua situação, conforme `tipos_necessidade.manage`.

## Autorização backend — RF-NEC-018/021

- Matriz centralizada em `assessments/permissions.py`: perfil e permissão granular são exigidos juntos; usuário inativo é bloqueado. Ações desconhecidas são negadas.
- Médico/Enfermeiro: criar (`necessidades.create` e `avaliacoes.add_need`), consultar/histórico (`necessidades.view`), editar (`necessidades.update`) e excluir (`necessidades.delete`); exclusão é bloqueada se houver vínculo com plano ou histórico. Inativação requer `necessidades.inactivate`.
- Gerente/Médico/Enfermeiro: inativar (`necessidades.inactivate`), reativar (`necessidades.reactivate`) e alterar situação de tipos (`tipos_necessidade.manage`).
- Migration `accounts.0009` cria as permissões faltantes. A nova permissão de criação só é atribuída às categorias clínicas que ainda possuem `avaliacoes.add_need`, preservando revogações anteriores.
- O catálogo de tipos continua usando a autorização da avaliação (`avaliacoes.view`). A visualização dos relacionados dentro da avaliação mantém o contrato RF-AVL-009/BE-003 existente; a consulta direta e o histórico de necessidades seguem RF-NEC-018.
- Testes cobrem todas as operações contra anônimos, perfis indevidos mesmo com permissões atribuídas, categorias sem a permissão específica e usuários inativos, garantindo ausência de mutações nos bloqueios. Criação/edição de tipos não são adicionadas nesta task.

## Seção de necessidades na avaliação

O formulário de criação/edição mostra a seção desde o início, com orientação para salvar a avaliação antes de adicionar registros vinculados. Exibe lista, situação ativa/inativa e formulário Tipo/Descrição/Prioridade/Status inicial. Adição exige perfil clínico e permissões `necessidades.create` + `avaliacoes.add_need`; erros de catálogo e de inclusão aparecem na seção. Após criar, novos salvamentos atualizam a mesma avaliação. Link para o detalhe permite acessar situação e histórico. Edição, exclusão condicionada, inativação e reativação ficam disponíveis no detalhe da avaliação para perfis com permissão.

## Frontend — Edição e situação

No detalhe da avaliação, Médico/Enfermeiro com `necessidades.update` podem editar tipo, descrição e prioridade em formulário inline com salvar/cancelar, validação e erros por campo. Tipos ativos são oferecidos; o tipo histórico atual pode ser mantido mesmo inativo. Status e situação são somente leitura. Se existir vínculo com plano, a tela avisa que os dados atualizados serão consultados pelo plano e pede confirmação. Excluir fica oculto quando houver plano; tentativa bloqueada por histórico informa a razão recebida da API. Inativação/reativação e consulta do histórico permanecem integradas, com ações bloqueadas durante edição ou requisição em andamento.
