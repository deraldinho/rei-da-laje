const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function loadPoolModule() {
  const file = path.join(__dirname, '../frontend/src/ui/three/ActiveVisualPool.js');
  const source = fs.readFileSync(file, 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

test('ActiveVisualPool cria somente a capacidade fixa e reutiliza slot liberado', async () => {
  const { ActiveVisualPool } = await loadPoolModule();
  let created = 0;
  const resets = [];
  const pool = new ActiveVisualPool({
    capacity: 3,
    createSlot: index => ({ index, generation: 0 }),
    resetSlot: slot => resets.push(slot.index),
    disposeSlot: () => { created--; }
  });
  created = pool.slots.length;
  assert.equal(created, 3);
  const a = pool.acquire('a');
  const b = pool.acquire('b');
  assert.equal(pool.acquire('a'), a, 'aquisição deve ser idempotente');
  assert.equal(pool.freeCount, 1);
  pool.release('a');
  const c = pool.acquire('c');
  assert.equal(c, a, 'slot liberado deve ser reutilizado');
  assert.deepEqual(resets, [a.index], 'release precisa resetar antes do reuso');
  assert.equal(pool.get('b'), b);
});

test('ActiveVisualPool falha fechado ao atingir a capacidade e não cria slot extra', async () => {
  const { ActiveVisualPool } = await loadPoolModule();
  let createCalls = 0;
  const pool = new ActiveVisualPool({
    capacity: 2,
    createSlot: index => { createCalls++; return { index }; },
    resetSlot: () => {},
    disposeSlot: () => {}
  });
  assert.ok(pool.acquire('a'));
  assert.ok(pool.acquire('b'));
  assert.equal(pool.acquire('c'), null);
  assert.equal(createCalls, 2);
  assert.equal(pool.slots.length, 2);
  assert.equal(pool.active.size, 2);
  assert.equal(pool.freeCount, 0);
});

test('ActiveVisualPool dispose libera cada slot uma única vez', async () => {
  const { ActiveVisualPool } = await loadPoolModule();
  const disposed = [];
  const pool = new ActiveVisualPool({
    capacity: 3,
    createSlot: index => ({ index }),
    resetSlot: () => {},
    disposeSlot: slot => disposed.push(slot.index)
  });
  pool.acquire('a');
  pool.release('a');
  pool.dispose();
  pool.dispose();
  assert.deepEqual(disposed.sort((a, b) => a - b), [0, 1, 2]);
  assert.equal(pool.active.size, 0);
});
