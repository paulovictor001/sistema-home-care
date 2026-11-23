# Execução das tasks A fazer

Foram implementadas as 41 tasks encontradas no projeto TA com status `A fazer`: TA-112, TA-113, TA-115–118 e TA-120–154. Épicos TA-2, TA-3, TA-72, TA-93 e TA-119 foram tratados como agrupadores. A consulta inicial não retornou responsável nessas tasks.

Cada task tem branch e PR próprios. As PRs estão encadeadas: revisar e integrar em ordem, ajustando a base para `main` quando a predecessora for integrada. A primeira depende da PR #36 (TA-111). Não houve merge nem alteração de status no Jira.

| Task | Entrega | PR |
|---|---|---|
| TA-112 | Preservar eventos autores e snapshots históricos do plano | [#37](https://github.com/paulovictor001/sistema-home-care/pull/37) |
| TA-113 | Testar permissões HTTP por perfil no plano | [#38](https://github.com/paulovictor001/sistema-home-care/pull/38) |
| TA-115 | Testar conflito de ativação e reutilização de necessidades | [#39](https://github.com/paulovictor001/sistema-home-care/pull/39) |
| TA-116 | Testar motivo e preservação da remoção de vínculo | [#40](https://github.com/paulovictor001/sistema-home-care/pull/40) |
| TA-117 | Testar ciclo de status e preservação do plano | [#41](https://github.com/paulovictor001/sistema-home-care/pull/41) |
| TA-118 | Expor contrato de requisitos do plano para integração futura | [#42](https://github.com/paulovictor001/sistema-home-care/pull/42) |
| TA-120 | Criar entidade e app de escalas | [#43](https://github.com/paulovictor001/sistema-home-care/pull/43) |
| TA-121 | Relacionar paciente plano necessidades e profissionais da escala | [#44](https://github.com/paulovictor001/sistema-home-care/pull/44) |
| TA-122 | Modelar datas status frequência e observações da escala | [#45](https://github.com/paulovictor001/sistema-home-care/pull/45) |
| TA-123 | Estruturar auditoria e histórico de substituições da escala | [#46](https://github.com/paulovictor001/sistema-home-care/pull/46) |
| TA-124 | Criar catálogo de permissões da escala | [#47](https://github.com/paulovictor001/sistema-home-care/pull/47) |
| TA-125 | Aplicar autorização granular e acesso próprio às escalas | [#48](https://github.com/paulovictor001/sistema-home-care/pull/48) |
| TA-126 | Disponibilizar API e serviços de escalas | [#49](https://github.com/paulovictor001/sistema-home-care/pull/49) |
| TA-127 | Validar paciente e plano da escala | [#50](https://github.com/paulovictor001/sistema-home-care/pull/50) |
| TA-128 | Validar período da escala dentro do plano | [#51](https://github.com/paulovictor001/sistema-home-care/pull/51) |
| TA-129 | Gerenciar necessidades da escala sem alterar o plano | [#52](https://github.com/paulovictor001/sistema-home-care/pull/52) |
| TA-130 | Gerenciar vínculos e substituições de profissionais | [#53](https://github.com/paulovictor001/sistema-home-care/pull/53) |
| TA-131 | Validar atividade e profissão dos profissionais da escala | [#54](https://github.com/paulovictor001/sistema-home-care/pull/54) |
| TA-132 | Permitir múltiplos profissionais e inclusão em lote | [#55](https://github.com/paulovictor001/sistema-home-care/pull/55) |
| TA-133 | Permitir ajuste independente da frequência da escala | [#56](https://github.com/paulovictor001/sistema-home-care/pull/56) |
| TA-134 | Registrar motivo opcional de alteração de frequência | [#57](https://github.com/paulovictor001/sistema-home-care/pull/57) |
| TA-135 | Permitir alteração autorizada dos quatro status da escala | [#58](https://github.com/paulovictor001/sistema-home-care/pull/58) |
| TA-136 | Validar condições de ativação e reativação da escala | [#59](https://github.com/paulovictor001/sistema-home-care/pull/59) |
| TA-137 | Considerar região e disponibilidade no planejamento da escala | [#60](https://github.com/paulovictor001/sistema-home-care/pull/60) |
| TA-138 | Impedir retirada do plano com necessidade vigente em escala | [#61](https://github.com/paulovictor001/sistema-home-care/pull/61) |
| TA-139 | Bloquear escala encerrada no contrato de Agendamento | [#62](https://github.com/paulovictor001/sistema-home-care/pull/62) |
| TA-140 | Registrar auditoria transacional das operações da escala | [#63](https://github.com/paulovictor001/sistema-home-care/pull/63) |
| TA-141 | Criar listagem criação e edição de escalas | [#64](https://github.com/paulovictor001/sistema-home-care/pull/64) |
| TA-142 | Exibir necessidades profissionais e frequência da escala | [#65](https://github.com/paulovictor001/sistema-home-care/pull/65) |
| TA-143 | Gerenciar necessidades frequência e profissionais nas telas | [#66](https://github.com/paulovictor001/sistema-home-care/pull/66) |
| TA-144 | Exibir observações substituições e auditoria da escala | [#67](https://github.com/paulovictor001/sistema-home-care/pull/67) |
| TA-145 | Aplicar permissões aos controles e navegação de escalas | [#68](https://github.com/paulovictor001/sistema-home-care/pull/68) |
| TA-146 | Testar autorização HTTP e escopo das escalas | [#69](https://github.com/paulovictor001/sistema-home-care/pull/69) |
| TA-147 | Testar inatividade e alteração da profissão de profissionais escalados | [#70](https://github.com/paulovictor001/sistema-home-care/pull/70) |
| TA-148 | Testar múltiplos profissionais e substituição sem efeitos colaterais | [#71](https://github.com/paulovictor001/sistema-home-care/pull/71) |
| TA-149 | Testar preservação de nomes e autores no histórico da escala | [#72](https://github.com/paulovictor001/sistema-home-care/pull/72) |
| TA-150 | Testar frequência independente e valores inválidos sem efeitos | [#73](https://github.com/paulovictor001/sistema-home-care/pull/73) |
| TA-151 | Testar todas as transições e consistência do período | [#74](https://github.com/paulovictor001/sistema-home-care/pull/74) |
| TA-152 | Testar ativação com necessidades vigentes completas | [#75](https://github.com/paulovictor001/sistema-home-care/pull/75) |
| TA-153 | Testar consulta bloqueio e reabertura de escala encerrada | [#76](https://github.com/paulovictor001/sistema-home-care/pull/76) |
| TA-154 | Testar auditoria e registrar validação integrada | [#77](https://github.com/paulovictor001/sistema-home-care/pull/77) |

## Decisões de domínio

- Profissão compatível: referência copiada do profissional necessário no Plano de Cuidados. Sem profissão de referência, não é possível vincular profissional nem ativar. Mudanças no plano não sobrescrevem a escala.
- Regiões atendidas e observações de disponibilidade ficam em cadastro de apoio ao planejamento, separado do stub de Profissional. São informativas; datas, horários e conflitos de visitas pertencem ao futuro Agendamento.
- Necessidades devem ser removidas explicitamente das escalas antes de retirá-las do plano. Não há remoção automática silenciosa.
- Exclusão de escala é lógica, preservando vínculos e auditoria. Escala encerrada é consultável; o contrato `care_scales.contracts.scheduling_requirement` impede novos agendamentos enquanto não estiver ativa. O módulo de Agendamento ainda deverá integrar esse contrato.
- Cada necessidade vigente precisa de frequência e ao menos um profissional ativo compatível para ativar. As demais transições não têm grafo restritivo.

## Validação

- 279 testes backend na branch final, incluindo 56 do Plano e 37 da Escala.
- Validação integrada adicional inclui os commits das TA-88–92 em checkout temporário, sem modificar as branches publicadas. Resultado: 290 testes aprovados.
- `makemigrations --check --dry-run`: nenhuma migration pendente.
- Build TypeScript/Vite aprovado; lint sem erros, com avisos `react(set-state-in-effect)` nas telas que carregam dados via efeitos.
- Testes de helpers frontend para planos e escalas.
- Chrome com API simulada: criar/editar escala, incluir necessidade, consultar disponibilidade/região, vincular/substituir profissional, ajustar frequência, alterar status, consultar histórico, leitura sem controles administrativos e DELETE 204. Roteiro: `frontend/sistema-home-care/tests/careScales.browser.mjs`, com Playwright, Chrome e Vite em :4173.
- Banco local, arquivos de ambiente e `.idea/` não foram incluídos. As migrations devem ser aplicadas no ambiente de execução após integrar as PRs.
