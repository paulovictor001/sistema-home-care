import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

globalThis.__assessmentApiCallsRaw = [];
globalThis.__assessmentApiResponse = { ok: true, status: 204, json: async () => ({}) };
globalThis.__assessmentApi = async (...args) => {
  globalThis.__assessmentApiCallsRaw.push(args);
  return globalThis.__assessmentApiResponse;
};
globalThis.__assessmentApiCalls = [];
globalThis.__assessmentApiJson = async (...args) => {
  globalThis.__assessmentApiCalls.push(args);
  return {};
};
const source = await readFile(new URL('../src/lib/assessments.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  .replace(/import \{ api, apiJson, ApiError \} from "\.\/api";/,
    'const api = globalThis.__assessmentApi; const apiJson = globalThis.__assessmentApiJson; class ApiError extends Error { constructor(status, message) { super(message); this.status = status; } }')
  .replace(/import type \{ SessionUser \} from "\.\.\/contexts\/auth-state";/, '');
const assessments = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const user = (group, permissions = []) => ({ groups: [group], permissions });

test('assessment access checks both profile and granular permission', () => {
  assert.equal(assessments.canCreateAssessment(user('GERENTE', ['avaliacoes.create'])), false);
  assert.equal(assessments.canCreateAssessment(user('MEDICO', ['avaliacoes.create'])), true);
  assert.equal(assessments.canCreateAssessment(user('MEDICO')), false);
  assert.equal(assessments.canChangeProfessional(user('GERENTE', ['avaliacoes.change_professional'])), true);
  assert.equal(assessments.canChangeProfessional(user('MEDICO', ['avaliacoes.change_professional'])), false);
  assert.equal(assessments.canViewAssessments(user('ENFERMEIRO', ['avaliacoes.view'])), true);
  assert.equal(assessments.canViewAssessments(user('APOIO', ['avaliacoes.view'])), false);
  assert.equal(assessments.canAddAssessmentResource(user('MEDICO', ['avaliacoes.add_resource'])), true);
  assert.equal(assessments.canAddAssessmentResource(user('ENFERMEIRO')), false);
});

test('need type maintenance access requires an authorized profile and granular permission', () => {
  assert.equal(assessments.canManageNeedTypes(user('GERENTE', ['tipos_necessidade.manage'])), true);
  assert.equal(assessments.canManageNeedTypes(user('MEDICO', ['tipos_necessidade.manage'])), true);
  assert.equal(assessments.canManageNeedTypes(user('ENFERMEIRO', ['tipos_necessidade.manage'])), true);
  assert.equal(assessments.canManageNeedTypes(user('APOIO', ['tipos_necessidade.manage'])), false);
  assert.equal(assessments.canManageNeedTypes(user('MEDICO')), false);
});

test('need actions check both the clinical profile and their granular permissions', () => {
  const clinician = user('MEDICO', [
    'necessidades.create', 'avaliacoes.add_need', 'necessidades.update',
    'necessidades.delete', 'necessidades.inactivate', 'necessidades.reactivate',
    'necessidades.view',
  ]);
  assert.equal(assessments.canCreateNeed(clinician), true);
  assert.equal(assessments.canUpdateNeed(clinician), true);
  assert.equal(assessments.canDeleteNeed(clinician), true);
  assert.equal(assessments.canChangeNeedStatus(clinician, false), true);
  assert.equal(assessments.canChangeNeedStatus(clinician, true), true);
  assert.equal(assessments.canViewNeedHistory(clinician), true);
  assert.equal(assessments.canCreateNeed(user('MEDICO', ['necessidades.create'])), false);
  assert.equal(assessments.canDeleteNeed(user('GERENTE', ['necessidades.delete'])), false);
  assert.equal(assessments.canChangeNeedStatus(user('GERENTE', ['necessidades.inactivate']), false), true);
  assert.equal(assessments.canChangeNeedStatus(user('GERENTE'), true), false);
});

test('need type maintenance calls the configured API routes', async () => {
  globalThis.__assessmentApiCalls.length = 0;
  await assessments.createNeedType({ name: 'Mobilidade', description: 'Apoio' });
  await assessments.updateNeedType(12, { name: 'Mobilidade', description: 'Atualizada' });
  await assessments.changeNeedTypeStatus(12, false);
  await assessments.changeNeedTypeStatus(12, true);
  assert.deepEqual(globalThis.__assessmentApiCalls, [
    ['/api/tipos-necessidade/', { method: 'POST', json: { name: 'Mobilidade', description: 'Apoio' } }],
    ['/api/tipos-necessidade/12/', { method: 'PATCH', json: { name: 'Mobilidade', description: 'Atualizada' } }],
    ['/api/tipos-necessidade/12/inativar/', { method: 'POST' }],
    ['/api/tipos-necessidade/12/reativar/', { method: 'POST' }],
  ]);
});

test('need deletion accepts 204 and preserves a clear API rejection', async () => {
  globalThis.__assessmentApiCallsRaw.length = 0;
  globalThis.__assessmentApiResponse = { ok: true, status: 204, json: async () => ({}) };
  await assessments.deleteNeed(9);
  assert.deepEqual(globalThis.__assessmentApiCallsRaw, [
    ['/api/necessidades/9/', { method: 'DELETE' }],
  ]);
  globalThis.__assessmentApiResponse = {
    ok: false,
    status: 400,
    statusText: 'Bad Request',
    json: async () => ({ detail: 'Esta necessidade possui histórico.' }),
  };
  await assert.rejects(assessments.deleteNeed(9), /Esta necessidade possui histórico/);
});
