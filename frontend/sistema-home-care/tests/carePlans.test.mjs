import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

const requests = [];
globalThis.__planApiJson = async (path, options) => { requests.push({ path, options }); return { id: 12 }; };
const source = await readFile(new URL('../src/lib/carePlans.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  .replace(/import \{ apiJson \} from ['"]\.\/api['"];?/, 'const apiJson = globalThis.__planApiJson;');
const plans = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const all = ['view', 'create', 'update', 'activate', 'close', 'reactivate'];
const user = (group, permissions = all) => ({ groups: [group], permissions: permissions.map(action => `planos_cuidados.${action}`) });

test('plan access requires the permitted profile even with all granular permissions', () => {
  const expected = { GERENTE: ['view'], MEDICO: all, ENFERMEIRO: ['view', 'close', 'reactivate'], APOIO: [] };
  for (const [group, allowed] of Object.entries(expected)) {
    for (const action of all) assert.equal(plans.canPlan(user(group), action), allowed.includes(action), `${group}/${action}`);
  }
  for (const action of all) {
    assert.equal(plans.canPlan(null, action), false);
    assert.equal(plans.canPlan(user('MEDICO', []), action), false);
  }
});

test('draft creation retains multiple selected needs and optional end date', async () => {
  const payload = { patient: 7, start_date: '2026-10-08', end_date: null, objective: '', needs: [2, 3] };
  await plans.createPlan(payload);
  const request = requests.at(-1);
  assert.equal(request.path, '/api/planos-cuidados/');
  assert.equal(request.options.method, 'POST');
  assert.deepEqual(request.options.json, payload);
});

test('status buttons follow both profile and the current state', () => {
  assert.deepEqual(plans.allowedStatusActions(user('MEDICO'), 'DRAFT'), ['ativar']);
  assert.deepEqual(plans.allowedStatusActions(user('ENFERMEIRO'), 'DRAFT'), []);
  for (const group of ['MEDICO', 'ENFERMEIRO']) {
    assert.deepEqual(plans.allowedStatusActions(user(group), 'ACTIVE'), ['encerrar']);
    assert.deepEqual(plans.allowedStatusActions(user(group), 'CLOSED'), ['reativar']);
  }
  for (const status of ['DRAFT', 'ACTIVE', 'CLOSED']) {
    assert.deepEqual(plans.allowedStatusActions(user('GERENTE'), status), []);
    assert.deepEqual(plans.allowedStatusActions(user('APOIO'), status), []);
    assert.deepEqual(plans.allowedStatusActions(user('MEDICO', []), status), []);
  }
});
