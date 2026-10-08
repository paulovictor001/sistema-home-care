import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
const requests = [];
globalThis.__scaleApi = async (path, options) => {requests.push({path, options}); return {ok: true, status: 204};};
const source = await readFile(new URL('../src/lib/careScales.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext}}).outputText.replace(/import \{ api, apiJson, ApiError \} from ['"]\.\/api['"];?/, 'const api = globalThis.__scaleApi; const apiJson = globalThis.__scaleApi; class ApiError extends Error {}');
const scales = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
test('manager or independent grant without requiring clinical group', () => {
  const actions = ['view', 'create', 'update', 'delete', 'change_status'];
  for (const action of actions) {
    assert.equal(scales.canScale({groups: ['GERENTE'], permissions: []}, action), true);
    assert.equal(scales.canScale({groups: [], permissions: [`escalas.${action}`]}, action), true);
    assert.equal(scales.canScale({groups: ['MEDICO'], permissions: []}, action), false);
    assert.equal(scales.canScale(null, action), false);
  }
  assert.equal(scales.canScale({groups: ['GERENTE'], permissions: []}, 'unknown'), false);
});
test('deletion accepts empty 204 and status uses dedicated endpoint', async () => {
  await scales.deleteScale(8);
  assert.deepEqual(requests.at(-1), {path: '/api/escalas/8/', options: {method: 'DELETE'}});
  await scales.changeScaleStatus(8, 'CLOSED');
  assert.equal(requests.at(-1).path, '/api/escalas/8/status/');
});
