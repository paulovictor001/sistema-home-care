# Requisitos Funcionais — Visita Domiciliar

## 1. Objetivo
Implementar a Visita Domiciliar como registro operacional do evento de atendimento planejado, mantendo os dados clínicos no processo de Registro do Atendimento.

## 2. Visualização
- **RF-VIS-01:** O sistema deve permitir visualizar uma visita.
- **RF-VIS-02:** A tela deve apresentar paciente, endereço, data, horário, profissional, tipo de atendimento, plano relacionado, cuidados previstos e observações importantes.
- **RF-VIS-03:** O sistema deve exibir o status atual.
- **RF-VIS-04:** O sistema deve identificar a escala e o agendamento relacionados.

## 3. Origem
- **RF-VIS-05:** O sistema deve criar a visita a partir de um agendamento.
- **RF-VIS-06:** Deve manter os vínculos com paciente, plano, item do plano, escala, profissional e endereço.
- **RF-VIS-07:** Não deve permitir selecionar outro profissional diretamente na visita.

## 4. Início
- **RF-VIS-08:** Disponibilizar a ação “Iniciar visita” quando o status for CONFIRMADA.
- **RF-VIS-09:** Ao iniciar, alterar o status para EM_ATENDIMENTO.
- **RF-VIS-10:** Registrar automaticamente a data/hora de início.
- **RF-VIS-11:** Identificar o profissional responsável pelo início.
- **RF-VIS-12:** Impedir o início de visitas CANCELADAS ou NÃO_REALIZADAS.

## 5. Integração com Atendimento
- **RF-VIS-13:** A partir de uma visita EM_ATENDIMENTO, permitir acessar o Registro do Atendimento.
- **RF-VIS-14:** Exigir o registro do atendimento necessário antes da finalização como REALIZADA.
- **RF-VIS-15:** Manter o Registro do Atendimento separado do registro da Visita.

## 6. Finalização
- **RF-VIS-16:** Disponibilizar a ação “Finalizar visita” quando o status for EM_ATENDIMENTO.
- **RF-VIS-17:** Ao finalizar, alterar o status para REALIZADA.
- **RF-VIS-18:** Impedir a finalização como REALIZADA quando o atendimento necessário não estiver registrado.
- **RF-VIS-19:** Impedir o retorno de uma visita REALIZADA para estados anteriores.

## 7. Não realização
- **RF-VIS-20:** Permitir registrar que uma visita não foi realizada.
- **RF-VIS-21:** Disponibilizar a ação para visitas AGENDADAS ou CONFIRMADAS.
- **RF-VIS-22:** Exigir justificativa antes de alterar o status para NÃO_REALIZADA.
- **RF-VIS-23:** Armazenar a justificativa.
- **RF-VIS-24:** Impedir que uma visita NÃO_REALIZADA seja iniciada ou finalizada como REALIZADA.

## 8. Cancelamento
- **RF-VIS-25:** Permitir cancelar visitas AGENDADAS ou CONFIRMADAS para usuários autorizados.
- **RF-VIS-26:** Preservar a visita após o cancelamento.
- **RF-VIS-27:** Impedir o início de uma visita CANCELADA.
- **RF-VIS-28:** Impedir a finalização de uma visita CANCELADA como REALIZADA.

## 9. Alterações
- **RF-VIS-29:** Respeitar as permissões configuradas para alteração.
- **RF-VIS-30:** Não permitir alterar diretamente o profissional responsável.
- **RF-VIS-31:** Direcionar alterações de profissional para a Escala.
- **RF-VIS-32:** Direcionar alterações de data e horário para o Agendamento.

## 10. Histórico
- **RF-VIS-33:** Preservar visitas canceladas e não realizadas.
- **RF-VIS-34:** Registrar usuário e data/hora nas alterações relevantes.
- **RF-VIS-35:** Não excluir fisicamente registros históricos de forma que comprometa a rastreabilidade.

## 11. Modelo mínimo
A implementação utiliza o registro `visits` já definido no processo de Agendamento, contendo:
- `id`;
- `care_plan_id`;
- `care_plan_item_id`;
- `care_scale_id`;
- `patient_id`;
- `professional_id`;
- `patient_address_id`;
- `scheduled_date`;
- `start_time`;
- `end_time`;
- `visit_type`;
- `status`;
- `notes`;
- `created_at`;
- `updated_at`.

Os horários operacionais de início e a justificativa de não realização devem ser armazenados conforme a implementação do fluxo.

## 12. Fora do escopo do MVP
- Checklist configurável.
- Catálogo de motivos de não realização.
- Reagendamento dentro da Visita.
- Alteração direta do profissional.
- Registro clínico completo dentro da Visita.
- Interpretação clínica automática.

## 13. Decisões consolidadas para implementação
- A ocorrência criada pelo Agendamento é a própria entidade `Visit`; não haverá entidade duplicada.
- A relação do Plano será com `CarePlanNeed`; a relação de atribuição da Escala permanece registrada separadamente.
- Ações terão permissões granulares `visitas.view`, `visitas.update`, `visitas.confirm`, `visitas.cancel`, `visitas.start`, `visitas.finish` e `visitas.not_realized`. Gerente recebe todas inicialmente; demais categorias podem recebê-las via administração.
- Confirmação, cancelamento e não realização exigem a permissão granular correspondente. Iniciar e concluir são permitidos somente ao profissional responsável da própria visita, com a permissão da ação.
- Início e conclusão guardam timestamp e profissional responsável; conclusão ocorre somente após Atendimento válido.
- O Atendimento mínimo exige descrição dos cuidados/procedimentos efetivamente realizados; observações adicionais são opcionais. Ele é vinculado à visita e mantém paciente/profissional coerentes.
- Alterações relevantes preservam ator, instante, evento e valores anterior/novo. Registros históricos não são apagados.
