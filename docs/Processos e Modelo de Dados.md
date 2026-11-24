# Documentação de Processos e Modelo de Dados

## 1. Objetivo do documento

Este documento tem como objetivo aprofundar os processos principais do sistema de atendimento domiciliar e servir como base para o desenvolvimento do software.

A documentação organiza cada processo de forma cronológica, partindo do cadastro do paciente e avançando até a definição do plano de cuidados.

Para cada processo, a documentação deve responder principalmente a quatro perguntas:

1. **O que é esse processo?**
2. **Em que momento ele acontece?**
3. **Quais informações são registradas ou utilizadas?**
4. **Quais dados e entidades precisam existir para suportar esse processo?**

O objetivo não é definir toda a implementação técnica, mas fornecer uma base funcional e de dados para que os desenvolvedores consigam transformar os processos em funcionalidades, endpoints, telas, regras de negócio e tarefas de desenvolvimento.

---

## 2. Como interpretar esta documentação

A documentação segue a ordem em que os processos acontecem dentro do sistema.

A lógica geral é:

```text
Solicitação de atendimento
        ↓
Cadastro do paciente
        ↓
Avaliação inicial
        ↓
Necessidades identificadas
        ↓
Plano de cuidados
        ↓
Escala / Agendamento
        ↓
Visita
        ↓
Atendimento
        ↓
Evolução
```

O detalhamento implementado inclui cadastro do paciente, avaliação, necessidades, plano de cuidados, escala e Agendamento. Agendamento persiste a ocorrência como `Visit`; as ações específicas de Visita e o Registro do Atendimento ainda estão em consolidação/implementação.

---

# 3. Visão geral do processo

O fluxo parte de uma solicitação de atendimento e evolui conforme as informações do paciente são coletadas e organizadas.

A ideia principal é evitar que todos os dados sejam concentrados em um único cadastro.

Cada etapa possui uma responsabilidade diferente:

| Processo | Pergunta principal |
|---|---|
| Cadastro do paciente | Quem é o paciente? |
| Avaliação | Qual é a situação atual e o que ele precisa? |
| Necessidades | Quais necessidades foram identificadas? |
| Plano de cuidados | Como a empresa vai atender essas necessidades? |
| Escala | Quem vai realizar o atendimento? |
| Agendamento | Quando e onde ele será realizado? |
| Visita | O atendimento programado aconteceu? |
| Atendimento | O que aconteceu durante a visita? |
| Evolução | O que foi observado no acompanhamento? |

Essa separação deve ser mantida também no modelo de dados, evitando que informações de processos diferentes sejam misturadas.

---

# 4. Processo 1 — Cadastro do paciente

## 4.1 Contexto

O cadastro do paciente é o primeiro registro permanente do sistema. Seu objetivo é identificar o paciente, localizar seu domicílio, registrar formas de contato e armazenar informações relativamente estáveis utilizadas durante a prestação do atendimento.

O cadastro deve existir antes da avaliação inicial e será utilizado pelos demais processos do sistema.

O cadastro responde à pergunta:

> **Quem é o paciente?**

---

## 4.2 Informações do paciente

### Dados principais

- `id`
- Nome completo
- Data de nascimento
- CPF
- RG
- Idade
- E-mail
- Telefone
- Sexo
- Endereço
- Foto
- Status (ativo/inativo)
- Médico/equipe responsável
- Doença/estado de saúde

### Observação sobre dados de saúde

Algumas informações de saúde são relativamente estáveis e podem fazer parte do contexto do paciente, como:

- Condições de saúde relevantes
- Alergias
- Restrições
- Necessidades especiais
- Observações importantes

Informações que representam uma situação clínica específica de determinado momento devem ser registradas no processo de avaliação, e não tratadas apenas como dados permanentes do cadastro.

---

## 4.3 Endereço

O endereço é uma informação importante porque o sistema trabalha com atendimento domiciliar.

### Dados do endereço

- CEP
- Estado
- Município
- Bairro
- Rua/Avenida
- Número
- Complemento
- Ponto de referência
- Região

### Exemplo

```text
Av. Almirante Barroso
Nº 1500
Marco
Belém - PA
CEP: 66000-000
Região: Marco
```

O campo **região** pode ser utilizado futuramente para organização de profissionais e visitas por área geográfica.

---

## 4.4 Entidades relacionadas

### `patients`

Representa o cadastro principal e permanente do paciente.

| Campo | Função |
|---|---|
| `id` | Identificador do paciente |
| `full_name` | Nome completo |
| `birth_date` | Data de nascimento |
| `cpf` | CPF |
| `rg` | RG |
| `age` | Idade |
| `email` | E-mail |
| `phone` | Telefone |
| `gender` | Sexo |
| `photo` | Foto, quando utilizada |
| `status` | Ativo/inativo |
| `responsible_professional_id` | Médico/equipe responsável, conforme modelagem definida |
| `health_condition_id` | Doença/estado de saúde, conforme modelagem definida |
| `created_at` | Data de criação |
| `updated_at` | Data de atualização |

### `patient_addresses`

Representa o endereço associado ao paciente.

| Campo | Função |
|---|---|
| `id` | Identificador |
| `patient_id` | Paciente |
| `zip_code` | CEP |
| `state` | Estado |
| `city` | Município |
| `neighborhood` | Bairro |
| `street` | Rua/Avenida |
| `number` | Número |
| `complement` | Complemento |
| `reference_point` | Ponto de referência |
| `region` | Região |

> A necessidade de permitir múltiplos endereços deve ser validada conforme o processo real da empresa. A estrutura acima já deixa o modelo preparado para essa possibilidade.

---

## 4.5 Saída do processo

Ao final do cadastro, o sistema deve possuir um paciente identificado e com as informações básicas necessárias para iniciar a avaliação.

```text
Cadastro do paciente
        ↓
Paciente identificado
        ↓
Pronto para avaliação
```

---

# 5. Processo 2 — Avaliação inicial

## 5.1 Contexto

A avaliação inicial é um processo relacionado ao paciente e realizado após existir uma solicitação de atendimento.

Ela faz parte do processo que transforma uma solicitação de atendimento em um plano de cuidados e, posteriormente, em uma escala de atendimento.

Seu objetivo é compreender a situação atual do paciente e determinar quais cuidados serão necessários.

A avaliação responde à pergunta:

> **Qual é a situação atual do paciente e o que ele precisa?**

---

## 5.2 Relação com o cadastro permanente

É importante separar dois tipos de informação.

### Cadastro permanente do paciente

Conjunto de informações relativamente estáveis utilizadas para:

- identificar o paciente;
- localizar seu domicílio;
- estabelecer contatos;
- fornecer informações básicas necessárias à prestação do atendimento;
- registrar condições de saúde relevantes, alergias, restrições, necessidades especiais e observações importantes.

### Informações da avaliação

São informações coletadas em uma avaliação específica e utilizadas para compreender a situação atual, identificar necessidades e definir o atendimento necessário.

Uma nova avaliação pode acontecer futuramente, portanto ela deve ser tratada como um registro próprio e não como simples campos do cadastro do paciente.

---

## 5.3 Identificação da avaliação

A avaliação pode registrar:

- Data da avaliação
- Hora
- Profissional responsável
- Tipo de avaliação
- Origem da solicitação
- Observações administrativas

### Exemplo

```text
Data: 24/09/2026
Profissional: Dr. Carlos
Tipo: Avaliação inicial
Origem: Solicitação da família
```

---

## 5.4 Motivo da solicitação

A avaliação precisa registrar por que o paciente está procurando atendimento domiciliar.

Dados possíveis:

- Motivo da solicitação
- Queixa principal
- Descrição inicial da necessidade
- Data de início da necessidade

### Exemplo

```text
Motivo:
Necessidade de acompanhamento domiciliar após alta hospitalar.

Queixa principal:
Dificuldade de locomoção.

Início:
Após alta hospitalar.
```

---

## 5.5 Anamnese

A anamnese é a coleta de informações sobre a situação do paciente por meio de entrevista.

Podem ser registrados:

- Sintomas
- Localização
- Tipo
- Início
- Duração
- Fatores que pioram
- Fatores que melhoram
- Irradiação
- Evolução
- Informações relatadas pelo paciente
- Informações relatadas pelo familiar/cuidador

### Exemplo

```text
Queixa:
Dor.

Localização:
Região lombar.

Início:
Há aproximadamente 5 dias.

Fatores de piora:
Movimentação.

Fatores de melhora:
Repouso.
```

### Regra para o MVP

O sistema não precisa interpretar automaticamente essas informações.

Seu papel inicial é permitir que um profissional autorizado registre, consulte e atualize os dados da avaliação.

---

## 5.6 HDA — História da Doença Atual

A HDA pode fazer parte da avaliação e busca documentar a história e a evolução do problema atual relacionado à queixa principal.

### Exemplo

```text
Queixa principal:
Dor lombar.

HDA:
Paciente relata início da dor há cinco dias,
com piora durante movimentação...
```

Para o MVP, pode ser utilizado um campo de texto para a HDA, evitando a criação inicial de dezenas de campos clínicos específicos.

```text
hda
[Campo de texto]
```

Essa abordagem mantém o sistema mais flexível enquanto o processo real ainda está sendo validado.

---

## 5.7 Situação atual

Depois da história relatada, o profissional pode registrar a situação observada durante a avaliação.

Exemplos de informações:

- Estado atual
- Observações
- Limitações identificadas
- Necessidades identificadas
- Informações relevantes

Essa etapa começa a responder:

> **O que esse paciente precisa?**

---

## 5.8 Necessidades identificadas

As necessidades identificadas fazem a ligação entre a avaliação e o plano de cuidados.

### Exemplo simplificado

```text
☑ Enfermagem
☑ Fisioterapia
☐ Nutrição
☐ Médico
```

Ou de forma mais detalhada:

```text
Necessidade:
Acompanhamento de enfermagem.

Frequência sugerida:
3 vezes por semana.
```

A avaliação identifica a necessidade. A definição de como essa necessidade será atendida acontece no plano de cuidados.

---

## 5.9 Recursos necessários

Durante a avaliação também pode ser identificado que o paciente necessita de recursos para receber o atendimento.

Exemplos:

- Medicamentos
- Materiais
- Equipamentos
- Kits
- Outros recursos

Esses recursos serão utilizados como entrada para o planejamento do atendimento e podem se relacionar posteriormente com processos de estoque, farmácia ou logística.

---

## 5.10 Conclusão da avaliação

No final da avaliação, o profissional responsável registra uma conclusão que consolida as informações relevantes para o próximo processo.

### Exemplo

```text
Conclusão da avaliação

Necessidades identificadas:
- Enfermagem
- Fisioterapia

Recursos:
- Equipamento X

Observações:
...

Recomendação/conduta:
...
```

A conclusão da avaliação funciona como uma das principais entradas para a criação do plano de cuidados.

---

## 5.11 Modelo de dados

### `patient_assessments`

Representa uma avaliação específica realizada para um paciente.

| Campo | Função |
|---|---|
| `id` | Identificador da avaliação |
| `patient_id` | Paciente avaliado |
| `professional_id` | Profissional responsável |
| `assessment_type` | Tipo de avaliação |
| `assessment_date` | Data da avaliação |
| `assessment_time` | Hora da avaliação |
| `request_origin` | Origem da solicitação |
| `administrative_observations` | Observações administrativas |
| `request_reason` | Motivo da solicitação |
| `chief_complaint` | Queixa principal |
| `initial_need_description` | Descrição inicial da necessidade |
| `need_start_date` | Data de início da necessidade |
| `anamnesis` | Dados da anamnese |
| `hda` | História da Doença Atual |
| `current_condition` | Situação atual |
| `observations` | Observações |
| `relevant_information` | Informações relevantes |
| `conclusion` | Conclusão da avaliação |
| `recommendation` | Recomendação/conduta |
| `created_at` | Data de criação |
| `updated_at` | Data de atualização |

> Os campos clínicos podem ser refinados posteriormente após validação com profissionais e com o processo real da empresa.

---

# 6. Processo 3 — Necessidades identificadas

## 6.1 Contexto

As necessidades identificadas representam o resultado estruturado da avaliação e servem de ponte entre a situação do paciente e o plano de cuidados.

A avaliação responde **o que está acontecendo**. As necessidades identificadas registram **o que precisa ser atendido**.

Exemplo:

```text
Avaliação
   ↓
Paciente apresenta dificuldade de locomoção
   ↓
Necessidade identificada
   ↓
Fisioterapia
```

Outra possibilidade:

```text
Avaliação
   ↓
Necessidade de acompanhamento de enfermagem
   ↓
Frequência sugerida: 3x por semana
```

---

## 6.2 Modelo de dados

### `care_needs`

Representa uma necessidade identificada durante uma avaliação.

| Campo | Função |
|---|---|
| `id` | Identificador |
| `assessment_id` | Avaliação que identificou a necessidade |
| `type` | Tipo da necessidade |
| `description` | Descrição |
| `priority` | Prioridade |
| `status` | Situação da necessidade |
| `created_at` | Data de criação |

A necessidade pode posteriormente ser relacionada a um ou mais itens do plano de cuidados.

---

# 7. Processo 4 — Plano de cuidados

## 7.1 Contexto

O plano de cuidados é o registro que organiza como as necessidades identificadas serão atendidas.

Ele define:

- quais cuidados o paciente necessita;
- quais profissionais estarão envolvidos;
- com que frequência os atendimentos devem ocorrer;
- quais recursos podem ser necessários;
- período de validade do plano;
- objetivo geral do atendimento.

O plano responde à pergunta:

> **Como a empresa vai atender as necessidades identificadas?**

A aprovação do plano ocorre quando o Médico ativa o rascunho. O paciente deve possuir plano ativo antes da criação de uma escala; essa verificação pertence ao processo de Escala.

---

## 7.2 O que inicia um plano de cuidados?

O plano normalmente nasce a partir da avaliação do paciente.

Exemplo:

```text
Avaliação

Paciente apresenta:
- necessidade de acompanhamento de enfermagem
- necessidade de fisioterapia
- necessidade de acompanhamento médico
- necessidade de determinado equipamento
```

A partir dessas informações, o responsável pela organização do atendimento pode criar:

```text
Plano de cuidados

Enfermagem → 3 vezes por semana
Fisioterapia → 2 vezes por semana
Médico → conforme necessidade
Equipamento → necessário
```

---

## 7.3 Entidade principal — `care_plans`

`care_plans` representa o plano inteiro criado para organizar o atendimento do paciente. O modelo implementado vincula o plano diretamente ao paciente; não armazena avaliação de origem nem responsável separado. Os status são Rascunho, Ativo e Encerrado. Planos encerrados continuam editáveis e aceitam alterações de vínculos por Médico ou Enfermeiro.

| Campo | Função |
|---|---|
| `id` | Identificador |
| `patient_id` | Paciente |
| `start_date` | Início |
| `end_date` | Término |
| `status` | Rascunho / ativo / encerrado |
| `objective` | Objetivo geral |
| `created_at` | Data de criação |
| `updated_at` | Data de atualização |
| `created_by` / `updated_by` | Usuários que criaram e atualizaram o plano |

---

## 7.4 Necessidades do plano — `care_plan_needs`

É importante separar o plano inteiro de cada cuidado existente dentro dele.

```text
Plano #001
│
├── Enfermagem
├── Fisioterapia
└── Acompanhamento médico
```

O `CarePlan` representa o conjunto. Cada `CarePlanNeed` associa uma necessidade identificada existente ao plano, mantém seu histórico de remoção lógica e guarda a configuração específica daquela necessidade. Um plano deve manter ao menos uma necessidade vigente; Médico e Enfermeiro podem vincular, configurar e remover necessidades, inclusive em plano encerrado.

| Campo | Função |
|---|---|
| `id` | Identificador |
| `care_plan_id` | Plano de cuidados |
| `care_need_id` | Necessidade relacionada |
| `required_professional_id` | Profissional específico e ativo necessário |
| `frequency_quantity` / `frequency_period` | Quantidade e período (dia, semana ou mês) |
| `removed_at` / `removal_reason` / `removed_by` | Remoção lógica, motivo e autor |

### Exemplo

```text
Plano #001

Item 1
Nome: Enfermagem
Frequência: 3x por semana

Item 2
Nome: Fisioterapia
Frequência: 2x por semana

Item 3
Nome: Acompanhamento médico
Frequência: conforme necessidade
```

---

## 7.5 Recursos da necessidade — `care_plan_need_resources`

Essa entidade registra zero ou mais recursos necessários por vínculo de necessidade. O catálogo de recursos é gerenciado pela interface e API do sistema.

É importante não confundir **profissional necessário** com **profissional agendado**.

No plano:

> O paciente precisa de fisioterapia.

Na escala/agendamento:

> Carlos será o fisioterapeuta que realizará a visita na terça-feira às 14h.

São informações de momentos diferentes do processo.

| Campo | Função |
|---|---|
| `plan_need_id` | Vínculo da necessidade no plano |
| `resource_id` | Recurso cadastrado |
| `quantity` | Quantidade |
| `observation` | Observação |

---

## 7.6 Histórico de alterações do plano

Como o plano pode ser atualizado ao longo do acompanhamento, alterações relevantes devem ser registradas para preservar o histórico.

### `care_plan_history`

| Campo | Função |
|---|---|
| `id` | Identificador |
| `care_plan_id` | Plano alterado |
| `changed_by` | Usuário/profissional que realizou a alteração |
| `changed_at` | Data da alteração |
| `description` | Descrição da alteração |
| `previous_data` | Dados anteriores |
| `new_data` | Dados após a alteração |

Esse histórico é útil para acompanhar como o plano evoluiu durante o atendimento.

---

# 8. Relação entre os processos

Até este ponto, a estrutura conceitual pode ser representada assim:

```text
Paciente
   │
   ├── Endereço
   │
   └── Avaliações
          │
          └── Necessidades identificadas
                 │
                 └── Plano de cuidados
                        │
                        ├── Itens do plano
                        ├── Profissionais necessários
                        ├── Recursos necessários
                        └── Histórico de alterações
```

Ou, considerando o processo completo do sistema:

```text
Solicitação
    ↓
Paciente
    ↓
Avaliação
    ↓
Necessidades
    ↓
Plano de cuidados
    ↓
Escala / Agendamento
    ↓
Visita
    ↓
Atendimento
    ↓
Evolução
    ↓
Reavaliação
    ↓
Atualização do plano, quando necessário
```

---

# 9. Regras conceituais importantes

## 9.1 Cadastro não é avaliação

O cadastro registra principalmente quem é o paciente e informações relativamente estáveis.

A avaliação registra uma situação específica e atual do paciente.

```text
Cadastro = Quem é o paciente?
Avaliação = Qual é a situação atual?
```

---

## 9.2 Avaliação não é plano de cuidados

A avaliação identifica e documenta a situação e as necessidades.

O plano transforma essas necessidades em uma estratégia organizada de atendimento.

```text
Avaliação → identifica necessidades
Plano → organiza como atender essas necessidades
```

---

## 9.3 Necessidade não é agendamento

A necessidade pode dizer:

```text
Fisioterapia
3 vezes por semana
```

Isso ainda não define:

```text
Qual profissional?
Qual dia?
Qual horário?
Qual visita?
```

Essas definições pertencem à escala/agendamento.

---

## 9.4 Profissional necessário não é profissional escalado

O plano pode definir que um fisioterapeuta é necessário sem decidir ainda quem será o profissional responsável por cada visita.

A escolha do profissional para datas e horários específicos acontece no processo de escala/agendamento.

---

# 10. Limites desta versão

Esta versão da documentação detalha principalmente:

- Cadastro do paciente
- Endereço
- Avaliação inicial
- Anamnese
- HDA
- Situação atual
- Necessidades identificadas
- Recursos necessários
- Conclusão da avaliação
- Plano de cuidados
- Itens do plano
- Profissionais necessários
- Recursos do plano
- Histórico de alterações do plano

Os processos abaixo ainda precisam de detalhamento completo ou implementação:

- Escala
- Agendamento
- Visita
- Registro do atendimento
- Evolução
- Reavaliação
- Atualização do plano

O processo Escala está detalhado em `docs/regras-de-negocio/regras_negocio_escala.md`, `docs/requisitos-do-sistema/requisitos_funcionais_escala.md` e `docs/tasks/tasks_escala.md`. A Escala responde quem realizará as necessidades do Plano de Cuidados; Agendamento define quando e onde. A implementação de Agendamento já valida datas, horários, disponibilidade semanal, conflitos e origem em Escala/Plano, preservando snapshot de endereço e histórico. A operação da Visita e o Registro do Atendimento permanecem como etapas pendentes.

---

# 11. Pontos que ainda precisam de validação

O modelo apresentado deve servir como base para desenvolvimento, mas alguns pontos ainda dependem da validação do processo real da empresa.

### Cadastro do paciente

- Se um paciente poderá possuir mais de um endereço.
- Como médico/equipe responsável será representado.
- Como doenças/estados de saúde serão relacionados ao paciente.
- Quais informações de saúde devem permanecer no cadastro e quais devem ficar somente em avaliações ou outros registros.

### Avaliação

- Quais campos clínicos são realmente utilizados pelos profissionais.
- Quais tipos de avaliação existirão.
- Se a HDA será apenas texto ou terá campos adicionais.
- Como necessidades e recursos são formalmente identificados.

### Plano de cuidados

- Confirmados: Médico cria e edita o plano; a ativação pelo Médico representa sua aprovação. Médico e Enfermeiro gerenciam vínculos de necessidades.
- Como as mudanças são registradas.
- Frequências confirmadas: quantidade por dia, semana ou mês.
- Controle de estoque e logística dos recursos permanece fora do escopo deste processo.

### Escala e agendamento

- **Definido na Escala:** disponibilidade/região exibidas na Escala não bloqueiam a seleção do profissional. Substituições preservam o profissional anterior no histórico. A Escala define quem realizará cada necessidade e sua frequência; não cria visitas nem horários.
- **Definido para Agendamento:** disponibilidade semanal estruturada por profissional (dias e uma ou mais janelas por dia) é bloqueante; sem configuração não há horário disponível. Usa-se horário local `America/Sao_Paulo`.
- Conflitos de paciente e profissional usam intervalos `[início, fim)`: qualquer sobreposição conflita; visitas canceladas e não realizadas não bloqueiam.
- Uma série recebe datas explicitamente selecionadas. A frequência da Escala determina a quantidade exata por semana (segunda a domingo) ou mês civil representado; cada ocorrência é validada separadamente e só as válidas são criadas.
- A data de cada ocorrência deve estar dentro dos períodos do Plano e da Escala, com limites inclusivos. Não há antecedência mínima nem bloqueio especial para alteração/cancelamento próximos do horário.
- O contrato que impede novos agendamentos quando a escala não está ativa está preparado no domínio Escala; sua efetivação ponta a ponta depende do consumidor no módulo Agendamento.

---

# 12. Como transformar esta documentação em tasks

A documentação deve funcionar como base para decompor o trabalho de desenvolvimento.

A ideia é não transformar cada campo automaticamente em uma task. Primeiro deve ser identificado o **processo ou funcionalidade** e, dentro dele, as tarefas técnicas necessárias.

Exemplo para o cadastro do paciente:

```text
Processo: Cadastro do paciente

├── Modelagem
│   ├── Criar Patient
│   └── Criar PatientAddress
│
├── Backend
│   ├── Cadastro de paciente
│   ├── Consulta de paciente
│   ├── Atualização de paciente
│   └── Cadastro/atualização de endereço
│
├── Regras
│   ├── Validar campos obrigatórios
│   ├── Validar CPF, se essa regra for adotada
│   └── Controlar status ativo/inativo
│
└── Frontend
    ├── Tela de cadastro
    ├── Formulário de endereço
    ├── Tela de consulta
    └── Edição do paciente
```

Para a avaliação:

```text
Processo: Avaliação inicial

├── Modelagem
│   ├── PatientAssessment
│   └── CareNeed
│
├── Backend
│   ├── Criar avaliação
│   ├── Consultar avaliação
│   ├── Atualizar avaliação
│   └── Registrar necessidades
│
├── Regras
│   ├── Avaliação vinculada a um paciente
│   ├── Profissional responsável
│   └── Controle de acesso aos dados
│
└── Frontend
    ├── Formulário de avaliação
    ├── Registro da anamnese/HDA
    ├── Registro de necessidades
    └── Visualização da avaliação
```

Para o plano de cuidados:

```text
Processo: Plano de cuidados

├── Modelagem
│   ├── CarePlan
│   ├── CarePlanItem
│   ├── CarePlanProfessional
│   ├── CarePlanResource
│   └── CarePlanHistory
│
├── Backend
│   ├── Criar plano
│   ├── Adicionar cuidados
│   ├── Associar profissionais necessários
│   ├── Associar recursos
│   ├── Atualizar plano
│   └── Registrar histórico
│
├── Regras
│   ├── Plano deve estar relacionado a uma avaliação
│   ├── Itens pertencem a um plano
│   └── Alterações relevantes devem ser registradas
│
└── Frontend
    ├── Criação do plano
    ├── Inclusão de cuidados
    ├── Definição de frequência
    ├── Associação de profissionais
    ├── Associação de recursos
    └── Histórico do plano
```

Esse formato permite que o documento de processos continue sendo uma referência funcional, enquanto o sistema de tasks detalha a implementação necessária para cada processo.

---

# 13. Estrutura recomendada para as próximas versões

Para manter o documento organizado conforme o projeto crescer, cada novo processo pode seguir sempre a mesma estrutura:

```text
## Processo X — Nome do processo

### X.1 Contexto
O que é e por que existe.

### X.2 Quando acontece
Onde o processo entra na cronologia.

### X.3 Entrada do processo
Quais informações vêm do processo anterior.

### X.4 Execução do processo
Como o processo funciona na prática.

### X.5 Saída do processo
O que passa a existir depois que o processo termina.

### X.6 Modelo de dados
Entidades, relacionamentos e campos principais.

### X.7 Regras conceituais
Regras importantes para o desenvolvimento.

### X.8 Pontos a validar
Dúvidas ainda não confirmadas com o processo real.
```

Essa padronização facilita a leitura pelos desenvolvedores e também facilita a transformação do documento em backlog, épicos, histórias e tasks.

---

# 14. Fluxo resumido para referência dos desenvolvedores

```text
SOLICITAÇÃO
    ↓
PACIENTE
    ├── Dados pessoais
    ├── Contatos
    └── Endereço
    ↓
AVALIAÇÃO
    ├── Identificação
    ├── Motivo da solicitação
    ├── Anamnese
    ├── HDA
    ├── Situação atual
    ├── Necessidades
    └── Recursos
    ↓
NECESSIDADES IDENTIFICADAS
    ├── Tipo
    ├── Descrição
    ├── Prioridade
    └── Status
    ↓
PLANO DE CUIDADOS
    ├── Objetivo
    ├── Itens de cuidado
    ├── Profissionais necessários
    ├── Recursos necessários
    └── Histórico
    ↓
ESCALA / AGENDAMENTO
    ↓
VISITA
    ↓
ATENDIMENTO
    ↓
EVOLUÇÃO
```

---

# 15. Estado atual da modelagem

As principais entidades dos processos implementados incluem:

```text
patients
patient_addresses
patient_assessments
care_needs
care_plans
care_plan_needs
care_plan_need_resources
care_plan_history
care_scales
care_scale_needs
care_scale_assignments
care_scale_audit_events
care_scale_substitutions
professional_planning_info
```

`care_scales` representa a escala vinculada a paciente e plano; `care_scale_needs` registra os itens do plano e a frequência definida na escala; `care_scale_assignments` mantém os profissionais por necessidade. `care_scale_audit_events` guarda autor, data e snapshots das alterações, enquanto `care_scale_substitutions` preserva substituições. `professional_planning_info` mantém informações de região e disponibilidade usadas como apoio informativo pela Escala.

### Modelo implementado para Agendamento/Visit e decisões para Visita/Atendimento

`Visit` é a própria ocorrência agendada e está persistida em `visits`, relacionada a paciente, Plano, `CarePlanNeed`, item da Escala e profissional herdado da atribuição vigente. Guarda data, início/fim programados, tipo único inicial (`Atendimento domiciliar`), status, observação, motivo de cancelamento, confirmação (autor/data), criação/atualização e autoria. O endereço usado é um snapshot integral por visita; corrigir o snapshot de uma visita não altera o cadastro nem outras visitas. `VisitHistory` preserva alterações relevantes com ator, instante e valores anterior/novo. As tarefas de Agendamento foram concluídas em 23/11/2026; início/fim operacionais e autoria de início/conclusão serão adicionados no processo Visita.

`ProfessionalWeeklyAvailability` (ou estrutura equivalente) registra um ou mais intervalos locais por dia da semana para cada profissional. Agenda ausente bloqueia o agendamento. Intervalos são `[início, fim)`; canceladas e não realizadas não bloqueiam conflitos. Séries recebem datas explícitas, confrontadas com a frequência da Escala por período de calendário e validadas individualmente; ocorrências válidas persistem mesmo se outras falharem.

Os estados são `AGENDADA`, `CONFIRMADA`, `EM_ATENDIMENTO`, `REALIZADA`, `CANCELADA` e `NÃO_REALIZADA`. Fluxo: `AGENDADA → CONFIRMADA → EM_ATENDIMENTO → REALIZADA`; de `AGENDADA` ou `CONFIRMADA` também se pode ir para `CANCELADA` ou `NÃO_REALIZADA`. Canceladas/não realizadas são terminais e preservadas. `REALIZADA` e o registro clínico pertencem à fronteira do processo Atendimento. Não há exclusão física ou lógica: retirar da agenda significa cancelar com motivo.

Permissões de Agendamento: `agendamentos.create`, `view`, `update`, `delete` e `status`; no MVP são concedidas inicialmente ao Gerente e podem ser atribuídas às demais categorias pelo gerenciamento de permissões. A permissão `delete` não apaga visitas; cancelamento é a operação de retirada preservando histórico. Ações próprias da Visita terão permissões granulares `visitas.view`, `update`, `confirm`, `cancel`, `start`, `finish` e `not_realized`, concedidas inicialmente ao Gerente. Confirmação, cancelamento e não realização aceitam Gerente ou usuário com a permissão da ação. Início e conclusão são restritos ao profissional responsável pela ocorrência; conclusão só é feita pelo fluxo de Atendimento após o registro exigido.

### Registro do Atendimento (decisão consolidada)

O Atendimento é um registro separado e obrigatório para concluir uma visita como `REALIZADA`. O registro pertence a uma única `Visit` e deve manter paciente e profissional coerentes com ela. O mínimo necessário é uma descrição obrigatória dos cuidados/procedimentos efetivamente realizados; observações adicionais são opcionais. O profissional responsável registra o atendimento e conclui sua própria visita. O Atendimento preserva autor e data/hora e não incorpora evolução ou interpretação clínica automática. Registros não são apagados; alterações relevantes mantêm histórico.

> Para Plano de Cuidados, o modelo descrito na seção 7 e as regras específicas em `docs/regras-de-negocio/regras_negocio_plano_cuidados.md` prevalecem sobre versões anteriores desta seção. As regras finais refletem decisões de processo validadas.

---

# 16. Processo — Gerenciamento de Usuários

## 16.1 Objetivo e fonte de regras

O processo controla contas de acesso, suas categorias, permissões e o vínculo com profissionais. As regras detalhadas são mantidas em `docs/regras-de-negocio/regras_usuarios.md` (referência por seção, sem IDs formais) e os requisitos em `docs/requisitos-do-sistema/requisitos_usuarios.md`.

O cadastro e a autenticação de usuário não substituem o cadastro oficial de profissionais. Até a implementação desse módulo, o sistema usa a entidade mínima `Professional` descrita abaixo.

## 16.2 Fluxo e regras consolidadas

O Gerente cria uma conta por CPF e senha, e-mail, categoria e profissional. Pode associar um profissional livre ou criar o vínculo profissional no mesmo fluxo. O login usa CPF e senha; a sessão usa cookies HttpOnly. A categoria determina as permissões granulares, que são administradas pelo Gerente.

- Cada usuário deve ter exatamente um profissional vinculado; profissionais sem usuário continuam permitidos.
- O usuário não troca o profissional associado. A exclusão definitiva remove a conta e seu profissional quando não há referências protegidas. Se existirem referências, a operação é bloqueada com explicação; não se apagam registros clínicos ou operacionais para forçar a exclusão.
- Cada profissão possui exatamente uma categoria correspondente. Criar profissão cria sua categoria sem permissões; renomear profissão renomeia a categoria na mesma transação. A categoria conserva suas permissões. Categorias correspondentes a profissões não podem ser excluídas independentemente.
- Mudança de profissão transfere a categoria do usuário associado para a categoria da profissão de destino. Profissões com profissionais vinculados não podem ser inativadas ou excluídas; a transferência deve ocorrer antes.
- Inativar/reativar usuário sincroniza o status do profissional sem apagar o vínculo.
- Recuperação de senha por e-mail faz parte do MVP e requer SMTP configurável por ambiente; credenciais não pertencem ao repositório.
- A auditoria permanece mínima, sem tela de histórico nesta etapa.

## 16.3 Entidades e relações

```text
User (accounts_user) ── 1:1 obrigatório ── Professional (professionals)
     └── FK obrigatória ── Category ── M2M ── GranularPermission
Professional ── FK obrigatória ── Profession ── 1:1 ── Category
UserAuditLog ── referências opcionais ao usuário/ator, preservadas após exclusão
```

`Professional` contém apenas nome, profissão e status enquanto o módulo oficial não estiver disponível. O vínculo permite profissionais livres sem conta, mas toda conta de usuário deve estar vinculada a um profissional. A exclusão de conta com referências protegidas é bloqueada e explicada.

## 16.4 Limites

Política de senha além dos validadores vigentes, MFA, expiração de sessão, retenção detalhada de auditoria e campos completos de profissionais permanecem fora das decisões deste processo. Agendamento, visita, atendimento e evolução são tratados em seus próprios processos.
