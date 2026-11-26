# Tasks — Escala

> Atualizado em 22/11/2026 após auditoria do processo. As tasks concluídas refletem código existente e validado; itens de integração futura ou validação ainda pendente permanecem abertos. Evidências detalhadas: `docs/auditoria/auditoria_processos/02_05_ESCALA.md`.

## Modelagem
- [x] Criar entidade `care_scales` e relacionar paciente e Plano de Cuidados.
- [x] Relacionar necessidades do plano e profissionais por necessidade.
- [x] Implementar período, status, frequência e observações.
- [x] Estruturar auditoria e histórico de substituições.
- [x] Manter `ProfessionalPlanningInfo` como informação de apoio da Escala.

## Permissões
- [x] Criar permissões de criar, editar, visualizar, excluir e alterar status.
- [x] Aplicar permissões às ações da escala, incluindo superusuário.

## Backend
- [x] Implementar criação, edição, consulta e exclusão lógica.
- [x] Validar paciente, Plano de Cuidados Ativo e período.
- [x] Adicionar/remover necessidades do plano.
- [x] Adicionar/remover/substituir profissionais.
- [x] Validar profissional ativo e profissão compatível.
- [x] Permitir múltiplos profissionais por necessidade.
- [x] Permitir ajuste da frequência para mais ou para menos.
- [x] Permitir observação sem frequência configurada e motivo opcional (frequência e período devem ser informados juntos; ativação continua exigindo frequência).
- [x] Implementar os quatro status e suas transições.
- [x] Exigir necessidades com frequência e profissionais compatíveis para ativação.
- [x] Exibir disponibilidade e região como informações, sem bloqueio.
- [x] Impedir necessidade removida do Plano de permanecer na escala.
- [ ] Impedir novos agendamentos para escala não ativa quando o módulo Agendamento existir; contrato de integração está implementado, sem consumidor.
- [x] Impedir exclusão de escala Ativa; deve ser encerrada/suspensa antes.
- [x] Registrar auditoria e histórico de substituições.

## Frontend
- [x] Criar listagem, criação, detalhe e edição.
- [x] Exibir paciente, Plano, necessidades, profissionais, período, frequência e status.
- [x] Permitir gerenciar necessidades e profissionais.
- [x] Exibir observações, histórico de substituições e auditoria com rótulos e dados anteriores/novos.
- [x] Aplicar permissões e disponibilizar atalho para escalas no detalhe do paciente.

## Testes e validação
- [x] Testar permissões, compatibilidade e profissional inativo.
- [x] Testar múltiplos profissionais e substituição.
- [x] Testar histórico e auditoria.
- [x] Testar frequência, período, status e ativação.
- [x] Testar regras de plano ativo e exclusão de escala ativa.
- [x] Executar suíte backend completa `care_scales` + `accounts` (83 testes aprovados em 22/11/2026; fixtures de auditoria e seed demonstrativo ajustadas às regras consolidadas).
- [x] Formalizar e executar testes da lib e fluxo frontend da Escala via Playwright (3 casos unitários; fluxo e2e; `npm run build`).

## Decisões consolidadas
- Exigir Plano de Cuidados Ativo para criar/ativar a escala.
- Bloquear exclusão de escala Ativa; encerrar ou suspender antes.
- Disponibilidade e região são informativas.
- Observação pode ser salva sem frequência.
- O catálogo de planos mantém todos os planos visíveis conforme a implementação atual.
- `ProfessionalPlanningInfo` permanece dentro do processo Escala.
- A integração com Agendamento fica pendente até existir o processo consumidor.
# Áreas atendidas e comparação regional

- [x] Selecionar regiões cadastradas no planejamento do profissional e preservar valores antigos para consulta.
- [x] Exibir correspondência, divergência ou falta de informação como apoio humano, sem bloqueio de atribuição ou agendamento.
