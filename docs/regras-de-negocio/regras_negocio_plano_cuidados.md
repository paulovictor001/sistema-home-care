# Regras de Negócio — Plano de Cuidados

## 1. Objetivo

O Plano de Cuidados organiza como as Necessidades Identificadas do paciente serão atendidas, definindo os profissionais necessários, a frequência e, quando aplicável, os recursos necessários.

O Plano de Cuidados não representa o profissional efetivamente escalado ou agendado para executar o atendimento.

## 2. Regras de acesso

- Somente o **Médico** pode criar um Plano de Cuidados.
- Somente o **Médico** pode editar um Plano de Cuidados.
- **Médico, Enfermeiro e Gerente** podem visualizar um Plano de Cuidados.
- O plano deve estar vinculado a um paciente.

## 3. Existência do plano

- O Plano de Cuidados é obrigatório após a identificação das necessidades.
- Um Plano de Cuidados só pode ser criado quando existir pelo menos uma **Necessidade Identificada**.
- Um paciente pode possuir apenas **um Plano de Cuidados ativo por vez**.
- Planos anteriores permanecem armazenados no histórico.

## 4. Relação com Necessidades Identificadas

- O Plano de Cuidados deve estar relacionado a uma ou mais Necessidades Identificadas.
- Uma mesma Necessidade Identificada pode ser vinculada a diferentes Planos de Cuidados ao longo do tempo.
- Uma Necessidade Identificada pode estar vinculada a apenas um Plano de Cuidados ativo por vez.
- Uma necessidade vinculada ao plano pode ser removida do plano sem ser excluída ou inativada em Necessidades Identificadas.
- A remoção de uma necessidade do plano deve preservar o histórico.
- O motivo da remoção de uma necessidade do plano é obrigatório.
- Ao encerrar um Plano de Cuidados, as necessidades vinculadas permanecem ativas em Necessidades Identificadas.
- O encerramento do plano não exclui nem inativa automaticamente suas necessidades.
- Uma necessidade que permaneça ativa poderá posteriormente ser vinculada a outro Plano de Cuidados, respeitando a regra de apenas um plano ativo por necessidade.

## 5. Informações definidas para cada necessidade no plano

Para cada Necessidade Identificada vinculada ao Plano de Cuidados, devem ser definidos:

- Profissional necessário.
- Frequência.
- Recursos necessários, quando aplicável.

### 5.1 Profissional necessário

- O profissional necessário deve ser um **profissional específico já cadastrado no sistema**.
- Exemplo: João — Enfermeiro.
- O profissional necessário no plano não representa necessariamente o profissional que será escalado ou agendado para o atendimento.

### 5.2 Frequência

- A frequência é composta por **quantidade + período**.
- Os períodos disponíveis são:
  - Dia
  - Semana
  - Mês

### 5.3 Recursos

- Os recursos são opcionais.
- Uma necessidade pode não possuir nenhum recurso.
- Quando houver recursos, eles devem ser selecionados entre os recursos já cadastrados no sistema.
- Para cada recurso devem ser registrados:
  - Recurso
  - Quantidade
  - Observação

## 6. Descrição/objetivo geral

- O Plano de Cuidados pode possuir uma descrição/objetivo geral.
- A descrição/objetivo é opcional.

## 7. Status do plano

O Plano de Cuidados possui os seguintes status:

- **Rascunho**
- **Ativo**
- **Encerrado**

### 7.1 Transições

- **Rascunho → Ativo:** somente Médico.
- **Ativo → Encerrado:** Médico ou Enfermeiro.
- **Encerrado → Ativo:** Médico ou Enfermeiro.
- A reativação utiliza o mesmo registro do plano.
- A reativação não cria um novo Plano de Cuidados.
- O histórico de alterações de status deve ser preservado.

## 8. Datas e auditoria

O Plano de Cuidados possui:

- Data de início — obrigatória.
- Data de encerramento — opcional e pode ser informada antecipadamente.
- Data de criação — preenchida automaticamente.
- Data de atualização — preenchida automaticamente.
- Criado por.
- Atualizado por.

## 9. Histórico

Alterações relevantes do plano devem preservar histórico, incluindo:

- Alterações de status.
- Remoção de necessidades do plano.
- Motivo da remoção de necessidades.
- Alterações realizadas no registro.

## 10. Observações de escopo

As regras de escala, agendamento, visita, atendimento e evolução não são definidas neste processo. O Plano de Cuidados define a necessidade e o profissional necessário, mas não determina, neste momento, quem será efetivamente escalado ou agendado.
