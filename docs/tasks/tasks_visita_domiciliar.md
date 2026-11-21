# Tasks — Visita Domiciliar

## 1. Modelagem
- [ ] Revisar o model `visits` conforme o modelo definido no processo de Agendamento.
- [ ] Garantir relacionamentos com paciente, plano, item do plano, escala, profissional e endereço.
- [ ] Garantir campos de data, horário, tipo, status e observações.
- [ ] Garantir campos necessários para rastrear o início da visita.
- [ ] Garantir armazenamento da justificativa de não realização.
- [ ] Avaliar campos de auditoria de criação e atualização.

## 2. Status e transições
- [ ] Implementar AGENDADA, CONFIRMADA, EM_ATENDIMENTO, REALIZADA, CANCELADA e NÃO_REALIZADA.
- [ ] Implementar AGENDADA → CONFIRMADA.
- [ ] Implementar CONFIRMADA → EM_ATENDIMENTO.
- [ ] Implementar EM_ATENDIMENTO → REALIZADA.
- [ ] Implementar transições permitidas para CANCELADA.
- [ ] Implementar transições permitidas para NÃO_REALIZADA.
- [ ] Impedir transições inválidas.

## 3. Permissões
- [ ] Configurar permissão de visualização.
- [ ] Configurar permissão de alteração.
- [ ] Configurar permissão de cancelamento.
- [ ] Configurar permissões para ações de status.
- [ ] Garantir que o profissional responsável possa iniciar e finalizar a própria visita conforme as regras.
- [ ] Testar permissões por usuário.

## 4. Tela de detalhes
- [ ] Criar tela de detalhes da visita.
- [ ] Exibir paciente, endereço, data, horário e profissional.
- [ ] Exibir tipo de atendimento e plano relacionado.
- [ ] Exibir cuidados previstos e observações.
- [ ] Exibir status atual.
- [ ] Exibir informações da escala e do agendamento relacionados.

## 5. Início
- [ ] Criar ação “Iniciar visita”.
- [ ] Permitir a ação somente para visita CONFIRMADA.
- [ ] Alterar status para EM_ATENDIMENTO.
- [ ] Registrar automaticamente o horário de início.
- [ ] Registrar o profissional responsável pelo início.
- [ ] Impedir início de visita CANCELADA ou NÃO_REALIZADA.
- [ ] Testar início autorizado e tentativas em estados inválidos.

## 6. Integração com Atendimento
- [ ] Criar acesso ao Registro do Atendimento a partir da visita.
- [ ] Vincular o registro de atendimento à visita.
- [ ] Garantir consistência de paciente e profissional entre visita e atendimento.
- [ ] Impedir finalização como REALIZADA sem o atendimento necessário.
- [ ] Testar o fluxo Visita → Atendimento.

## 7. Finalização
- [ ] Criar ação “Finalizar visita”.
- [ ] Permitir finalização somente em EM_ATENDIMENTO.
- [ ] Validar existência do registro de atendimento.
- [ ] Alterar status para REALIZADA.
- [ ] Registrar data/hora da finalização.
- [ ] Impedir retorno para AGENDADA ou CONFIRMADA.
- [ ] Testar finalização com e sem registro de atendimento.

## 8. Não realização
- [ ] Criar ação “Não realizada”.
- [ ] Permitir a ação para AGENDADA e CONFIRMADA.
- [ ] Exigir justificativa.
- [ ] Armazenar justificativa.
- [ ] Alterar status para NÃO_REALIZADA.
- [ ] Impedir início ou finalização posterior.
- [ ] Testar obrigatoriedade da justificativa.

## 9. Cancelamento
- [ ] Criar ação de cancelamento.
- [ ] Permitir cancelamento para AGENDADA e CONFIRMADA.
- [ ] Preservar o registro após cancelamento.
- [ ] Impedir início e finalização de visita cancelada.
- [ ] Testar permissões de cancelamento.

## 10. Integração com Agendamento e Escala
- [ ] Garantir que a visita tenha origem em agendamento.
- [ ] Garantir que o profissional venha da escala/agendamento.
- [ ] Não permitir alteração direta do profissional na visita.
- [ ] Direcionar alterações de data/horário para o Agendamento.
- [ ] Preservar vínculos históricos entre escala, agendamento e visita.

## 11. Histórico e auditoria
- [ ] Registrar usuário nas alterações relevantes.
- [ ] Registrar data/hora das alterações relevantes.
- [ ] Preservar visitas canceladas e não realizadas.
- [ ] Impedir exclusão física que comprometa o histórico.

## 12. Interface e testes
- [ ] Implementar estados de carregamento, vazio, erro e sucesso.
- [ ] Implementar mensagens de validação.
- [ ] Implementar confirmação para ações relevantes.
- [ ] Testar todos os fluxos válidos de status.
- [ ] Testar bloqueio de estados inválidos.
- [ ] Testar permissões e preservação do histórico.
- [ ] Executar teste ponta a ponta desde Agendamento até Atendimento.

## 13. Fora do MVP
- [ ] Não implementar checklist configurável.
- [ ] Não implementar catálogo de motivos de não realização.
- [ ] Não implementar reagendamento dentro da Visita.
- [ ] Não implementar troca direta de profissional.
- [ ] Não implementar regras clínicas automáticas.
