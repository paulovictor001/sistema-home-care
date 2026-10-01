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
- [ ] Implementar consulta.
- [ ] Implementar edição.
- [ ] Implementar exclusão.
- [ ] Implementar inativação.
- [ ] Preservar histórico na inativação.
- [ ] Implementar autorização por perfil.

## 4. Frontend — Necessidades
- [ ] Criar seção de necessidades associada à avaliação.
- [ ] Exibir necessidades existentes.
- [ ] Criar formulário com Tipo, Descrição, Prioridade e Status.
- [ ] Disponibilizar somente tipos ativos para novos cadastros.
- [ ] Disponibilizar prioridades definidas.
- [ ] Exibir status inicial `Identificada`.
- [ ] Implementar edição conforme perfil.
- [ ] Implementar exclusão conforme perfil.
- [ ] Implementar inativação conforme perfil.
- [ ] Exibir informações históricas necessárias.

## 5. Administração dos tipos
- [ ] Criar tela/área de manutenção dos tipos.
- [ ] Permitir criação e edição.
- [ ] Permitir ativação e inativação.
- [ ] Indicar estado ativo/inativo.
- [ ] Restringir a Gerente, Médico e Enfermeiro.

## 6. Autorização
- [ ] Autorizar Médico e Enfermeiro a criar.
- [ ] Autorizar Médico e Enfermeiro a visualizar.
- [ ] Autorizar Médico e Enfermeiro a editar.
- [ ] Autorizar Médico e Enfermeiro a excluir.
- [ ] Autorizar Gerente, Médico e Enfermeiro a inativar.
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
- [ ] Testar inativação e preservação do histórico.
- [ ] Testar CRUD dos tipos.
- [x] Testar ativação/inativação de tipos.
- [ ] Testar que tipo inativo não aparece em novos cadastros.
- [ ] Testar preservação de vínculos históricos (depende do futuro `CareNeed`).
- [ ] Testar permissões por perfil.

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
