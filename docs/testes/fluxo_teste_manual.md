# Fluxo de teste manual por perfil

## Objetivo

Este roteiro valida pela interface os principais casos de uso dos perfis **Gerente**, **Médico (Clínico geral)** e **Enfermeiro**, cobrindo o ciclo entre Usuários, Cadastro do Paciente, Avaliação Inicial, Necessidades Identificadas, Plano de Cuidados, Escala, Agendamento, Visita e Registro do Atendimento.

Os casos descrevem o contexto e o resultado esperado. Não são um passo a passo de navegação.

## Preparação e execução

- Executar em ambiente local/de teste dedicado, com uma conta Gerente válida. Não usar dados reais de pacientes.
- Criar pela interface as contas fictícias do Médico e do Enfermeiro durante o caso de Usuários. Usar a profissão/categoria existente **Médico** para representar o Médico clínico geral; o sistema não possui campo separado de especialidade.
- O Gerente mantém a administração de usuários, pacientes, recursos, escalas e agendamentos. Para o fluxo de visita, conceder às categorias Médico e Enfermeiro somente as permissões necessárias para consultar a agenda e executar o próprio atendimento: `agendamentos.view`, `visitas.start`, `visitas.finish`, `atendimentos.view`, `atendimentos.create` e `atendimentos.update`. Não conceder a eles criação/edição de agendamento, confirmação, cancelamento ou administração de escalas neste roteiro.
- O início, registro e conclusão de uma visita devem ser feitos pela conta do profissional vinculado àquela visita. Ter permissão granular não substitui esse vínculo.
- Criar registros fictícios com identificadores únicos. Manter os registros e históricos ao final para revisão; não excluir dados reais nem tentar apagar registros históricos.
- Para cada caso, marcar o resultado e registrar uma referência que permita localizar o dado criado (por exemplo, nome de teste, paciente ou data da visita).

**Resultado de cada caso:** ☐ Passou ☐ Falhou ☐ Bloqueado  
**Evidência ou referência:** __________________________________________

## Casos de uso

### 1. Usuários, categorias, profissões e permissões

| ID | Perfil | Caso de uso e resultado esperado |
|---|---|---|
| USU-01 | Gerente | Criar as contas fictícias de Médico e Enfermeiro, cada uma vinculada à profissão/categoria correspondente. As contas ficam ativas e conseguem autenticar-se com suas próprias credenciais. |
| USU-02 | Gerente | Criar uma profissão de teste e verificar a criação da categoria correspondente. Renomear ou administrar uma profissão/categoria vinculada preserva os vínculos e permissões; exclusão ou inativação com vínculos é bloqueada quando exigido. |
| USU-03 | Gerente | Configurar as permissões granulares do cenário. Médico e Enfermeiro recebem as permissões clínicas previstas e apenas as permissões operacionais de visita listadas na preparação. A categoria Gerente mantém as permissões administrativas e de agendamento. |
| USU-04 | Gerente | Editar dados permitidos de uma conta, inativá-la e reativá-la. O status do profissional vinculado acompanha o status do usuário. |
| USU-05 | Médico e Enfermeiro | Tentar administrar usuários, categorias, profissões ou permissões. A interface não oferece essas ações e o acesso protegido é recusado, sem alteração administrativa. |
| USU-06 | Médico ou Enfermeiro | Solicitar recuperação de senha e definir uma nova senha pelo link recebido. A resposta da solicitação não revela se o e-mail existe; após a redefinição, a nova senha permite autenticação. |

### 2. Cadastro do Paciente

| ID | Perfil | Caso de uso e resultado esperado |
|---|---|---|
| PAC-01 | Gerente | Cadastrar um paciente fictício com médico responsável, condição de saúde e endereço. O paciente aparece como ativo e seus dados ficam disponíveis para os processos clínicos. |
| PAC-02 | Médico e Enfermeiro | Consultar o paciente e editar dados clínicos permitidos. As alterações ficam associadas ao paciente correto. |
| PAC-03 | Médico e Enfermeiro | Tentar cadastrar, inativar ou reativar paciente, ou alterar o médico/equipe responsáveis. As operações administrativas são recusadas e os dados permanecem inalterados. |
| PAC-04 | Gerente | Inativar e reativar o paciente. O status muda, o registro é preservado e os filtros permitem encontrá-lo em cada situação. |

### 3. Avaliação Inicial

| ID | Perfil | Caso de uso e resultado esperado |
|---|---|---|
| AVL-01 | Médico | Criar uma avaliação inicial completa para o paciente. A avaliação fica vinculada ao paciente e ao profissional, com origem, motivo, queixa e dados clínicos registrados. |
| AVL-02 | Enfermeiro | Criar uma segunda avaliação para o mesmo paciente e editar uma avaliação permitida. Os registros permanecem independentes; editar um deles não sobrescreve o outro. |
| AVL-03 | Gerente | Consultar as avaliações e, quando autorizado, alterar o profissional responsável. Os dados clínicos anteriores e o histórico permanecem preservados. |
| AVL-04 | Gerente | Tentar criar ou editar dados clínicos da avaliação. A ação não permitida é recusada; o Gerente mantém a consulta conforme suas permissões. |
| AVL-05 | Médico e Enfermeiro | Tentar salvar avaliação sem os campos obrigatórios. O sistema informa a validação, não cria registro incompleto e permite manter os dados já existentes. |
| AVL-06 | Gerente, Médico e Enfermeiro | Gerente administra o catálogo de recursos; Médico ou Enfermeiro associa à avaliação um recurso existente com quantidade válida e observação opcional. A associação aparece na avaliação correta. |

### 4. Necessidades Identificadas e tipos de necessidade

| ID | Perfil | Caso de uso e resultado esperado |
|---|---|---|
| NEC-01 | Médico | Administrar tipos de necessidade com `tipos_necessidade.manage`: criar e editar tipo com nome único e descrição opcional, além de inativar e reativar. O tipo ativo fica disponível para novas necessidades; o inativo não é oferecido para novos vínculos. |
| NEC-02 | Enfermeiro | Criar e editar tipos com a mesma permissão granular. A operação é permitida para a categoria clínica autorizada e negada quando a permissão é removida. |
| NEC-03 | Médico e Enfermeiro | Criar necessidades vinculadas à avaliação, com tipo, descrição e prioridade. A necessidade inicia identificada e aparece associada à avaliação correta. |
| NEC-04 | Médico e Enfermeiro | Editar, inativar e reativar necessidades, preservando o registro e o histórico das alterações. O Gerente consulta as necessidades pelo contexto da avaliação, conforme a matriz de acesso. |
| NEC-05 | Médico e Enfermeiro | Excluir uma necessidade de teste sem vínculo protegido. A exclusão permitida não afeta outras necessidades nem a avaliação de origem. |
| NEC-06 | Médico e Enfermeiro | Tentar excluir necessidade vinculada a plano ou histórico protegido. A operação é bloqueada e o registro permanece disponível; usar inativação quando a regra de domínio exigir preservação. |
| NEC-07 | Gerente | Tentar criar, editar ou excluir diretamente uma necessidade clínica. A operação não autorizada é recusada; a consulta permitida dentro da avaliação continua disponível. |

### 5. Plano de Cuidados

| ID | Perfil | Caso de uso e resultado esperado |
|---|---|---|
| PLA-01 | Médico | Criar e editar um plano para paciente com necessidades identificadas, configurar profissional necessário, frequência e recursos, e ativar o plano. A ativação exige os dados e vínculos necessários. |
| PLA-02 | Enfermeiro | No plano existente, vincular, configurar ou remover necessidade conforme permitido; encerrar e reativar o plano. O mesmo plano e seu histórico são preservados, e as necessidades originais continuam em Necessidades Identificadas. |
| PLA-03 | Gerente | Consultar o plano, seu estado, necessidades, configurações e histórico. A interface não oferece criação de plano para o Gerente neste fluxo. |
| PLA-04 | Médico e Enfermeiro | Tentar transições não autorizadas ao perfil, como Enfermeiro criar/ativar plano ou Médico executar ação sem a permissão necessária. A operação é recusada e o estado não muda. |
| PLA-05 | Médico e Enfermeiro | Tentar manter mais de um plano ativo para o mesmo paciente ou necessidade. O sistema impede a duplicidade conforme a regra vigente. |

### 6. Escala

| ID | Perfil | Caso de uso e resultado esperado |
|---|---|---|
| ESC-01 | Gerente | Criar uma escala a partir do plano ativo, selecionar necessidades e profissionais ativos com profissão compatível, definir período, frequência e observações. A escala fica vinculada ao paciente e ao plano. |
| ESC-02 | Gerente | Ativar uma escala com os requisitos atendidos e alterar sua situação. O histórico registra as alterações; uma escala encerrada não origina novos agendamentos. |
| ESC-03 | Gerente | Substituir o profissional de uma necessidade. A escala passa a indicar o novo responsável e mantém no histórico quem foi substituído e quando. |
| ESC-04 | Médico e Enfermeiro | Consultar escalas às quais estão vinculados. Os dados de atribuição correspondem ao profissional autenticado; não aparecem controles administrativos sem permissão. |
| ESC-05 | Médico e Enfermeiro | Tentar criar ou administrar escala sem permissão granular. A ação é negada e nenhuma atribuição ou estado é alterado. |

### 7. Agendamento

| ID | Perfil | Caso de uso e resultado esperado |
|---|---|---|
| AGE-01 | Gerente | Criar um agendamento individual a partir de escala ativa. Paciente, plano, necessidade e profissional correspondem à escala; data, horário, endereço utilizado e tipo ficam registrados. |
| AGE-02 | Gerente | Criar uma série de ocorrências para datas válidas. O sistema cria ocorrências válidas e informa individualmente datas rejeitadas, sem apagar as válidas. |
| AGE-03 | Gerente | Tentar agendar sem disponibilidade semanal ou com conflito de horário para paciente/profissional. O conflito é recusado; intervalos adjacentes sem sobreposição são aceitos. |
| AGE-04 | Gerente | Editar uma ocorrência e confirmar uma visita. A alteração fica registrada, sem mudar diretamente o profissional herdado da escala. |
| AGE-05 | Gerente | Cancelar uma visita elegível com motivo e marcar outra como não realizada com justificativa. Os registros permanecem no histórico e não podem ser iniciados ou concluídos depois. |
| AGE-06 | Médico e Enfermeiro | Consultar a agenda com a permissão de visualização e abrir a ocorrência em que o profissional está atribuído. Não podem criar, editar, confirmar ou cancelar agendamentos com as permissões deste roteiro. |
| AGE-07 | Gerente | Tentar gerar agendamento a partir de escala suspensa/encerrada ou plano encerrado. O sistema bloqueia a criação de novas ocorrências. |

### 8. Visita e Registro do Atendimento

| ID | Perfil | Caso de uso e resultado esperado |
|---|---|---|
| VIS-01 | Médico ou Enfermeiro responsável | Iniciar visita confirmada atribuída ao próprio profissional. O estado passa para em atendimento e o instante/profissional de início ficam registrados. |
| VIS-02 | Outro profissional clínico | Tentar iniciar, registrar Atendimento ou concluir visita atribuída a outra pessoa. A operação é negada e a visita permanece sem alteração. |
| ATE-01 | Médico ou Enfermeiro responsável | Registrar descrição dos cuidados/procedimentos realizados durante a visita em andamento, com observação opcional. O Atendimento fica associado à visita, paciente e profissional corretos. |
| ATE-02 | Médico ou Enfermeiro responsável | Tentar salvar Atendimento sem descrição válida ou concluir visita antes de registrar os cuidados. A conclusão é bloqueada e a visita permanece em atendimento. |
| ATE-03 | Médico ou Enfermeiro responsável | Atualizar o Atendimento e concluir a visita após registro válido. A visita passa para realizada e os históricos de Atendimento e Visita preservam autor, instante e alterações. |
| VIS-03 | Gerente | Consultar estado e histórico da visita e do Atendimento conforme suas permissões. O Gerente não inicia nem conclui visita da qual não seja o profissional responsável. |
| VIS-04 | Médico, Enfermeiro ou Gerente | Tentar retornar visita cancelada, não realizada ou concluída para estado operacional anterior. O sistema recusa a transição e preserva o histórico. |

## Encerramento da execução

- Revisar todos os casos marcados como Falhou ou Bloqueado e registrar o perfil, o processo e a referência do registro envolvido.
- Considerar o roteiro concluído quando todos os casos aplicáveis tiverem resultado registrado e os casos bloqueados tiverem uma justificativa (por exemplo, permissão, dependência ou indisponibilidade do ambiente).
- Manter os dados fictícios no ambiente dedicado para permitir revisão posterior dos vínculos e históricos.
