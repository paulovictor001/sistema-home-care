# Tasks — Processo de Avaliação Inicial

## 1. Modelagem

### TASK-AVL-MOD-001 — Modelar PatientAssessment

Criar/modelar a entidade de avaliação vinculada ao paciente.

Dados principais:

- patient_id;
- professional_id;
- assessment_type;
- assessment_date;
- assessment_time;
- request_origin;
- administrative_observations;
- request_reason;
- chief_complaint;
- initial_need_description;
- need_start_date;
- anamnesis;
- hda;
- current_condition;
- observations;
- relevant_information;
- conclusion;
- recommendation;
- created_at;
- updated_at.

### TASK-AVL-MOD-002 — Modelar CareNeed

Criar/modelar a entidade de necessidade vinculada à avaliação.

Dados:

- assessment_id;
- type;
- description;
- priority;
- status;
- created_at.

### TASK-AVL-MOD-003 — Modelar associação de recursos

Criar a estrutura necessária para associar recursos já cadastrados à avaliação, contemplando:

- recurso;
- quantidade;
- observação.

### TASK-AVL-MOD-004 — Restringir tipo de avaliação

Configurar o domínio inicial de tipo de avaliação para:

- Avaliação inicial.

### TASK-AVL-MOD-005 — Configurar origem da solicitação

Configurar os valores:

- Família;
- Médico;
- Hospital;
- Clínica;
- Outro.

### TASK-AVL-MOD-006 — Configurar prioridade da necessidade

Configurar os valores:

- Baixa;
- Média;
- Alta;
- Urgente.

### TASK-AVL-MOD-007 — Configurar status inicial da necessidade

Definir o status inicial de uma nova necessidade como:

- Identificada.

### Implementação — TA-40/42/43/44/45/46 (modelagem)

Novo app `assessments` (`patient_assessments`, `care_needs`,
`resources`, `assessment_resources` + `NeedType` existente em
`patients`):
- `PatientAssessment` (TA-40): FK `patient` PROTECT (histórico
  RN-AVL-006), `professional` FK PROTECT nullable (obrigatoriedade no
  endpoint, TASK-AVL-BE-002), `assessment_type` default "Avaliação
  inicial" (TA-43), `request_origin` livre com `TODO(TA-41)` — domínio
  configurado por outro responsável para não conflitar no merge; sem
  campo status (RN-AVL-010).
- `CareNeed` (TA-42): FK `assessment` CASCADE + `need_type` FK PROTECT
  p/ `NeedType` (histórico preservado), `description`/`priority`
  obrigatórias, `status` default `Identificada` (TA-46).
- `Resource` stub mínimo + `AssessmentResource` (TA-44):
  `resource` FK PROTECT + `quantity` ≥ 1 + `observation`.
- `NeedPriority` Baixa/Média/Alta/Urgente (TA-45).
- Cobertura `assessments/tests.py` (18 testes). Regressão:
  `python manage.py test assessments patients accounts --noinput`.

## 2. Backend

### TASK-AVL-BE-001 — Criar avaliação

Implementar serviço/API para criação de Avaliação Inicial.

### TASK-AVL-BE-002 — Validar obrigatórios

Implementar validação dos campos obrigatórios:

- paciente;
- profissional responsável;
- data;
- hora;
- tipo;
- motivo da solicitação;
- queixa principal.

### TASK-AVL-BE-003 — Consultar avaliação

Implementar consulta de uma avaliação e seus dados relacionados.

### TASK-AVL-BE-004 — Listar histórico

Implementar consulta das avaliações vinculadas a um paciente, preservando múltiplos registros.

### TASK-AVL-BE-005 — Editar avaliação

Implementar atualização dos dados da avaliação para médicos e enfermeiros.

### TASK-AVL-BE-006 — Alterar profissional responsável

Implementar alteração do profissional responsável, permitindo também essa operação ao gerente.

### TASK-AVL-BE-007 — Criar necessidades

Implementar criação de necessidades dentro de uma avaliação.

### TASK-AVL-BE-008 — Associar recursos

Implementar associação de recursos existentes à avaliação com quantidade e observação.

## 3. Autorização

### TASK-AVL-AUTH-001 — Permissão de criação

Permitir criação somente para:

- Médico;
- Enfermeiro.

### TASK-AVL-AUTH-002 — Permissão de visualização

Permitir visualização para:

- Gerente;
- Médico;
- Enfermeiro.

### TASK-AVL-AUTH-003 — Permissão de edição

Permitir edição para:

- Médico;
- Enfermeiro.

### TASK-AVL-AUTH-004 — Permissão para alterar responsável

Permitir alteração do profissional responsável para:

- Médico;
- Enfermeiro;
- Gerente.

## 4. Frontend

### TASK-AVL-FE-001 — Tela de avaliação

Criar tela para criação, visualização e edição da Avaliação Inicial.

### TASK-AVL-FE-002 — Formulário obrigatório

Implementar os campos obrigatórios e suas validações visuais.

### TASK-AVL-FE-003 — Origem da solicitação

Implementar seleção da origem:

- Família;
- Médico;
- Hospital;
- Clínica;
- Outro.

### TASK-AVL-FE-004 — Necessidades

Implementar seção para inclusão de necessidades dentro da avaliação.

Campos:

- Tipo;
- Descrição;
- Prioridade;
- Status.

### TASK-AVL-FE-005 — Prioridade

Implementar seleção entre:

- Baixa;
- Média;
- Alta;
- Urgente.

### TASK-AVL-FE-006 — Recursos

Implementar seção para vinculação de recursos já cadastrados, com:

- Recurso;
- Quantidade;
- Observação.

### TASK-AVL-FE-007 — Histórico

Implementar visualização das avaliações anteriores do paciente.

## 5. Validações e testes

### TASK-AVL-TEST-001 — Testar criação válida

Validar criação de avaliação com todos os campos obrigatórios preenchidos.

### TASK-AVL-TEST-002 — Testar campos obrigatórios

Validar bloqueio do salvamento quando qualquer campo obrigatório estiver ausente.

### TASK-AVL-TEST-003 — Testar múltiplas avaliações

Validar que um paciente pode possuir várias avaliações sem sobrescrever registros anteriores.

### TASK-AVL-TEST-004 — Testar permissões

Validar permissões de criação, visualização, edição e alteração do profissional responsável.

### TASK-AVL-TEST-005 — Testar necessidades

Validar criação de necessidade vinculada à avaliação, incluindo prioridade e status inicial.

### TASK-AVL-TEST-006 — Testar recursos

Validar associação de recurso existente com quantidade e observação.

## 6. Pendências que não devem virar implementação ainda

Não criar tasks de implementação para:

- reavaliação;
- regras de escala;
- regras de agendamento;
- regras de visita;
- regras de atendimento;
- regras de evolução;
- interpretação automática de informações clínicas;
- regras de estoque/farmácia/logística;
- regras ainda não definidas do plano de cuidados;
- evolução futura do status das necessidades;
- detalhamento clínico que ainda dependa de validação com profissionais.

## 7. Princípio de organização das tasks

As tasks devem representar funcionalidades e componentes técnicos do processo.

Não criar uma task separada para cada campo da avaliação. Os campos devem ser tratados dentro das funcionalidades de modelagem, formulário, validação, backend e autorização correspondentes.
