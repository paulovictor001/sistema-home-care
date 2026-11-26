import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

const requests = [];
globalThis.__patientApiJson = async (path, options) => {
  requests.push({ path, options });
  return { id: 12, status: 'ACTIVE' };
};
const source = await readFile(new URL('../src/lib/patients.ts', import.meta.url), 'utf8');
const formSource = await readFile(new URL('../src/pages/PatientForm.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
  .replace(/import \{ apiJson \} from ['"]\.\/api['"];?/, 'const apiJson = globalThis.__patientApiJson;');
const patients = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('patient menu requires a care-team role and pacientes.view', () => {
  assert.equal(patients.canViewPatients({ groups: ['APOIO'], permissions: ['pacientes.view'] }), false);
  assert.equal(patients.canViewPatients({ groups: ['MEDICO'], permissions: [] }), false);
  assert.equal(patients.canViewPatients({ groups: ['ENFERMEIRO'], permissions: ['pacientes.view'] }), true);
});

test('responsible assignments need both GERENTE and update_manager', () => {
  assert.equal(patients.canManagePatientAssignments({ groups: ['GERENTE'], permissions: [] }), false);
  assert.equal(patients.canManagePatientAssignments({ groups: ['MEDICO'], permissions: ['pacientes.update_manager'] }), false);
  assert.equal(patients.canManagePatientAssignments({ groups: ['GERENTE'], permissions: ['pacientes.update_manager'] }), true);
});

test('list filters and page are sent to the patient API', async () => {
  await patients.listPatients({ nome: 'Ana Silva', cpf: '12345678901', status: 'inativo', regiao: 'Norte', page: 3 });
  const request = requests.at(-1);
  assert.equal(request.path.split('?')[0], '/api/pacientes/');
  assert.deepEqual(Object.fromEntries(new URLSearchParams(request.path.split('?')[1])), {
    nome: 'Ana Silva', cpf: '12345678901', status: 'inativo', regiao: 'Norte', page: '3',
  });
});

test('create and edit preserve managed status and allow an optional team', async () => {
  const payload = { full_name: 'Paciente', responsible_team: undefined };
  await patients.createPatient(payload);
  assert.equal(requests.at(-1).path, '/api/pacientes/');
  assert.equal('status' in requests.at(-1).options.json, false);
  await patients.updatePatient(12, { phone: '91999990000' });
  assert.equal(requests.at(-1).path, '/api/pacientes/12/');
  assert.equal('status' in requests.at(-1).options.json, false);
});

test('status actions use dedicated endpoints', async () => {
  await patients.inativarPaciente(12);
  assert.equal(requests.at(-1).path, '/api/pacientes/12/inativar/');
  await patients.reativarPaciente(12);
  assert.equal(requests.at(-1).path, '/api/pacientes/12/reativar/');
});

test('health conditions are plain text and the catalog UI and API helpers are gone', () => {
  assert.match(source, /health_condition: string/);
  assert.doesNotMatch(source, /condicoes-saude|createHealthCondition|listHealthConditions/);
  assert.match(formSource, /<textarea[\s\S]*?value=\{form\.health_condition\}/);
  assert.doesNotMatch(formSource, /Cadastrar nova condição de saúde|createHealthCondition|listHealthConditions/);
});
