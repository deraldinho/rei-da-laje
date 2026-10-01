const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const moduleUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/LineContactManager.js')).href;

const kite=id=>({userId:id});
const hit=(slide=2)=>({hit:true,x:10,y:20,z:0,segmentIndexA:1,segmentIndexB:2,s:.35,t:.65,
  distance:0.4,contactRadius:4,sinAngle:.8,relativeVx:slide,relativeVy:0,slidingSpeed:slide,slideA:slide,slideB:slide});
const physics=(slide=2,normal=.7)=>({vSlide:slide,normalForce:normal,tensionA:.6,tensionB:.7,
  effectiveTension:.65,crossingAngle:Math.asin(.8),sinAngle:.8,relativeVx:slide,relativeVy:0});

test('mesmo par reutiliza objeto e acumula tempo e distância de contato',async()=>{
  const {LineContactManager}=await import(`${moduleUrl}?t=${Date.now()}`);
  const m=new LineContactManager({maxTrackedContacts:12,releaseGraceSec:.22});
  const a=kite('a'),b=kite('b');
  m.beginStep(0,1/60); const first=m.touch('a|b',a,b,hit(3),physics(3)); m.endStep(0);
  m.beginStep(16.67,1/60); const second=m.touch('a|b',a,b,hit(3),physics(3)); m.endStep(16.67);
  assert.strictEqual(second,first);
  assert.ok(second.contactTime>=2/60-1e-6);
  assert.ok(second.slidingDistance>=6/60-1e-6);
  assert.equal(m.contacts.size,1);
});

test('contato não visto entra em RELEASE, recontato na graça reutiliza objeto e reinicia tempo contínuo',async()=>{
  const {LineContactManager}=await import(`${moduleUrl}?t=${Date.now()}`);
  const m=new LineContactManager({maxTrackedContacts:4,releaseGraceSec:.22});
  const a=kite('a'),b=kite('b');
  m.beginStep(0,.05); const c=m.touch('a|b',a,b,hit(),physics()); m.endStep(0);
  m.beginStep(50,.05); m.endStep(50);
  assert.equal(c.phase,'RELEASE'); assert.equal(c.active,false);
  m.beginStep(100,.05); const reused=m.touch('a|b',a,b,hit(),physics()); m.endStep(100);
  assert.strictEqual(reused,c);
  assert.ok(reused.contactTime<=.051,'tempo contínuo deve reiniciar após separação');
  m.beginStep(400,.05); m.endStep(400);
  assert.equal(m.contacts.size,0,'contato RELEASE deve expirar após grace');
});

test('pool limita contatos rastreados ao máximo configurado',async()=>{
  const {LineContactManager}=await import(`${moduleUrl}?t=${Date.now()}`);
  const m=new LineContactManager({maxTrackedContacts:12});
  m.beginStep(0,1/60);
  for(let i=0;i<13;i++) m.touch(`a${i}|b${i}`,kite(`a${i}`),kite(`b${i}`),hit(2),physics(2));
  m.endStep(0);
  assert.equal(m.contacts.size,12);
  assert.ok(m.metrics().droppedContacts>=1);
});

test('seleção respeita limites global/per-rope e prioriza contato fisicamente produtivo',async()=>{
  const {LineContactManager}=await import(`${moduleUrl}?t=${Date.now()}`);
  const m=new LineContactManager({maxTrackedContacts:12,maxSolvedContacts:3,maxContactsPerRope:1});
  m.beginStep(0,.1);
  const a=kite('a'),b=kite('b'),c=kite('c'),d=kite('d'),e=kite('e');
  m.touch('a|b',a,b,hit(0),physics(0,.05));
  m.touch('a|c',a,c,hit(8),physics(8,1));
  m.touch('b|d',b,d,hit(5),physics(5,.8));
  m.touch('c|e',c,e,hit(4),physics(4,.7));
  m.endStep(0);
  const selected=m.selectForSolve();
  assert.ok(selected.length<=3);
  const ids=new Set(); for(const item of selected){ assert.ok(!ids.has(item.lineAId)); assert.ok(!ids.has(item.lineBId)); ids.add(item.lineAId);ids.add(item.lineBId); }
  assert.ok(selected.some(x=>x.pairKey==='a|c'),'alto slide/normal deve vencer contato estéril');
});

test('empates de score rotacionam em seleções repetidas',async()=>{
  const {LineContactManager}=await import(`${moduleUrl}?t=${Date.now()}`);
  const m=new LineContactManager({maxTrackedContacts:4,maxSolvedContacts:1,maxContactsPerRope:1});
  m.beginStep(0,.1);
  for(let i=0;i<3;i++) m.touch(`a${i}|b${i}`,kite(`a${i}`),kite(`b${i}`),hit(2),physics(2,.5));
  m.endStep(0);
  const seen=new Set();
  for(let i=0;i<4;i++) seen.add(m.selectForSolve()[0]?.pairKey);
  assert.ok(seen.size>1,`empate não rotacionou: ${[...seen]}`);
});
