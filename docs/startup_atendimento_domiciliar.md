# Sistema de Gestão de Atendimento Domiciliar Particular

## 1. Propósito Inicial

Desenvolver uma solução de software para empresas que oferecem atendimento domiciliar particular, centralizando a gestão de pacientes, profissionais, visitas, recursos e acompanhamento dos atendimentos.

A proposta aproveita processos identificados tanto no atendimento domiciliar público quanto no privado, mas adapta o produto à realidade de uma empresa particular.

---

## 2. Problema que a Startup Pretende Resolver

Empresas de atendimento domiciliar precisam coordenar pacientes, familiares, profissionais, agenda, visitas, medicamentos, kits, materiais, registros e acompanhamento da evolução.

O problema central identificado é:

> **Falta de centralização e organização das informações e processos envolvidos no atendimento domiciliar particular.**

A solução deverá conectar esses elementos em um único fluxo operacional, reduzindo a dependência de processos fragmentados e facilitando o acompanhamento da operação.

---

## 3. Público-Alvo

### Público principal

- Empresas de Home Care;
- clínicas que oferecem atendimento domiciliar;
- empresas de assistência domiciliar;
- organizações com equipes multiprofissionais que realizam atendimentos em domicílio.

### Usuários do sistema

**Administrador/Gestor**
- gerencia pacientes, profissionais, equipes, visitas, recursos e indicadores.

**Profissionais de saúde**
- médicos, enfermeiros, fisioterapeutas e outros profissionais envolvidos no atendimento.

**Farmácia/Almoxarifado**
- controla medicamentos, kits, insumos e equipamentos.

**Paciente/Familiar/Cuidador**
- acompanha a rotina de atendimento, visitas, horários e profissionais, conforme suas permissões.

---

## 4. Contexto

A pesquisa identificou que a atenção domiciliar envolve avaliação do paciente, definição de um plano de atendimento, organização da equipe, visitas, registro e monitoramento da evolução.

No setor público, esses processos aparecem integrados à Rede de Atenção à Saúde, com diferentes modalidades e equipes. No setor particular, o serviço pode ser contratado diretamente pelo paciente/família ou por um plano de saúde.

### Fluxo adotado para o projeto particular

```text
Paciente / Família
        ↓
Solicitação
        ↓
Avaliação
        ↓
Plano de atendimento
        ↓
Organização da equipe e escala
        ↓
Agendamento das visitas
        ↓
Atendimento domiciliar
        ↓
Registro
        ↓
Acompanhamento da evolução
        ↓
Próxima visita
        ↓
Faturamento / cobrança
```

---

## 5. Público Afetado

### Diretamente

- pacientes;
- familiares e cuidadores;
- médicos;
- enfermeiros;
- fisioterapeutas;
- outros profissionais;
- gestores;
- profissionais responsáveis por farmácia e almoxarifado.

### Indiretamente

- planos de saúde, quando envolvidos;
- fornecedores;
- responsáveis administrativos e financeiros.

---

## 6. Stakeholders

| Stakeholder | Interesse |
|---|---|
| Paciente | Acompanhar seus atendimentos |
| Familiar/Cuidador | Acompanhar a rotina do paciente |
| Profissional de saúde | Organizar e registrar seus atendimentos |
| Gestor | Controlar a operação |
| Farmácia/Almoxarifado | Controlar medicamentos e materiais |
| Empresa de Home Care | Centralizar a gestão |
| Plano de saúde | Acompanhar serviços quando aplicável |
| Fornecedores | Fornecer materiais, medicamentos e equipamentos |

---

## 7. Causas do Problema

Pontos identificados na pesquisa:

- informações distribuídas em diferentes meios;
- dificuldade para organizar visitas;
- dificuldade para controlar a disponibilidade dos profissionais;
- falta de centralização do histórico;
- controle manual de medicamentos, kits e materiais;
- dificuldade para organizar atendimentos por região;
- dificuldade para acompanhar pendências;
- comunicação fragmentada;
- dificuldade para acompanhar a evolução dos pacientes.

> Esses pontos ainda precisam ser validados com empresas ou profissionais que atuem diretamente no Home Care particular.

---

## 8. Oportunidades de Melhoria

### 8.1 Centralização

Reunir pacientes, profissionais, visitas, atendimentos e recursos em uma única plataforma.

### 8.2 Organização por região

Organizar atendimentos próximos geograficamente para facilitar a rotina e os deslocamentos dos profissionais.

### 8.3 Checklist de materiais

Permitir verificar os materiais, medicamentos, kits e equipamentos necessários antes da visita.

### 8.4 Acompanhamento do paciente

Manter um histórico dos atendimentos e da evolução registrada ao longo do acompanhamento.

### 8.5 Controle de medicamentos e kits

Controlar entrada, saída e utilização de medicamentos e kits. A pesquisa menciona kits preparados para períodos de 7, 15 ou 30 dias.

### 8.6 Portal do paciente/familiar

Permitir acompanhar, conforme as permissões:

- próximos atendimentos;
- dias e horários;
- profissionais;
- informações autorizadas sobre medicamentos;
- histórico permitido.

---

# 9. Requisitos Funcionais

**RF01 — Cadastro de pacientes**  
Permitir cadastrar, editar e consultar pacientes.

**RF02 — Cadastro de profissionais**  
Permitir cadastrar profissionais e suas funções/especialidades.

**RF03 — Cadastro de equipes**  
Permitir organizar profissionais em equipes.

**RF04 — Agendamento de visitas**  
Permitir criar, alterar, cancelar e consultar visitas.

**RF05 — Agenda do profissional**  
Permitir visualizar as visitas programadas.

**RF06 — Registro do atendimento**  
Permitir registrar as informações do atendimento realizado.

**RF07 — Histórico do paciente**  
Manter o histórico dos atendimentos.

**RF08 — Acompanhamento da evolução**  
Permitir registrar e consultar a evolução ao longo dos atendimentos.

**RF09 — Plano de atendimento**  
Permitir registrar o plano definido para o paciente.

**RF10 — Gerenciamento de escalas**  
Permitir organizar a escala dos profissionais.

**RF11 — Controle de medicamentos e kits**  
Registrar entrada, saída e utilização.

**RF12 — Controle de materiais e equipamentos**  
Registrar recursos necessários aos atendimentos.

**RF13 — Checklist de materiais**  
Permitir verificar os recursos necessários para uma visita.

**RF14 — Organização por região**  
Permitir visualizar e agrupar atendimentos por localização.

**RF15 — Pendências**  
Registrar e acompanhar pendências.

**RF16 — Acompanhamento pelo paciente/familiar**  
Disponibilizar informações autorizadas sobre a rotina de atendimento.

**RF17 — Notificações**  
Notificar sobre visitas, alterações de agenda e eventos relevantes.

**RF18 — Relatórios e indicadores**  
Disponibilizar informações para acompanhamento da operação.

---

# 10. Requisitos Não-Funcionais

**RNF01 — Segurança**  
Proteger os dados e restringir o acesso conforme o perfil.

**RNF02 — Controle de acesso**  
Cada usuário deverá possuir permissões compatíveis com sua função.

**RNF03 — Privacidade**  
Tratar dados pessoais e informações de saúde com medidas adequadas de segurança e privacidade.

**RNF04 — Auditoria**  
Registrar alterações importantes realizadas no sistema.

**RNF05 — Disponibilidade**  
Permitir utilização pelos profissionais durante suas atividades, inclusive fora da empresa.

**RNF06 — Usabilidade**  
Interface simples e adequada ao uso por diferentes perfis.

**RNF07 — Responsividade**  
Funcionamento adequado em computador, tablet e celular.

**RNF08 — Desempenho**  
Consultas de agenda, pacientes e visitas devem apresentar tempo de resposta adequado.

**RNF09 — Escalabilidade**  
A arquitetura deve permitir crescimento da quantidade de pacientes, profissionais e atendimentos.

---

# 11. Escopo Inicial — MVP

## Módulo 1 — Usuários e permissões

- autenticação;
- perfis;
- controle de acesso.

## Módulo 2 — Pacientes

- cadastro;
- edição;
- consulta;
- histórico.

## Módulo 3 — Profissionais

- cadastro;
- função/especialidade;
- disponibilidade;
- equipe.

## Módulo 4 — Visitas

- agendamento;
- calendário;
- paciente;
- profissional;
- horário;
- status;
- cancelamento.

## Módulo 5 — Atendimento

- registro da visita;
- observações;
- evolução;
- pendências;
- próxima visita.

## Módulo 6 — Recursos

- medicamentos;
- kits;
- materiais;
- checklist.

## Módulo 7 — Dashboard

- visitas do dia;
- visitas realizadas;
- visitas pendentes;
- pacientes ativos;
- profissionais;
- indicadores básicos.

## Módulo 8 — Regiões

- localização dos pacientes;
- agrupamento por região;
- visualização de atendimentos próximos.

---

# 12. O Que Não Será Desenvolvido Inicialmente

Para manter o MVP viável:

- diagnóstico médico automatizado;
- IA para diagnóstico ou decisão clínica;
- prontuário eletrônico completo;
- integração completa com sistemas do SUS;
- integração com hospitais públicos;
- integração com toda a rede de saúde;
- integração com múltiplos planos de saúde;
- gestão completa de ambulâncias;
- monitoramento de dispositivos médicos em tempo real;
- telemedicina;
- aplicativo mobile nativo;
- otimização avançada de rotas;
- faturamento complexo;
- integração bancária;
- emissão fiscal;
- prescrição médica digital completa;
- módulos clínicos avançados.

Esses recursos poderão ser avaliados futuramente conforme a necessidade real identificada.

---

# 13. O Que Pode Ser Reaproveitado do Atendimento Público

| Conceito identificado no público | Aplicação no privado |
|---|---|
| Avaliação do paciente | Sim |
| Plano de cuidados/atendimento | Sim |
| Visitas regulares | Sim |
| Acompanhamento da evolução | Sim |
| Equipe multiprofissional | Sim |
| Gestão de recursos | Sim |
| Controle de medicamentos | Sim |
| Registro dos atendimentos | Sim |
| Monitoramento | Sim |
| Integração com a Rede de Atenção à Saúde | Não no MVP |
| Modalidades AD1/AD2/AD3 | Não no MVP |
| EMAD/EMAP | Não necessariamente |
| Regulação do SUS | Não |
| Encaminhamento pela rede pública | Não |

A ideia é **reaproveitar processos úteis**, e não copiar a estrutura do SUS.

---

# 14. Visão do Produto

O sistema pode ser dividido em quatro grandes áreas:

```text
                         SISTEMA
                            │
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
    PACIENTES          PROFISSIONAIS         RECURSOS
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ↓
                         VISITAS
                            ↓
                       ATENDIMENTO
                            ↓
                         EVOLUÇÃO
                            ↓
                       ACOMPANHAMENTO
```

O objetivo não é apenas criar um cadastro de pacientes, mas **organizar toda a operação necessária para que o atendimento domiciliar particular aconteça**.

---

# 15. Pontos Que Ainda Precisam Ser Validados

Antes do desenvolvimento definitivo, é necessário entender como uma empresa particular realmente trabalha.

### Atendimento

- Como o paciente entra na empresa?
- Como é feita a avaliação inicial?
- Quem define o plano de atendimento?
- Quais informações são registradas após a visita?
- Como funciona a próxima visita?

### Profissionais

- Como os profissionais são selecionados?
- Como funciona a escala?
- Como são feitas substituições?
- Como é registrada a realização da visita?

### Recursos

- Quem monta os kits?
- Como medicamentos e materiais são controlados?
- Quem é responsável pelo estoque?
- Como os equipamentos são entregues e recolhidos?

### Deslocamento

- Como os profissionais chegam até os pacientes?
- A empresa possui veículos?
- Como são organizadas várias visitas no mesmo dia?
- A localização influencia a escala?

### Financeiro

- Como funciona o pagamento?
- O serviço pode ser particular e por plano de saúde?
- Como funciona o faturamento?
- Quais relatórios financeiros são necessários?

---

# 16. Próxima Etapa

O material pesquisado fornece uma visão inicial do domínio, mas ainda não deve ser tratado como especificação definitiva.

O próximo passo é realizar uma entrevista com alguém que trabalhe diretamente na **administração ou coordenação de uma empresa de Home Care particular**.

O objetivo será transformar:

```text
Pesquisa
   ↓
Processo real
   ↓
Problemas encontrados
   ↓
Requisitos validados
   ↓
MVP
```

Dessa forma, o sistema será construído a partir de **problemas reais do atendimento domiciliar particular**, utilizando as informações do setor público apenas como referência para processos que também fazem sentido no contexto privado.
