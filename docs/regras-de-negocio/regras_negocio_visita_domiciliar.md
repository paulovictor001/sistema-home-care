# Regras de Negócio — Visita Domiciliar

## 1. Objetivo
A Visita Domiciliar representa o evento de atendimento domiciliar planejado. Registra o que aconteceu com o evento agendado, sem concentrar os detalhes clínicos, que pertencem ao processo de Registro do Atendimento.

A Visita responde: **O atendimento programado aconteceu?**

## 2. Permissões
- **RN-VIS-01:** Gerente e usuários com `visitas.view` podem visualizar a visita.
- **RN-VIS-02:** Gerente e usuários com `visitas.update` podem alterar campos operacionais editáveis.
- **RN-VIS-03:** Gerente e usuários com `visitas.cancel` podem cancelar visita elegível.
- **RN-VIS-04:** Cada ação de status exige sua permissão granular (`visitas.confirm`, `visitas.cancel`, `visitas.start`, `visitas.finish` ou `visitas.not_realized`). A categoria Gerente recebe todas inicialmente; outras categorias podem recebê-las pela administração de permissões.
- **RN-VIS-05:** Somente o profissional responsável vinculado à ocorrência pode iniciar ou concluir a própria visita, e deve possuir a permissão granular correspondente. A conclusão ocorre pelo fluxo de Atendimento.

## 3. Origem e vínculos
- **RN-VIS-06:** A visita nasce de um agendamento; não é criada como evento independente.
- **RN-VIS-07:** Mantém vínculo com paciente, profissional, plano de cuidados, item do plano e escala.
- **RN-VIS-08:** O profissional é herdado do agendamento e não pode ser trocado diretamente na visita.
- **RN-VIS-09:** Alterações de profissional ocorrem pela Escala; alterações de data e horário ocorrem pelo Agendamento.

## 4. Dados apresentados
- **RN-VIS-10:** A tela apresenta paciente, endereço, data, horário, profissional, tipo de atendimento, plano relacionado, cuidados previstos e observações importantes.
- **RN-VIS-11:** O endereço utilizado é o identificado no agendamento.
- **RN-VIS-12:** A visita não altera os dados estruturais do paciente, plano, escala ou profissional.
- **RN-VIS-13:** A visita não armazena os detalhes clínicos completos do atendimento.

## 5. Início
- **RN-VIS-14:** Somente uma visita CONFIRMADA pode ser iniciada.
- **RN-VIS-15:** Ao iniciar, o status muda de CONFIRMADA para EM_ATENDIMENTO.
- **RN-VIS-16:** O sistema registra automaticamente o horário de início.
- **RN-VIS-17:** O início identifica o profissional responsável.

## 6. Finalização
- **RN-VIS-18:** Somente uma visita EM_ATENDIMENTO pode ser finalizada como REALIZADA.
- **RN-VIS-19:** Ao finalizar, o status muda para REALIZADA.
- **RN-VIS-20:** Antes da finalização, o registro do atendimento necessário deve estar realizado.
- **RN-VIS-21:** Uma visita REALIZADA não retorna para AGENDADA ou CONFIRMADA.

## 7. Visita não realizada
- **RN-VIS-22:** Quando o atendimento não acontecer, a visita é encerrada como NÃO_REALIZADA.
- **RN-VIS-23:** A justificativa da não realização é obrigatória.
- **RN-VIS-24:** No MVP, a justificativa é texto livre.
- **RN-VIS-25:** Uma visita NÃO_REALIZADA não é tratada como atendimento realizado.

## 8. Cancelamento e reagendamento
- **RN-VIS-26:** Uma visita AGENDADA ou CONFIRMADA pode ser cancelada por usuário autorizado.
- **RN-VIS-27:** O cancelamento preserva o registro da visita.
- **RN-VIS-28:** Uma visita CANCELADA não pode ser iniciada ou finalizada como REALIZADA.
- **RN-VIS-29:** O reagendamento ocorre pelo processo de Agendamento, não pela tela da Visita.

## 9. Separação dos processos
- **RN-VIS-30:** A Visita representa o evento planejado/agendado.
- **RN-VIS-31:** O Registro do Atendimento representa aquilo que efetivamente aconteceu.
- **RN-VIS-32:** A Evolução representa o acompanhamento do estado do paciente.
- **RN-VIS-33:** A Visita não implementa regras clínicas ou interpretações automáticas.

## 10. Histórico
- **RN-VIS-34:** Alterações relevantes registram usuário responsável e data/hora.
- **RN-VIS-35:** Visitas canceladas e não realizadas permanecem no histórico.
- **RN-VIS-36:** Registros históricos não são fisicamente apagados quando isso comprometer o histórico operacional.

## 11. Escopo do MVP
- **RN-VIS-37:** Recursos necessários, checklist e contato do responsável são opcionais e não obrigatórios no MVP.
- **RN-VIS-38:** Não haverá tabela configurável de motivos de não realização; a justificativa será texto livre.
- **RN-VIS-39:** Não haverá reagendamento dentro da Visita.
- **RN-VIS-40:** O MVP preserva a separação entre Visita, Atendimento e Evolução.
- **RN-VIS-41:** A ocorrência persistida pelo Agendamento é a própria `Visit`; não existe uma segunda entidade de visita.
- **RN-VIS-42:** O início registra instante e profissional responsável. A conclusão registra instante e profissional responsável após existir Atendimento válido.
- **RN-VIS-43:** O Atendimento necessário contém descrição obrigatória dos cuidados/procedimentos realizados; observações adicionais são opcionais.
- **RN-VIS-44:** A relação com o item do Plano aponta para `CarePlanNeed`; o item da Escala continua registrado separadamente para identificar a atribuição operacional.
- **RN-VIS-45:** O histórico operacional preserva ator, data/hora, evento e valores anteriores/novos; visitas e históricos não são apagados fisicamente.

## 12. Fluxo consolidado
Plano de Cuidados → Escala → Agendamento → Visita → Atendimento → Evolução.

- Plano: o que o paciente precisa.
- Escala: quem realizará.
- Agendamento: quando.
- Visita: se o evento aconteceu.
- Atendimento: o que foi feito.
- Evolução: como o paciente está evoluindo.
