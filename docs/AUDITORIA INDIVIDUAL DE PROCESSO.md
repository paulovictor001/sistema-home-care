# ETAPA 2 — AUDITORIA INDIVIDUAL DE PROCESSO

Realize a auditoria do seguinte processo:

**PROCESSO: [INFORMAR O NOME DO PROCESSO]**

Antes de começar:

1. Leia `docs/auditoria/00_CONTEXTO_E_CONTINUIDADE.md`.
2. Leia `docs/auditoria/01_INVENTARIO.md`.
3. Consulte a documentação de regras de negócio, requisitos funcionais e tasks correspondente ao processo.
4. Consulte o documento principal de processos e modelo de dados.
5. Identifique decisões complementares registradas em outros documentos.

## 1. Documentação esperada

Identifique:

- Objetivo do processo.
- Etapas do fluxo.
- Entradas e saídas.
- Regras de negócio.
- Requisitos funcionais.
- Entidades e relacionamentos.
- Permissões.
- Dependências de outros processos.

## 2. Auditoria do backend

Verifique:

- Models.
- Migrations.
- Serializers.
- Views e endpoints.
- Services.
- Validações.
- Permissões.
- Relacionamentos.
- Regras de negócio.
- Testes automatizados.

## 3. Auditoria do frontend

Verifique:

- Páginas.
- Componentes.
- Formulários.
- Listagens.
- Filtros.
- Ações disponíveis.
- Integração com API.
- Validações.
- Tratamento de erros.
- Controle de acesso.

## 4. Comparação entre documentação e código

Para cada requisito, classifique:

- CONCLUÍDO.
- PARCIAL.
- NÃO INICIADO.
- DIVERGENTE.
- A VALIDAR.
- FORA DO MVP.

Não considere a existência de um arquivo como prova de funcionalidade concluída.

Verifique se o fluxo está conectado entre frontend e backend.

## 5. Problemas encontrados

Registre:

- Funcionalidades incompletas.
- Regras ausentes.
- Divergências.
- Problemas de integração.
- Problemas de modelagem.
- Falta de testes.
- Dependências não implementadas.

## 6. Entregável

Atualize `docs/auditoria/02_AUDITORIA_PROCESSOS.md`.

Crie uma seção exclusiva para o processo analisado, contendo:

1. Resumo do processo.
2. Status geral.
3. Requisitos e status de implementação.
4. Evidências do backend.
5. Evidências do frontend.
6. Entidades e relacionamentos.
7. Regras implementadas e pendentes.
8. Problemas encontrados.
9. Decisões pendentes.
10. Dependências com outros processos.
11. Tasks recomendadas.

Não implemente nem corrija nada.

Ao finalizar, atualize `00_CONTEXTO_E_CONTINUIDADE.md`, informando o processo analisado, os resultados e qual processo deverá ser analisado na próxima conversa.

Se encontrar uma decisão conflitante ou ausência de definição, registre como pendência. Não invente uma solução.