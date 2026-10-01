const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const url = pathToFileURL(path.resolve(__dirname, '..', 'frontend/src/engine/physics/RelinhoContactBudget.js')).href;

test('mantém contatos ativos existentes e limita novos relinhos a três', async () => {
  const { createRelinhoContactBudget } = await import(`${url}?t=${Date.now()}`);
  const contacts = new Map([
    ['a|b', { phase: 'GRINDING' }],
    ['c|d', { phase: 'GRINDING' }]
  ]);
  const budget = createRelinhoContactBudget(contacts, 3);

  assert.equal(budget.admit('a|b'), true, 'contato ativo existente deve continuar');
  assert.equal(budget.admit('e|f'), true, 'há uma vaga para novo relinho');
  assert.equal(budget.admit('g|h'), false, 'quarto relinho simultâneo deve aguardar');
  assert.equal(budget.activeCount, 3);
});

test('contato RELEASE não ocupa vaga e par admitido só conta uma vez', async () => {
  const { createRelinhoContactBudget } = await import(`${url}?t=${Date.now()}-2`);
  const contacts = new Map([['a|b',{phase:'RELEASE'}],['c|d',{phase:'GRINDING'}]]);
  const budget = createRelinhoContactBudget(contacts, 3);
  assert.equal(budget.activeCount, 1);
  assert.equal(budget.admit('e|f'), true);
  assert.equal(budget.admit('e|f'), true);
  assert.equal(budget.activeCount, 2, 'mesmo par não pode consumir duas vagas');
  assert.equal(budget.admit('g|h'), true);
  assert.equal(budget.admit('i|j'), false);
});

test('GameApp delega o hot path ao LineContactSystem mantendo o limite físico centralizado', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(path.resolve(__dirname, '..', 'frontend/src/engine/App.js'), 'utf8');
  assert.match(source, /LineContactSystem/);
  assert.match(source, /this\.relinhoContactSystem\.step\(/);
  assert.doesNotMatch(source, /const\s+contactBudget\s*=\s*createRelinhoContactBudget\(this\.relinhoContacts,\s*3\)/);
});
