const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

class MockCanvas {
  constructor(){ this.width=100; this.height=100; this.style={}; this.nodeName='CANVAS'; this.tagName='CANVAS'; }
  addEventListener(){} removeEventListener(){}
  getContext(){ return {
    fillRect(){}, clearRect(){}, getImageData(){ return {data:new Uint8ClampedArray(4)}; }, putImageData(){}, createImageData(){return[];},
    setTransform(){}, drawImage(){}, save(){}, restore(){}, beginPath(){}, moveTo(){}, lineTo(){}, closePath(){}, stroke(){},
    translate(){}, scale(){}, rotate(){}, arc(){}, fill(){}, rect(){}, clip(){}, fillText(){}, measureText(){return{width:0};}, transform(){}
  }; }
}
if (!global.window) global.window = {};
if (!global.HTMLCanvasElement) global.HTMLCanvasElement = MockCanvas;
if (!global.document) global.document = { createElement: t => t === 'canvas' ? new MockCanvas() : {style:{}} };

async function loadESM(rel){ return import(pathToFileURL(path.resolve(__dirname,'..',rel)).href + `?t=${Date.now()}_${Math.random()}`); }

test('P15.2: corte em t=0 preserva a extremidade sem romper a corda antes do backend', async () => {
  const { Physics } = await loadESM('frontend/src/engine/Physics.js');
  const calls = [];
  const kiteA = { userId:'A', lineHP:100, maxLineHP:100, shieldCount:0, updateHPBar(){}, rope:{ nodeCount:12, breakAt(i,t){ calls.push([i,t]); return {segmentIndex:i,segmentT:t}; } } };
  const kiteB = { userId:'B', lineHP:100, maxLineHP:100, shieldCount:0, updateHPBar(){} };
  const result = Physics.finalizeCut(kiteB, kiteA, { x:10,y:20,z:0,kiteA,kiteB,segmentIndexA:2,segmentIndexB:8,s:0,t:0.7 });
  assert.deepEqual(calls, [], 'claim local não pode romper a RopePhysics antes da validação canônica');
  assert.equal(result.breakInfo.segmentIndex, 2);
  assert.equal(result.breakInfo.segmentT, 0);
  assert.equal(result.breakInfo.breakPoint.x, 10);
  assert.equal(result.breakInfo.breakPoint.y, 20);
});

test('P15.1: RopePhysics localiza segmento e fração mais próximos do cutX/cutY remoto', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const rope = new RopePhysics({nodeCount:6});
  rope.resetPositions({x:0,y:0,z:0},{x:100,y:0,z:0});
  const hit = rope.findClosestSegmentToPoint(46, 3);
  assert.equal(hit.segmentIndex, 2);
  assert.ok(Math.abs(hit.t - 0.3) < 0.06, `t=${hit.t}`);
  assert.ok(hit.distance <= 3.1, `distance=${hit.distance}`);
});

test('P15.1: coupling desloca contato sem converter correção posicional em impulso Verlet', async () => {
  const { RopePhysics } = await loadESM('frontend/src/engine/physics/RopePhysics.js');
  const { RopeCollision } = await loadESM('frontend/src/engine/physics/RopeCollision.js');
  const a = new RopePhysics({nodeCount:12});
  const b = new RopePhysics({nodeCount:12});
  a.resetPositions({x:100,y:900,z:0},{x:800,y:300,z:0});
  b.resetPositions({x:800,y:900,z:0},{x:100,y:300,z:0});
  const hit = RopeCollision.checkRopeCollision(a,b,4.5);
  assert.equal(hit.hit,true);
  const n = a.nodes[hit.segmentIndexA];
  n.prevX = n.x - 1; n.prevY = n.y - 2; // velocidade implícita conhecida
  RopeCollision.applyMutualContactCoupling(a,b,hit,0.35);
  const implicitSpeed = Math.hypot(n.x-n.prevX,n.y-n.prevY);
  assert.ok(implicitSpeed < 3, `correção injetou velocidade artificial: ${implicitSpeed}`);
});

test('P15.1: acumulador de resposta aplica frenagem uma vez mesmo com 3 relinhos simultâneos', async () => {
  const { CombatContactAccumulator } = await loadESM('frontend/src/engine/physics/CombatContactAccumulator.js');
  const kite = { userId:'A', x:0,y:0,vx:10,vy:0,lineTension:.7 };
  const opponents = [
    {userId:'B',x:100,y:0,lineTension:.7},
    {userId:'C',x:0,y:100,lineTension:.7},
    {userId:'D',x:-100,y:0,lineTension:.7}
  ];
  const acc = new CombatContactAccumulator();
  for (const other of opponents) acc.addPair(kite, other, 1);
  acc.apply();
  assert.ok(kite.vx > 8.0, `3 contatos não podem zerar a velocidade: vx=${kite.vx}`);
  assert.ok(Math.hypot(kite.x,kite.y) <= 7.0, `pull agregado precisa ser limitado: ${Math.hypot(kite.x,kite.y)}`);
});

test('P15.1: SparkEmitter recicla Graphics expirados em vez de realocar continuamente', async () => {
  const { SparkEmitter } = await loadESM('frontend/src/entities/SparkEmitter.js');
  const emitter = new SparkEmitter();
  emitter.visible = true;
  emitter.emit(10,10,8);
  const first = new Set(emitter.particles.map(p=>p.graphic));
  for(let i=0;i<40;i++) emitter.update(1);
  assert.equal(emitter.particles.length,0);
  assert.ok(emitter.particlePool?.length >= 8, 'partículas expiradas devem entrar no pool');
  emitter.emit(20,20,8);
  const reused = emitter.particles.filter(p=>first.has(p.graphic)).length;
  assert.equal(reused,8,'o segundo burst deve reutilizar os mesmos Graphics');
  emitter.destroy({children:true});
});

test('P15.1: backend usa ropeNodes para rejeitar corte impossível entre linhas paralelas distantes', () => {
  const { validateCutClaim } = require('../backend/cutClaimValidator');
  const rules = { activePlayers:new Map([['A',{}],['B',{}]]) };
  const now = Date.now();
  const states = new Map([
    ['A',{updatedAt:now,screenWidth:1080,screenHeight:1920,baseX:100,baseY:100,x:900,y:100,ropeNodes:[{x:100,y:100},{x:900,y:100}]}],
    ['B',{updatedAt:now,screenWidth:1080,screenHeight:1920,baseX:100,baseY:600,x:900,y:600,ropeNodes:[{x:100,y:600},{x:900,y:600}]}]
  ]);
  const result = validateCutClaim({winnerId:'A',loserId:'B',cutX:500,cutY:350},rules,states,now);
  assert.equal(result.ok,false);
});

test('P15.1: runtime atualiza voadas e linhas rompidas dentro do fixed timestep e limita FX contínuo', () => {
  const app = fs.readFileSync(path.resolve(__dirname,'../frontend/src/engine/App.js'),'utf8');
  const fixedStart = app.indexOf('this._physicsClock.update');
  const fixedEnd = app.indexOf('// Render visual consistente', fixedStart);
  const fixedBlock = app.slice(fixedStart,fixedEnd);
  assert.match(fixedBlock,/fk\.update\(fixedDelta/);
  assert.match(fixedBlock,/bhr\.update\(fixedDelta/);
  assert.match(app,/CombatContactAccumulator/);
  assert.doesNotMatch(app,/kA\.syncLineVisual\?\.\(\);\s*kB\.syncLineVisual\?\.\(\);/);
  assert.match(app,/_combatSparkBudget/);
});

test('P15.1: checkpoint backend preserva ropeNodes sanitizados para validação física do corte', () => {
  const { capturePlayerStates } = require('../backend/arenaLiveState');
  const rules = { activePlayers:new Map([['A',{}]]) };
  const buffs = { getPlayerBuff(){ return {lineType:'algodao'}; } };
  const states = capturePlayerStates({width:1080,height:1920,kites:[{
    userId:'A',x:800,y:300,baseX:200,baseY:1750,lineHP:100,
    ropeNodes:[{x:200,y:1750},{x:480,y:900},{x:800,y:300}]
  }]}, rules, buffs, 12345);
  assert.ok(states instanceof Map);
  assert.deepEqual(states.get('A').ropeNodes, [
    {x:200,y:1750},{x:480,y:900},{x:800,y:300}
  ]);
});
