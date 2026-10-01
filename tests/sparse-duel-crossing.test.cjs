const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const dynamicsUrl = pathToFileURL(path.resolve(__dirname, '../frontend/src/engine/physics/KiteDynamics.js')).href;
const width = 1000, height = 1800;
function kite(rank,total,windPhase=0){ return { rooftopPlayer:{layoutIndex:rank,layoutTotal:total}, windPhase, lineHP:100 }; }
function roundedPoint(p){ return `${p.x.toFixed(4)}|${p.y.toFixed(4)}`; }

test('2 sobreviventes usam fases opostas e trocam de corredor a cada meio ciclo', async () => {
  const { sparseCruiseTarget } = await import(`${dynamicsUrl}?t=${Date.now()}`);
  const a=kite(0,2,.17), b=kite(1,2,5.91);
  const t0a=sparseCruiseTarget(a,2,0,width,height), t0b=sparseCruiseTarget(b,2,0,width,height);
  const halfCycle=Math.PI/0.72;
  const t1a=sparseCruiseTarget(a,2,halfCycle,width,height), t1b=sparseCruiseTarget(b,2,halfCycle,width,height);
  assert.ok(t0a.x>width/2 && t0b.x<width/2);
  assert.ok(t1a.x<width/2 && t1b.x>width/2);
  assert.equal(a.lineHP,100); assert.equal(b.lineHP,100,'alvo de cruzeiro não pode alterar HP');
});

test('3 e 4 sobreviventes mantêm fases distribuídas sem colapsar no mesmo alvo', async () => {
  const { sparseCruiseTarget } = await import(`${dynamicsUrl}?t=${Date.now()}-multi`);
  for (const count of [3,4]) {
    for (const time of [0,1.75,4.5,8.25]) {
      const targets=Array.from({length:count},(_,rank)=>sparseCruiseTarget(kite(rank,count),count,time,width,height));
      const unique=new Set(targets.map(roundedPoint));
      assert.ok(unique.size>=Math.min(3,count),`${count} pipas não podem colapsar em um ponto em t=${time}`);
      const avgX=targets.reduce((sum,p)=>sum+p.x,0)/count;
      assert.ok(Math.abs(avgX-width/2)<1e-6,'fases horizontais devem permanecer uniformemente distribuídas');
    }
  }
});

test('layoutIndex determina a fase sparse, independente do windPhase aleatório', async () => {
  const { sparseCruiseTarget } = await import(`${dynamicsUrl}?t=${Date.now()}-phase`);
  for(const count of [2,3,4]){
    for(let rank=0;rank<count;rank++){
      const a=sparseCruiseTarget(kite(rank,count,.01),count,2.3,width,height);
      const b=sparseCruiseTarget(kite(rank,count,5.99),count,2.3,width,height);
      assert.deepEqual(a,b,'mesmo slot deve manter fase determinística');
    }
  }
});
