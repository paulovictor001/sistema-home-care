# Tasks — Registro do Atendimento

Implementar depois da consolidação documental e antes do fechamento da Visita. Cada etapa deve ser testada e reportada; aguardar autorização do usuário antes de iniciar a etapa seguinte.

## Etapa 1 — Modelo, autorização e integridade

- [x] Criar app/modelo de Atendimento e histórico, ligado a `Visit` com exclusão protegida e unicidade por visita.
- [x] Exigir descrição não vazia dos cuidados/procedimentos realizados; observações opcionais.
- [x] Derivar paciente/profissional da visita; impedir inconsistências.
- [x] Criar permissões `atendimentos.view/create/update/delete`; Gerente recebe o seed inicial; `delete` não apaga.
- [x] Testar constraints, autoria, integridade, histórico e migration.

## Etapa 2 — Serviços e API

- [x] Implementar consulta, criação e atualização protegida por serviço transacional.
- [x] Restringir gravação ao profissional responsável pela própria visita em `EM_ATENDIMENTO`, com permissão e conta ativa.
- [x] Impedir edição após a conclusão da visita e exclusão de Atendimento.
- [x] Implementar conclusão da Visita como `REALIZADA` somente após Atendimento válido e com `visitas.finish`.
- [x] Registrar instante/profissional de início e conclusão e eventos de histórico.
- [x] Testar autorização, validação do registro mínimo, repetição, estados incorretos e transação de conclusão.

## Etapa 3 — Interface

- [x] Exibir Atendimento no detalhe da Visita e disponibilizar formulário ao profissional responsável.
- [x] Mostrar validações, estados de carregamento/erro/sucesso e histórico.
- [x] Disponibilizar conclusão somente após gravação válida e autorização.
- [x] Testar fluxo visual com Playwright e executar build/lint.

## Etapa 4 — Fechamento

- [x] Executar regressão do app Atendimento e dos módulos impactados (visits, escalas, planos, pacientes e contas): `python manage.py test attendance visits care_scales care_plans patients accounts --verbosity 1` — 273 testes aprovados.
- [x] Executar checks Django e verificação de migrations: `manage.py check` e `manage.py makemigrations --check --dry-run`, ambos aprovados.
- [x] Atualizar auditorias, requisitos e evidências de execução. Corrigida também a consulta do teste de auditoria de paciente para desempatar eventos pelo identificador quando os timestamps coincidem.

### Evidência da Etapa 4 (23/11/2026)

- Regressão integrada: 273 testes aprovados em 1917,779 s.
- `manage.py check`: sem problemas.
- `manage.py makemigrations --check --dry-run`: nenhuma migration pendente.
- `git diff --check`: aprovado; Git emitiu apenas avisos de normalização LF/CRLF em arquivos preexistentes modificados no workspace.
