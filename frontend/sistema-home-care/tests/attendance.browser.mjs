import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = spawn(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], {cwd: root, stdio: 'ignore'});
let browser;
for (let attempt = 0; attempt < 50; attempt++) {
  if (server.exitCode !== null) throw new Error(`Vite preview encerrou antes de iniciar (código ${server.exitCode}).`);
  try { if ((await fetch('http://127.0.0.1:4174')).ok) break; } catch {}
  if (attempt === 49) { server.kill(); throw new Error('Vite preview não iniciou em http://127.0.0.1:4174.'); }
  await delay(200);
}
try {
  browser = await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {}), headless: true, args: ['--no-sandbox']});
} catch (error) {server.kill(); throw error;}

const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let visitStatus = 'EM_ATENDIMENTO';
let attendance = null;
await page.route('**/api/**', async route => {
  const req = route.request(); const path = new URL(req.url()).pathname;
  let result; let status = 200;
  if (path === '/api/auth/me/') result = {user: {id: 3, cpf: '52998224725', email: 'nurse@example.test', first_name: 'Ana', last_name: 'Enfermeira', groups: ['ENFERMEIRO'], category: {id: 3, name: 'ENFERMEIRO'}, permissions: ['agendamentos.view', 'visitas.confirm', 'visitas.cancel', 'visitas.not_realized', 'visitas.start', 'visitas.finish', 'atendimentos.view', 'atendimentos.create', 'atendimentos.update']}};
  else if (path === '/api/agendamentos/1/') result = {id: 1, patient: 4, patient_name: 'Maria da Silva', care_plan: 1, plan_need: 1, plan_need_description: 'Curativo', care_scale: 1, scale_need: 1, professional: 3, professional_name: 'Ana Enfermeira', visit_date: '2026-11-23', start_time: '09:00:00', end_time: '10:00:00', visit_type: 'Atendimento domiciliar', status: visitStatus, observation: '', address: {street: 'Rua A', number: '10', neighborhood: 'Centro', city: 'São Paulo', state: 'SP', zip_code: '01000000', complement: ''}, cancellation_reason: '', not_realized_reason: '', confirmed_at: null, started_at: '2026-11-23T09:00:00Z', finished_at: null, started_by: 3, finished_by: null, created_by_name: 'Gerente', history: []};
  else if (path === '/api/agendamentos/1/status/') {visitStatus = req.postDataJSON().status; result = {id: 1, patient: 4, patient_name: 'Maria da Silva', care_plan: 1, plan_need: 1, plan_need_description: 'Curativo', care_scale: 1, scale_need: 1, professional: 3, professional_name: 'Ana Enfermeira', visit_date: '2026-11-23', start_time: '09:00:00', end_time: '10:00:00', visit_type: 'Atendimento domiciliar', status: visitStatus, observation: '', address: {street: 'Rua A', number: '10', neighborhood: 'Centro', city: 'São Paulo', state: 'SP', zip_code: '01000000', complement: ''}, cancellation_reason: '', not_realized_reason: req.postDataJSON().reason, confirmed_at: null, started_at: null, finished_at: null, started_by: null, finished_by: null, created_by_name: 'Gerente', history: []};}
  else if (path === '/api/atendimentos/visitas/1/' && req.method() === 'GET') {if (!attendance) status = 404; else result = attendance;}
  else if (path === '/api/atendimentos/visitas/1/' && req.method() === 'POST') {attendance = {id: 9, visit: 1, care_description: req.postDataJSON().care_description, notes: req.postDataJSON().notes, created_by: 3, created_at: '2026-11-23T10:00:00Z', updated_at: '2026-11-23T10:00:00Z', history: [{id: 1, actor_name: 'Ana Enfermeira', event_type: 'CREATED', changed_at: '2026-11-23T10:00:00Z', previous_data: {}, new_data: {}}]}; result = attendance; status = 201;}
  else if (path === '/api/atendimentos/visitas/1/concluir/') {visitStatus = 'REALIZADA'; result = {id: 1, status: visitStatus, finished_at: '2026-11-23T10:10:00Z'};}
  else result = {};
  await route.fulfill({status, contentType: 'application/json', body: JSON.stringify(result)});
});

try {
  await page.goto('http://127.0.0.1:4174/agendamentos/1');
  await page.getByRole('heading', {name: 'Atendimento', exact: true}).waitFor();
  await page.getByLabel('Cuidados e procedimentos realizados *').fill('Curativo realizado e sinais vitais aferidos.');
  await page.getByLabel('Observações').fill('Paciente tolerou o procedimento.');
  await page.getByRole('button', {name: 'Registrar Atendimento'}).click();
  await page.getByRole('status').getByText('Atendimento salvo com sucesso.').waitFor();
  await page.getByText('Histórico do Atendimento').waitFor();
  await page.getByRole('button', {name: 'Concluir visita'}).click();
  await page.getByText('Visita concluída com sucesso.').waitFor();
  await page.getByText('Realizada', {exact: false}).first().waitFor();
  visitStatus = 'AGENDADA';
  await page.reload();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name: 'Confirmar'}).click();
  await page.getByText('Confirmada', {exact: false}).first().waitFor();
  await page.getByLabel('Motivo').fill('Paciente ausente');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name: 'Marcar não realizada'}).click();
  await page.getByText('Justificativa: Paciente ausente').waitFor();
  assert.deepEqual(errors, []);
  console.log('Visita: Atendimento, permissões granulares, confirmação, justificativa e conclusão: OK');
} finally {if (browser) await browser.close(); server.kill();}
