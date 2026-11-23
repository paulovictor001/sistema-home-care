import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch({executablePath: '/usr/bin/google-chrome', headless: true, args: ['--no-sandbox']});
const page = await browser.newPage(); const errors = []; page.on('pageerror', error => errors.push(error.message)); page.on('dialog', dialog => dialog.accept());
let role = 'GERENTE'; let deleted = false;
let scale = {id: 9, patient: 7, patient_name: 'Maria da Silva', care_plan: 12, start_date: '2026-10-01', end_date: '2026-12-31', status: 'DRAFT', observation: '', items: []};
const options = [5, 6].map((id, index) => ({id, full_name: index ? 'Maria' : 'João', profession_name: 'Enfermeiro', regions: ['Centro'], patient_region: 'Centro', region_match: true, availability_notes: 'Dias úteis'}));
await page.route('**/api/**', async route => {
  const req = route.request(); const path = new URL(req.url()).pathname; const data = req.postDataJSON(); let result = []; let status = 200;
  const item = scale.items[0];
  if (path === '/api/auth/me/') result = {user: {id: 1, cpf: '52998224725', first_name: 'Rubens', groups: [role], permissions: [], category: {id: 1, name: role}}};
  else if (path.endsWith('/acesso/')) result = {view: true, create: role === 'GERENTE'};
  else if (path.endsWith('/planos/')) result = [{id: 12, patient: 7, patient_name: 'Maria da Silva', start_date: '2026-10-01', end_date: '2026-12-31', needs: [{id: 20, care_need__description: 'Curativo'}]}];
  else if (path === '/api/escalas/' && req.method() === 'POST') {scale = {...scale, ...data}; result = scale; status = 201;}
  else if (path === '/api/escalas/') result = {count: deleted ? 0 : 1, next: null, results: deleted ? [] : [scale]};
  else if (path === '/api/escalas/9/' && req.method() === 'DELETE') {deleted = true; status = 204;}
  else if (path === '/api/escalas/9/' && req.method() === 'PATCH') {scale = {...scale, ...data}; result = scale;}
  else if (path === '/api/escalas/9/') result = scale;
  else if (path.endsWith('/necessidades/')) {scale.items.push({id: 30, plan_need: 20, description: 'Curativo', need_type: 'Enfermagem', frequency_quantity: 2, frequency_period: 'WEEK', planned_quantity: 2, planned_period: 'WEEK', frequency_reason: '', observation: '', removed_at: null, assignments: []}); result = scale;}
  else if (path.endsWith('/profissionais-disponiveis/')) result = options;
  else if (path.endsWith('/profissionais/')) {const person = options.find(value => value.id === data.professional); item.assignments.push({id: item.assignments.length + 1, professional: person.id, full_name: person.full_name, profession_name: person.profession_name, removed_at: null}); result = scale;}
  else if (path.endsWith('/substituir/')) {item.assignments[0].removed_at = '2026-10-08'; item.assignments.push({id: 2, professional: 6, full_name: 'Maria', profession_name: 'Enfermeiro', removed_at: null}); result = scale;}
  else if (path.endsWith('/configurar/')) {Object.assign(item, data); result = scale;}
  else if (path.endsWith('/status/')) {scale.status = data.status; result = scale;}
  else if (path.endsWith('/substituicoes/')) result = [{id: 1, item: 30, previous_name: 'João', new_name: 'Maria', actor_name: 'Rubens', created_at: '2026-10-08T12:00:00Z'}];
  else if (path.endsWith('/historico/')) result = [{id: 1, action: 'SUBSTITUTE', actor_name: 'Rubens', created_at: '2026-10-08T12:00:00Z'}];
  await route.fulfill({status, contentType: 'application/json', ...(status === 204 ? {} : {body: JSON.stringify(result)})});
});
try {
  await page.goto('http://127.0.0.1:4173/escalas');
  await page.getByRole('button', {name: 'Nova escala', exact: true}).click();
  await page.getByLabel('Paciente / Plano').selectOption('12');
  await page.getByRole('button', {name: 'Criar escala', exact: true}).click();
  await page.getByRole('heading', {name: 'Escala #9', exact: true}).waitFor();
  await page.getByRole('button', {name: 'Editar escala', exact: true}).click();
  await page.getByLabel('Observação geral (opcional)').fill('Acompanhamento familiar');
  await page.getByRole('button', {name: 'Salvar escala', exact: true}).click();
  await page.getByText('Acompanhamento familiar', {exact: true}).waitFor();
  await page.getByRole('button', {name: 'Adicionar necessidade', exact: true}).click();
  await page.getByLabel('Necessidade do plano').selectOption('20');
  await page.getByRole('button', {name: 'Incluir necessidade', exact: true}).click();
  await page.getByRole('button', {name: 'Gerenciar necessidade', exact: true}).click();
  await page.getByLabel('Profissional ativo compatível').selectOption('5');
  await page.getByText('Disponibilidade: Dias úteis', {exact: true}).waitFor();
  await page.getByRole('button', {name: 'Adicionar profissional', exact: true}).click();
  await page.getByRole('button', {name: 'Remover João', exact: true}).waitFor();
  await page.getByLabel('Profissional ativo compatível').selectOption('6');
  await page.getByRole('button', {name: 'Substituir João', exact: true}).click();
  await page.getByRole('button', {name: 'Remover Maria', exact: true}).waitFor();
  await page.getByLabel('Quantidade por período').fill('4');
  await page.getByLabel('Motivo da frequência (opcional)').fill('Maior demanda');
  await page.getByRole('button', {name: 'Salvar frequência e observação', exact: true}).click();
  await page.getByText('Frequência na escala: 4 por semana', {exact: true}).waitFor();
  await page.getByLabel('Status de destino').selectOption('ACTIVE');
  await page.getByRole('button', {name: 'Alterar status', exact: true}).click();
  await page.getByText('Maria da Silva · Plano #12 · Ativa', {exact: true}).waitFor();
  await page.getByRole('button', {name: 'Consultar histórico', exact: true}).click();
  await page.getByText(/João → Maria/).waitFor();
  role = 'ENFERMEIRO'; await page.reload();
  await page.getByRole('heading', {name: 'Escala #9', exact: true}).waitFor();
  for (const name of ['Editar escala', 'Adicionar necessidade', 'Gerenciar necessidade', 'Alterar status', 'Excluir escala']) assert.equal(await page.getByRole('button', {name, exact: true}).count(), 0);
  role = 'GERENTE'; await page.reload();
  await page.getByRole('button', {name: 'Excluir escala', exact: true}).click();
  await page.getByText('Nenhuma escala disponível.', {exact: true}).waitFor();
  assert.equal(deleted, true); assert.deepEqual(errors, []);
  console.log('Escalas: criar, editar, incluir necessidade, disponibilidade, vincular, substituir, frequência, status, histórico, leitura restrita e excluir 204: OK');
} finally {await browser.close();}
