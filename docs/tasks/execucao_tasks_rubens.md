# Tasks de Rubens em Fazendo — 08/10/2026

Escopo consultado no Jira: TA-88 a TA-92 e TA-97 a TA-111. Uma branch e uma PR por task. As PRs permanecem para revisão; nenhum merge ou alteração de status no Jira foi realizado.

## Pull requests

| Task | Entrega | PR |
|---|---|---|
| TA-88 | Autorização de tipos no admin/API e bloqueio de inativos | [#17](https://github.com/paulovictor001/sistema-home-care/pull/17) |
| TA-89 | Testes de criação e regras base | [#18](https://github.com/paulovictor001/sistema-home-care/pull/18) |
| TA-90 | Testes de edição, exclusão e histórico | [#19](https://github.com/paulovictor001/sistema-home-care/pull/19) |
| TA-91 | Testes de CRUD no admin, situação e tipos históricos | [#20](https://github.com/paulovictor001/sistema-home-care/pull/20) |
| TA-92 | Matriz de permissões das necessidades | [#21](https://github.com/paulovictor001/sistema-home-care/pull/21) |
| TA-97 | Recursos por vínculo de necessidade no plano | [#22](https://github.com/paulovictor001/sistema-home-care/pull/22) |
| TA-98 | Criação transacional de plano | [#23](https://github.com/paulovictor001/sistema-home-care/pull/23) |
| TA-99 | Unicidade de plano ativo por paciente | [#24](https://github.com/paulovictor001/sistema-home-care/pull/24) |
| TA-100 | Vínculo e exclusividade da necessidade | [#25](https://github.com/paulovictor001/sistema-home-care/pull/25) |
| TA-101 | Profissional específico cadastrado | [#26](https://github.com/paulovictor001/sistema-home-care/pull/26) |
| TA-102 | Quantidade e período obrigatórios na configuração | [#27](https://github.com/paulovictor001/sistema-home-care/pull/27) |
| TA-103 | Transições e snapshots históricos | [#28](https://github.com/paulovictor001/sistema-home-care/pull/28) |
| TA-104 | Remoção lógica com motivo e histórico | [#29](https://github.com/paulovictor001/sistema-home-care/pull/29) |
| TA-105 | Encerramento preservando necessidades/datas | [#30](https://github.com/paulovictor001/sistema-home-care/pull/30) |
| TA-106 | API de planos, vínculos, configuração e histórico | [#31](https://github.com/paulovictor001/sistema-home-care/pull/31) |
| TA-107 | Autorização granular e por perfil | [#32](https://github.com/paulovictor001/sistema-home-care/pull/32) |
| TA-108 | Listagem, criação, detalhe e edição de planos | [#33](https://github.com/paulovictor001/sistema-home-care/pull/33) |
| TA-109 | Configuração de profissional, frequência e recursos | [#34](https://github.com/paulovictor001/sistema-home-care/pull/34) |
| TA-110 | Remoção com motivo na interface | [#35](https://github.com/paulovictor001/sistema-home-care/pull/35) |
| TA-111 | Botões Ativar/Encerrar/Reativar por perfil/status | PR da branch `feat/ta-111-acoes-status-frontend` |

As PRs #17–21 formam uma sequência; #22 em diante formam outra. A primeira de cada sequência parte de main e as demais apontam para a branch anterior. Após integrar a dependência em main, retargetar a PR seguinte para main, preservando a ordem. TA-96 já estava em main ao iniciar estas tasks.

## Contrato implementado do plano

- `GET/POST /api/planos-cuidados/`; listagem com `?patient=<id>&page=<n>` (20 por página).
- `GET/PUT/PATCH /api/planos-cuidados/<id>/`. Edição permite somente início, encerramento e objetivo. Paciente, status e autores não são editáveis por esse endpoint.
- `POST <id>/necessidades/` recebe `care_need`.
- `POST <id>/necessidades/<link_id>/configurar/` recebe `required_professional`, `frequency_quantity`, `frequency_period` e recursos opcionais `{resource, quantity, observation}`. Lista vazia limpa os recursos; ausência da lista os preserva.
- `POST <id>/necessidades/<link_id>/remover/` recebe `reason`; mantém o vínculo, recursos e necessidade.
- `POST <id>/ativar/`, `/encerrar/`, `/reativar/`; `GET <id>/historico/`.
- Catálogos `/profissionais/`, `/recursos/`, `/necessidades-disponiveis/?patient=<id>` dentro de `/api/planos-cuidados/`. Necessidades disponíveis são consultadas apenas pelo Médico; consulta de necessidades isoladas continua seguindo seu módulo.

Criação gera rascunho com ao menos uma necessidade ativa identificada do paciente. Campos legados de configuração continuam nullable no banco; a operação de configuração exige profissional e frequência completos. Ativação/reativação exige ao menos um vínculo atual e configuração completa. Recursos permanecem opcionais. Encerramento preserva a situação das necessidades e a data opcional informada, sem preenchê-la automaticamente. Serviços e eventos históricos são transacionais.

Médico cria/edita/ativa; Médico/Enfermeiro encerram/reativam; Gerente/Médico/Enfermeiro visualizam. API exige perfil e permissões `planos_cuidados.view/create/update/activate/close/reactivate`, criadas pelo seed `accounts.0010`. Recursos usam o catálogo existente, sem regras de estoque, escala ou agendamento.

## Validação e aplicação

- Testes por task antes de cada publicação, com SDK Python configurado no PyCharm.
- Suíte completa backend do conjunto de planos: 235 testes verdes. As duas sequências combinadas em checkout temporário passaram com **246 testes**; `makemigrations --check --dry-run` sem alterações pendentes.
- Frontend: build TypeScript/Vite, `oxlint src tests` (sem erros; warnings de setState em effects), testes Node em `tests/carePlans.test.mjs` e Chrome/Playwright com API simulada.
- Navegador: criação/edição; seleção de profissional e frequência; recursos e lista vazia; motivo em branco, cancelamento e remoção; ativação pelo Médico, encerramento/reativação pelo Enfermeiro e leitura sem ações pelo Gerente.
- Backend usa banco de testes, sem alterar o banco local. Os testes temporários usam chave de teste e hasher MD5 apenas para acelerar fixtures; configurações do produto permanecem iguais.
- Frontend validado em `/tmp` porque o `node_modules` do workspace pertence a outro usuário. Nenhum pacote ou lockfile do projeto foi alterado.

Após integrar, aplicar `python manage.py migrate` usando o SDK do projeto. Novas migrations: `care_plans.0004` (recursos), `care_plans.0005` (unicidade de plano ativo) e `accounts.0010` (permissões). Se existirem múltiplos planos ativos legados do mesmo paciente, revisá-los antes de aplicar a constraint, preservando o histórico. Testes de navegador usaram API simulada; não substituem validação operacional no ambiente de implantação.
