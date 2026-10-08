# Tasks — Processo de Necessidades Identificadas

## 1. Modelagem de dados
- [x] Criar entidade/tabela de tipos de necessidade.
- [x] Definir campos do tipo: `id`, `name`, `description`, `status`, `created_at`, `updated_at`.
- [ ] Criar entidade/tabela de necessidades.
- [ ] Definir vínculo com avaliação (`assessment_id`).
- [ ] Definir vínculo com tipo (`need_type_id`).
- [ ] Definir `description`, `priority`, `status`, `created_at`, `updated_at`.
- [ ] Garantir relação de uma avaliação para múltiplas necessidades.
- [ ] Definir prioridades: Baixa, Média, Alta e Urgente.
- [ ] Definir status inicial `Identificada`.

## 2. Tipos de necessidade
- [x] Cadastrar Enfermagem.
- [x] Cadastrar Fisioterapia.
- [x] Cadastrar Médico.
- [x] Cadastrar Nutrição.
- [x] Cadastrar Terapia Ocupacional.
- [x] Cadastrar Fonoaudiologia.
- [x] Cadastrar Psicologia.
- [x] Cadastrar Outro.
- [ ] Implementar criação e edição de tipos.
- [x] Implementar ativação e inativação de tipos.
- [ ] Impedir seleção de tipos inativos em novas necessidades.
- [x] Preservar vínculos históricos com tipos inativados (FK `PROTECT` em `CareNeed`).
- [ ] Restringir administração de tipos a Gerente, Médico e Enfermeiro.

> Implementação — TA-78: endpoints `POST /api/tipos-necessidade/<id>/inativar/` e `/reativar/`, idempotentes e preservando o registro. A API de criação de `CareNeed` já existente no `upstream/main` mantém a validação de tipo ativo e o vínculo histórico por FK `PROTECT`. Autorização específica da administração dos tipos permanece na TA-88.

> Implementação — TA-73 (model): `patients.NeedType` (`need_types`, ordering por nome) com `NeedTypeStatus` ACTIVE/INACTIVE (default ACTIVE), `name` único com strip em `clean()`/`save()`, seed idempotente dos 8 tipos via `0005_alter_needtype_status` (RunPython), admin `NeedTypeAdmin` e testes `NeedTypeModelTests` (7). Histórico preservado: inativação mantém o registro; o vínculo histórico por FK `PROTECT` em `CareNeed` já está implementado na `upstream/main`. Pendente: autorização específica da administração dos tipos.

## 3. Backend — Necessidades
- [ ] Implementar criação vinculada a avaliação.
- [ ] Validar avaliação existente.
- [ ] Validar tipo obrigatório e ativo.
- [ ] Validar descrição obrigatória.
- [ ] Validar prioridade obrigatória e válida.
- [ ] Definir automaticamente status `Identificada`.
- [x] Implementar consulta.
- [x] Implementar edição.
- [x] Implementar exclusão.
- [x] Implementar inativação.
- [x] Preservar histórico na inativação.
- [x] Implementar autorização por perfil.

## 4. Frontend — Necessidades
> Backend de consulta/edição/exclusão (RF-NEC-008/009/010): `GET /api/necessidades/` (20 por página, filtro opcional `?assessment=<id>`), `GET /api/necessidades/<id>/`, `PUT/PATCH /api/necessidades/<id>/` e `DELETE /api/necessidades/<id>/`. Acesso restrito a Médico/Enfermeiro com `necessidades.view/update/delete`, criadas e atribuídas às categorias clínicas pela migration `accounts.0006`. Exclusão física remove somente a necessidade, preservando avaliação, tipo e demais necessidades. Edição permite tipo, descrição e prioridade; avaliação de origem e status continuam read-only. Tipo histórico inativo pode ser mantido; a troca exige um tipo ativo. Criação segue no endpoint da avaliação. Inativação e telas permanecem nas tasks próprias.

- [x] Criar seção de necessidades associada à avaliação.
- [x] Exibir necessidades existentes.
- [x] Criar formulário com Tipo, Descrição, Prioridade e Status.
- [x] Disponibilizar somente tipos ativos para novos cadastros.
- [x] Disponibilizar prioridades definidas.
- [x] Exibir status inicial `Identificada`.
- [x] Implementar edição conforme perfil.
- [x] Implementar exclusão conforme perfil.
- [x] Implementar inativação conforme perfil.
- [ ] Exibir informações históricas necessárias.

## 5. Administração dos tipos
- [ ] Criar tela/área de manutenção dos tipos.
- [ ] Permitir criação e edição.
- [ ] Permitir ativação e inativação.
- [ ] Indicar estado ativo/inativo.
- [ ] Restringir a Gerente, Médico e Enfermeiro.

## 6. Autorização
- [x] Autorizar Médico e Enfermeiro a criar.
- [x] Autorizar Médico e Enfermeiro a visualizar.
- [x] Autorizar Médico e Enfermeiro a editar.
- [x] Autorizar Médico e Enfermeiro a excluir.
- [x] Autorizar Gerente, Médico e Enfermeiro a inativar.
- [ ] Autorizar Gerente, Médico e Enfermeiro a administrar tipos.
- [ ] Não assumir permissões não definidas.

## 7. Testes
- [ ] Testar criação vinculada a avaliação.
- [ ] Testar múltiplas necessidades na mesma avaliação.
- [ ] Testar campos obrigatórios.
- [ ] Testar prioridades válidas.
- [ ] Testar status inicial `Identificada`.
- [ ] Testar edição.
- [ ] Testar exclusão.
- [x] Testar inativação e preservação do histórico.
- [ ] Testar CRUD dos tipos.
- [x] Testar ativação/inativação de tipos.
- [ ] Testar que tipo inativo não aparece em novos cadastros.
- [ ] Testar preservação de vínculos históricos (depende do futuro `CareNeed`).
- [x] Testar permissões por perfil.

## 8. Fora do escopo
Não implementar neste processo:
- [ ] Novos status além de `Identificada`.
- [ ] Transições de status.
- [ ] Regras do Plano de Cuidados.
- [ ] Frequência de atendimento.
- [ ] Escala.
- [ ] Agendamento.
- [ ] Visita.
- [ ] Atendimento.
- [ ] Evolução.
- [ ] Regras de estoque, farmácia ou logística da execução do cuidado.

## 9. Organização
As tasks devem permanecer agrupadas por funcionalidade/processo, evitando uma task isolada para cada campo. A implementação deve seguir modelagem, backend/regras, frontend, autorização e testes.

## Inativação com histórico — RF-NEC-011/012

- `POST /api/necessidades/<id>/inativar/`: Gerente, Médico e Enfermeiro com `necessidades.inactivate` (migration `accounts.0007`). Resposta contém somente id, situação e data; a ação não concede consulta clínica ao Gerente.
- `is_active` e `inactivated_at` são somente leitura. A inativação preserva descrição, prioridade, tipo, avaliação e status clínico `IDENTIFIED`, sem antecipar transições do Plano de Cuidados.
- A alteração e o evento `CareNeedHistory` são transacionais. Repetir a ação mantém a data original e não duplica histórico. O evento guarda ator, nome do ator, data e snapshot anterior à inativação; FK `SET_NULL` preserva o evento mesmo após exclusão física do registro ou ator.
- Listagem padrão retorna somente ativas; `?situacao=ativo|inativo|todos` permite consultar as demais. Detalhe e avaliação mantêm os registros inativos identificados como tal.
- `GET /api/necessidades/<id>/historico/`: Médico/Enfermeiro com `necessidades.view`. Histórico somente leitura no admin. Eventos anteriores à implementação não são reconstruídos.
- Detalhe da avaliação oferece botão Inativar com confirmação e indicação de situação/data; equipe clínica pode consultar o histórico de inativação. Reativação permanece fora do escopo.

## Reativação com histórico — RF-NEC-021
- [x] Endpoint idempotente `POST /api/necessidades/<id>/reativar/` para Gerente/Médico/Enfermeiro com `necessidades.reactivate` (migration `accounts.0008`).
- [x] Restaurar `is_active=True` e limpar `inactivated_at`, mantendo dados e status clínico. Datas anteriores permanecem no histórico.
- [x] Registrar evento `REACTIVATE` transacional com snapshot, ator e data, preservando eventos `INACTIVATE`.
- [x] Botão Reativar no detalhe da avaliação e histórico com identificação de ambas as ações.
- [x] Testar permissões, ciclos, idempotência, filtros, preservação dos dados e rollback.

Esta extensão substitui a indicação anterior de reativação fora do escopo, por solicitação explícita do usuário.

## Autorização backend — RF-NEC-018/021

- Matriz centralizada em `assessments/permissions.py`: perfil e permissão granular são exigidos juntos; usuário inativo é bloqueado. Ações desconhecidas são negadas.
- Médico/Enfermeiro: criar (`necessidades.create` e a permissão existente `avaliacoes.add_need`), consultar/histórico (`necessidades.view`), editar (`necessidades.update`) e excluir (`necessidades.delete`).
- Gerente/Médico/Enfermeiro: inativar (`necessidades.inactivate`), reativar (`necessidades.reactivate`) e alterar situação de tipos (`tipos_necessidade.manage`).
- Migration `accounts.0009` cria as permissões faltantes. A nova permissão de criação só é atribuída às categorias clínicas que ainda possuem `avaliacoes.add_need`, preservando revogações anteriores.
- O catálogo de tipos continua usando a autorização da avaliação (`avaliacoes.view`). A visualização dos relacionados dentro da avaliação mantém o contrato RF-AVL-009/BE-003 existente; a consulta direta e o histórico de necessidades seguem RF-NEC-018.
- Testes cobrem todas as operações contra anônimos, perfis indevidos mesmo com permissões atribuídas, categorias sem a permissão específica e usuários inativos, garantindo ausência de mutações nos bloqueios. Criação/edição de tipos não são adicionadas nesta task.

## Seção de necessidades na avaliação

O formulário de criação/edição mostra a seção desde o início, com orientação para salvar a avaliação antes de adicionar registros vinculados. Exibe lista, situação ativa/inativa e formulário Tipo/Descrição/Prioridade/Status inicial. Adição exige perfil clínico e permissões `necessidades.create` + `avaliacoes.add_need`; erros de catálogo e de inclusão aparecem na seção. Após criar, novos salvamentos atualizam a mesma avaliação. Link para o detalhe permite acessar situação e histórico. Edição/exclusão de necessidades na interface continuam em tasks próprias.

## Frontend — Edição, exclusão e situação

No detalhe da avaliação, Médico/Enfermeiro com `necessidades.update` podem editar tipo, descrição e prioridade em formulário inline com salvar/cancelar, validação e erros por campo. Tipos ativos são oferecidos; o tipo histórico atual pode ser mantido mesmo inativo. Status e situação são somente leitura. Exclusão exige `necessidades.delete` e confirmação explícita, tratando a resposta 204 sem tentar ler JSON. Lista e contagem são atualizadas após sucesso; falhas preservam os dados exibidos. Inativação/reativação e consulta do histórico permanecem integradas, com ações bloqueadas durante edição ou requisição em andamento.
