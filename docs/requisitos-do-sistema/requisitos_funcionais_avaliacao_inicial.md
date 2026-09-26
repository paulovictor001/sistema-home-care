# Requisitos Funcionais — Avaliação Inicial

## RF-AVL-001 — Criar Avaliação Inicial

O sistema deve permitir que médicos e enfermeiros criem uma Avaliação Inicial vinculada a um paciente.

## RF-AVL-002 — Validar campos obrigatórios

O sistema deve impedir o salvamento da avaliação quando algum campo obrigatório estiver vazio.

Campos obrigatórios:

- Paciente;
- Profissional responsável;
- Data;
- Hora;
- Tipo;
- Motivo da solicitação;
- Queixa principal.

## RF-AVL-003 — Selecionar tipo de avaliação

O sistema deve permitir selecionar o tipo de avaliação.

No escopo atual, o único tipo disponível é:

- Avaliação inicial.

## RF-AVL-004 — Registrar origem da solicitação

O sistema deve permitir selecionar a origem da solicitação entre:

- Família;
- Médico;
- Hospital;
- Clínica;
- Outro.

## RF-AVL-005 — Definir profissional responsável

O sistema deve permitir associar um profissional responsável à avaliação.

## RF-AVL-006 — Alterar profissional responsável

O sistema deve permitir alterar o profissional responsável.

Essa alteração também deve estar disponível ao gerente.

## RF-AVL-007 — Registrar dados da avaliação

O sistema deve permitir registrar as informações definidas para a avaliação, incluindo:

- Motivo da solicitação;
- Queixa principal;
- Descrição inicial da necessidade;
- Data de início da necessidade;
- Anamnese;
- HDA;
- Situação atual;
- Observações;
- Informações relevantes;
- Conclusão;
- Recomendação/conduta;
- Observações administrativas.

## RF-AVL-008 — Criar necessidade

O sistema deve permitir criar uma ou mais necessidades dentro da tela da avaliação.

Cada necessidade deve ficar vinculada à avaliação que a originou.

## RF-AVL-009 — Registrar dados da necessidade

Cada necessidade deve permitir registrar:

- Tipo;
- Descrição;
- Prioridade;
- Status.

## RF-AVL-010 — Registrar prioridade

O sistema deve permitir selecionar a prioridade da necessidade entre:

- Baixa;
- Média;
- Alta;
- Urgente.

## RF-AVL-011 — Definir status inicial da necessidade

Ao criar uma necessidade, o sistema deve registrá-la inicialmente com o status:

- Identificada.

## RF-AVL-012 — Associar recursos

O sistema deve permitir associar recursos já cadastrados à avaliação.

Para cada recurso, deve permitir informar:

- Recurso;
- Quantidade;
- Observação.

## RF-AVL-013 — Consultar avaliação

O sistema deve permitir que gerente, médico e enfermeiro visualizem as avaliações às quais possuem acesso.

## RF-AVL-014 — Editar avaliação

O sistema deve permitir que médicos e enfermeiros editem avaliações.

## RF-AVL-015 — Manter histórico

O sistema deve manter todas as avaliações do paciente como registros independentes.

Uma nova avaliação não deve sobrescrever uma avaliação anterior.

## RF-AVL-016 — Não possuir status de avaliação

O sistema não deve exigir um status próprio para a Avaliação Inicial neste momento.

## RF-AVL-017 — Restringir interpretação automática

O sistema deve armazenar e apresentar as informações clínicas registradas, sem realizar interpretação automática desses dados no MVP.

## RF-AVL-018 — Preparar integração futura com plano de cuidados

A estrutura da avaliação e das necessidades deve permitir que essas informações sejam utilizadas posteriormente pelo plano de cuidados, sem antecipar regras de planejamento ainda não definidas.

## RF-AVL-019 — Controle de acesso

O sistema deve aplicar as seguintes permissões:

| Ação | Perfil |
|---|---|
| Criar avaliação | Médico, Enfermeiro |
| Visualizar avaliação | Gerente, Médico, Enfermeiro |
| Editar avaliação | Médico, Enfermeiro |
| Alterar profissional responsável | Médico, Enfermeiro, Gerente |

## RF-AVL-020 — Manter compatibilidade com histórico

As alterações realizadas em uma avaliação não devem eliminar o registro histórico de avaliações anteriores do paciente.

## Pendências funcionais

Ainda não devem ser implementadas regras não definidas para:

- reavaliação;
- fluxo de escala;
- agendamento;
- visita;
- atendimento;
- evolução;
- estoque/farmácia/logística;
- fluxo completo do plano de cuidados;
- evolução dos status das necessidades;
- regras clínicas específicas ainda não validadas.
