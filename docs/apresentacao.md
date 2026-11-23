# Preparação da apresentação

O comando `seed_demo` cria dados fictícios no banco configurado. Não apaga dados existentes, não altera permissões das categorias clínicas existentes e aborta sem mudanças caso haja colisão de CPF/e-mail. Reexecutar com a mesma senha preserva os registros e as alterações feitas durante a apresentação, sem duplicá-los.

## Preparar o ambiente

Com o Docker em execução e migrations aplicadas:

```bash
docker compose exec backend python manage.py seed_demo --password 'SUA_SENHA_DE_DEMONSTRACAO' --report /tmp/homecare-demo-credentials.json
docker cp sistema-home-care-backend-1:/tmp/homecare-demo-credentials.json /tmp/homecare-demo-credentials.json
```

O relatório local contém a senha escolhida, as credenciais por perfil e os IDs de pacientes, planos e escalas. A senha não fica neste documento nem no código. Não execute esse comando automaticamente em produção. Se já houver contas demo com outra senha, o comando aborta em vez de redefinir credenciais silenciosamente.

## Perfis

- Gerente: administração de usuários, categorias/profissões, pacientes e escalas; consulta dos registros clínicos conforme a matriz existente.
- Administrador: perfil Gerente com acesso técnico ao `/admin/`.
- Médico: avaliação, necessidades e elaboração/ativação dos planos.
- Duas contas de Enfermagem: avaliações, necessidades, consulta e encerramento/reativação do plano; demonstram substituição na escala.
- Fisioterapeuta, nutricionista, terapeuta ocupacional, fonoaudiólogo, psicólogo e cuidador: categorias próprias, sem concessão clínica adicional; consultam suas escalas por vínculo.
- Coordenador de escalas: categoria própria com as cinco permissões granulares de Escalas, sem grupo clínico; demonstra autorização independente.
- Apoio: conta ativa sem permissões; demonstra acesso negado.
- Usuário inativo: login bloqueado; profissional também inativo.
- Dois profissionais livres, sem conta de acesso, para demonstrar o vínculo ao criar usuários.

CPFs são gerados apenas para satisfazer a validação do sistema. Nomes, contatos, endereços e cenários são fictícios; e-mails usam o domínio reservado `.invalid`. Pacientes não têm conta de login neste projeto.

## Roteiro

1. Entre como Gerente em `http://localhost:5173`. Mostre as pessoas, profissões e categorias. Filtre os cadastros pelo nome ou pelo texto `Demo`.
2. Abra **Maria das Graças Silva (Demo)**: paciente ativo, endereço e condição de saúde; duas avaliações preservadas; necessidades das oito categorias e quatro prioridades.
3. Entre como Médico. Abra o plano ativo de Maria e mostre profissionais necessários, frequência e recursos. Mostre a separação entre cadastro estável e avaliação clínica.
4. Como Gerente ou Coordenador, abra a escala ativa de Maria. Mostre frequência diferente da referência do plano, motivo opcional, observação por necessidade, região/disponibilidade e a substituição de Ana por Camila, com autor/data.
5. Entre como Fisioterapeuta ou outro profissional vinculado. Mostre suas escalas e a ausência dos controles de edição. O acesso clínico global não é concedido automaticamente.
6. **José Antônio Costa (Demo)**: plano e escala em rascunho, configurados para demonstrar ativação.
7. **Francisca Helena Lima (Demo)**: plano ativo e escala suspensa; demonstre mudança de status.
8. **Antônio Carlos Pereira (Demo)**: plano e escala encerrados, com histórico preservado. A escala não fornece novos agendamentos enquanto encerrada.
9. **Beatriz Nascimento (Demo)**: paciente sem avaliação ou plano, pronto para mostrar o fluxo de criação ao vivo.
10. **Paulo Roberto Almeida (Demo)**: paciente inativo; altere o filtro da listagem para visualizar e demonstrar reativação.
11. Compare as contas Apoio e Inativo: falta de permissão versus login bloqueado.

A demonstração não cria visitas, horários ou agendamentos: esse módulo ainda não foi implementado. Os dados clínicos são exemplos ilustrativos, sem prescrição.
