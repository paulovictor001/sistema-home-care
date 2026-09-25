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

Nesta versão, o detalhamento está concentrado nos processos entre **cadastro do paciente** e **plano de cuidados**. A escala/agendamento e a visita aparecem como continuidade do fluxo e serão aprofundadas nas próximas etapas da documentação.

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

`care_plans` representa o plano inteiro criado para organizar o atendimento do paciente.

| Campo | Função |
|---|---|
| `id` | Identificador |
| `patient_id` | Paciente |
| `assessment_id` | Avaliação que originou o plano |
| `responsible_professional_id` | Responsável pelo plano |
| `start_date` | Início |
| `end_date` | Término |
| `status` | Rascunho / ativo / suspenso / encerrado |
| `objective` | Objetivo geral |
| `observations` | Observações |
| `created_at` | Data de criação |
| `updated_at` | Data de atualização |

---

## 7.4 Cuidados do plano — `care_plan_items`

É importante separar o plano inteiro de cada cuidado existente dentro dele.

```text
Plano #001
│
├── Enfermagem
├── Fisioterapia
└── Acompanhamento médico
```

O `care_plan` representa o conjunto. O `care_plan_item` representa cada cuidado individual.

| Campo | Função |
|---|---|
| `id` | Identificador |
| `care_plan_id` | Plano de cuidados |
| `care_need_id` | Necessidade relacionada |
| `name` | Nome do cuidado |
| `description` | Descrição |
| `frequency` | Frequência |
| `start_date` | Início |
| `end_date` | Término |
| `status` | Ativo / encerrado |
| `observations` | Observações |

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

## 7.5 Profissionais necessários — `care_plan_professionals`

Essa entidade registra quais tipos de profissionais são necessários para executar o plano e, quando fizer sentido, pode registrar um profissional específico.

É importante não confundir **profissional necessário** com **profissional agendado**.

No plano:

> O paciente precisa de fisioterapia.

Na escala/agendamento:

> Carlos será o fisioterapeuta que realizará a visita na terça-feira às 14h.

São informações de momentos diferentes do processo.

| Campo | Função |
|---|---|
| `id` | Identificador |
| `care_plan_id` | Plano |
| `professional_type` | Tipo de profissional |
| `professional_id` | Profissional específico, se já definido |
| `frequency` | Frequência |
| `observations` | Observações |

---

## 7.6 Recursos necessários — `care_plan_resources`

Representa os recursos necessários para que o atendimento previsto no plano possa ser realizado.

Pode envolver:

- Medicamentos
- Materiais
- Equipamentos
- Kits

| Campo | Função |
|---|---|
| `id` | Identificador |
| `care_plan_id` | Plano |
| `resource_type` | Medicamento / material / equipamento |
| `resource_id` | Recurso cadastrado |
| `quantity` | Quantidade |
| `frequency` | Frequência de utilização, quando aplicável |
| `observations` | Observações |

---

## 7.7 Histórico de alterações do plano

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

Os processos abaixo serão detalhados em documentos ou seções seguintes:

- Escala
- Agendamento
- Visita
- Registro do atendimento
- Evolução
- Reavaliação
- Atualização do plano

A escala/agendamento já possui uma definição conceitual inicial, mas ainda não está detalhada neste documento porque depende da definição completa das regras de disponibilidade dos profissionais, conflitos de agenda, frequência dos cuidados e organização das visitas.

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

- Quem pode criar e alterar o plano.
- Como o plano é aprovado.
- Como as mudanças são registradas.
- Quais tipos de frequência serão utilizados.
- Quais recursos precisam de controle de estoque ou logística.

### Escala e agendamento

- Horários de disponibilidade dos profissionais.
- Regras para conflitos de agenda.
- Regra de organização por região.
- Duração padrão dos atendimentos.
- Como substituições de profissionais serão tratadas.
- Diferença entre escala e agendamento na operação real.

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

Até a etapa de plano de cuidados, as principais entidades levantadas são:

```text
patients
patient_addresses
patient_assessments
care_needs
care_plans
care_plan_items
care_plan_professionals
care_plan_resources
care_plan_history
```

Essas entidades representam a base inicial do domínio. A modelagem deve continuar sendo refinada conforme os processos forem validados e as próximas etapas — especialmente escala, agendamento, visita, atendimento e evolução — forem documentadas.

> Este documento representa uma base funcional para o desenvolvimento. As decisões finais de campos, relacionamentos, regras de negócio e nomenclaturas devem ser confirmadas conforme a validação do processo real e a arquitetura técnica escolhida para o projeto.
