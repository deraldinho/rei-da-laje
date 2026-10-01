const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const moduleUrl = pathToFileURL(path.resolve(__dirname, '../frontend/src/engine/physics/LineBroadPhase.js')).href;

function kite(id, minX, maxX, minY, maxY, extra = {}) {
  return {
    userId: id,
    isAscending: false,
    spawnProtection: 0,
    ...extra,
    rope: { getAABB: () => ({ minX, maxX, minY, maxY, minZ: 0, maxZ: 0 }) }
  };
}

test('broad phase rejeita linhas separadas e emite apenas AABBs sobrepostos', async () => {
  const { LineBroadPhase } = await import(`${moduleUrl}?t=${Date.now()}`);
  const broad = new LineBroadPhase({ maxDiscoveryChecksPerScan: 96 });
  assert.equal(broad.scan([kite('a',0,20,0,20), kite('b',100,120,0,20)]).length, 0);
  const hits = broad.scan([kite('a',0,40,0,40), kite('b',25,60,20,55)]);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].pairKey, 'a|b');
});

test('broad phase exclui subida, proteção de spawn e corte pendente', async () => {
  const { LineBroadPhase } = await import(`${moduleUrl}?t=${Date.now()}`);
  const broad = new LineBroadPhase();
  const normal = kite('ok',0,50,0,50);
  const ascending = kite('up',0,50,0,50,{ isAscending:true });
  const protectedKite = kite('safe',0,50,0,50,{ spawnProtection:1 });
  const pending = kite('cut',0,50,0,50,{ pendingCut:true });
  assert.equal(broad.scan([normal, ascending, protectedKite, pending]).length, 0);
});

test('40 linhas distribuídas geram muito menos candidatos que 780 pares', async () => {
  const { LineBroadPhase } = await import(`${moduleUrl}?t=${Date.now()}`);
  const broad = new LineBroadPhase({ maxDiscoveryChecksPerScan: 96 });
  const list = Array.from({ length:40 }, (_,i) => {
    const col=i%8,row=Math.floor(i/8),x=20+col*130,y=30+row*250;
    return kite(`k${i}`,x,x+55,y,y+160);
  });
  const candidates = broad.scan(list);
  assert.ok(candidates.length < 80, `candidatos=${candidates.length}`);
  const metrics = broad.metrics();
  assert.equal(metrics.inputLines, 40);
  assert.equal(metrics.candidatePairs, candidates.length);
  assert.ok(metrics.rejectedX > 0 || metrics.rejectedY > 0);
});

test('scan reutiliza array e objetos candidatos entre ticks', async () => {
  const { LineBroadPhase } = await import(`${moduleUrl}?t=${Date.now()}`);
  const broad = new LineBroadPhase();
  const a=kite('a',0,40,0,40), b=kite('b',20,60,10,50);
  const first = broad.scan([a,b]);
  const candidate = first[0];
  const second = broad.scan([a,b]);
  assert.strictEqual(second, first, 'array de candidatos deve ser reutilizado');
  assert.strictEqual(second[0], candidate, 'objeto candidato deve ser reutilizado');
});
