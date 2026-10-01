# Tasks — Escala

## Modelagem
- [ ] Criar entidade `care_scales`.
- [ ] Relacionar paciente, Plano de Cuidados, item/necessidade e profissional.
- [ ] Implementar início/fim, status, frequência e observações.
- [ ] Estruturar histórico de substituições e auditoria.

## Permissões
- [ ] Criar permissões de criar, editar, visualizar, excluir e alterar status.
- [ ] Aplicar permissões às ações da escala.

## Backend
- [ ] Implementar criação e edição.
- [ ] Validar paciente e Plano de Cuidados.
- [ ] Validar período.
- [ ] Adicionar/remover necessidades.
- [ ] Adicionar/remover/substituir profissionais.
- [ ] Validar profissional ativo e compatibilidade.
- [ ] Permitir múltiplos profissionais por necessidade.
- [ ] Permitir ajuste da frequência para mais ou para menos.
- [ ] Registrar motivo de frequência quando informado.
- [ ] Implementar os quatro status e suas transições.
- [ ] Validar condições para ativação.
- [ ] Considerar disponibilidade e região.
- [ ] Impedir necessidade removida do Plano de permanecer na escala.
- [ ] Impedir novos agendamentos para escala encerrada.
- [ ] Registrar auditoria e histórico de substituições.

## Frontend
- [ ] Criar listagem, criação e edição.
- [ ] Exibir paciente, Plano, necessidades, profissionais, período, frequência e status.
- [ ] Permitir gerenciar necessidades e profissionais.
- [ ] Exibir observações e histórico de substituições.
- [ ] Aplicar permissões.

## Testes
- [ ] Testar permissões.
- [ ] Testar compatibilidade e profissional inativo.
- [ ] Testar múltiplos profissionais e substituição.
- [ ] Testar histórico.
- [ ] Testar frequência.
- [ ] Testar período e status.
- [ ] Testar ativação.
- [ ] Testar escala encerrada.
- [ ] Testar auditoria.
