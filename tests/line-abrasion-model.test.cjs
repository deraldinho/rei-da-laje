const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const physicsUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/LineContactPhysics.js')).href;
const abrasionUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/LineAbrasionModel.js')).href;
const configUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/RelinhoPhysicsConfig.js')).href;
const materialUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/LineMaterial.js')).href;

function kite(id,material,tension=.7){ return {userId:id,lineType:material.type,rope:{material,getNaturalTension:()=>tension},lineTension:tension}; }
function hit(slide=0,sinAngle=1){ return {hit:true,x:0,y:0,z:0,sinAngle,slidingSpeed:slide,slideA:slide,slideB:-slide,
  relativeVx:slide,relativeVy:0,segmentIndexA:1,segmentIndexB:1,s:.5,t:.5,distance:0,contactRadius:2}; }
function contact(metrics,time=.5){ return {...metrics,contactTime:time,slidingDistance:0,abrasionA:0,abrasionB:0,abrasionRateA:0,abrasionRateB:0}; }

test('contato engatado gera desgaste mínimo mesmo sem slide e fricção multiplica o dano',async()=>{
  const [{computeLineContactPhysics},{integrateLineAbrasion},{DEFAULT_RELINHO_PHYSICS_CONFIG},{getLineMaterial}]=await Promise.all([
    import(`${physicsUrl}?t=${Date.now()}`),import(`${abrasionUrl}?t=${Date.now()}`),import(configUrl),import(materialUrl)]);
  const a=kite('a',getLineMaterial('algodao')),b=kite('b',getLineMaterial('algodao'));
  const none=computeLineContactPhysics(a,b,{hit:false},DEFAULT_RELINHO_PHYSICS_CONFIG);
  assert.equal(none.vSlide,0); assert.equal(none.normalForce,0);
  const low=contact(computeLineContactPhysics(a,b,hit(0),DEFAULT_RELINHO_PHYSICS_CONFIG),.5);
  const high=contact(computeLineContactPhysics(a,b,hit(0),DEFAULT_RELINHO_PHYSICS_CONFIG),.5);
  integrateLineAbrasion(low,a,b,1/60,{...DEFAULT_RELINHO_PHYSICS_CONFIG,frictionMultiplier:.5});
  integrateLineAbrasion(high,a,b,1/60,{...DEFAULT_RELINHO_PHYSICS_CONFIG,frictionMultiplier:2});
  assert.ok(low.wearDeltaA>0&&low.wearDeltaB>0,'contato válido não pode ficar sem dano');
  assert.ok(high.wearDeltaA>low.wearDeltaA*3.9,'fricção deve multiplicar o desgaste');
});

test('slide maior aumenta a taxa de abrasão e tensão maior aumenta dentro de limites',async()=>{
  const [{computeLineContactPhysics},{integrateLineAbrasion},{DEFAULT_RELINHO_PHYSICS_CONFIG},{getLineMaterial}]=await Promise.all([
    import(`${physicsUrl}?t=${Date.now()}`),import(`${abrasionUrl}?t=${Date.now()}`),import(configUrl),import(materialUrl)]);
  const mat=getLineMaterial('algodao');
  const lowA=kite('a',mat,.4),lowB=kite('b',mat,.4);
  const highA=kite('a',mat,.9),highB=kite('b',mat,.9);
  const slow=contact(computeLineContactPhysics(lowA,lowB,hit(2),DEFAULT_RELINHO_PHYSICS_CONFIG));
  const fast=contact(computeLineContactPhysics(lowA,lowB,hit(8),DEFAULT_RELINHO_PHYSICS_CONFIG));
  integrateLineAbrasion(slow,lowA,lowB,1/60,DEFAULT_RELINHO_PHYSICS_CONFIG);
  integrateLineAbrasion(fast,lowA,lowB,1/60,DEFAULT_RELINHO_PHYSICS_CONFIG);
  assert.ok(fast.abrasionRateA>slow.abrasionRateA);
  const tense=contact(computeLineContactPhysics(highA,highB,hit(8),DEFAULT_RELINHO_PHYSICS_CONFIG));
  integrateLineAbrasion(tense,highA,highB,1/60,DEFAULT_RELINHO_PHYSICS_CONFIG);
  assert.ok(tense.abrasionRateA>fast.abrasionRateA);
  assert.ok(Number.isFinite(tense.abrasionRateA));
});

test('contato curto não gera desgaste instantâneo e contato prolongado acumula trabalho',async()=>{
  const [{computeLineContactPhysics},{integrateLineAbrasion},{DEFAULT_RELINHO_PHYSICS_CONFIG},{getLineMaterial}]=await Promise.all([
    import(`${physicsUrl}?t=${Date.now()}`),import(`${abrasionUrl}?t=${Date.now()}`),import(configUrl),import(materialUrl)]);
  const a=kite('a',getLineMaterial('algodao'),.8),b=kite('b',getLineMaterial('algodao'),.8);
  const metrics=computeLineContactPhysics(a,b,hit(12),DEFAULT_RELINHO_PHYSICS_CONFIG);
  const short=contact(metrics,.02); integrateLineAbrasion(short,a,b,1/60,DEFAULT_RELINHO_PHYSICS_CONFIG);
  assert.equal(short.wearDeltaA,0);
  const long=contact(metrics,.5); for(let i=0;i<60;i++) integrateLineAbrasion(long,a,b,1/60,DEFAULT_RELINHO_PHYSICS_CONFIG);
  assert.ok(long.abrasionA>0); assert.ok(long.slidingDistance>0);
});

test('material e direção local produzem desgaste assimétrico sem regra fixa de quem se move vence',async()=>{
  const [{computeLineContactPhysics},{integrateLineAbrasion},{DEFAULT_RELINHO_PHYSICS_CONFIG},{getLineMaterial}]=await Promise.all([
    import(`${physicsUrl}?t=${Date.now()}`),import(`${abrasionUrl}?t=${Date.now()}`),import(configUrl),import(materialUrl)]);
  const a=kite('a',getLineMaterial('chile'),.85), b=kite('b',getLineMaterial('algodao'),.55);
  const h=hit(10); h.slideA=10; h.slideB=-2;
  const c1=contact(computeLineContactPhysics(a,b,h,DEFAULT_RELINHO_PHYSICS_CONFIG));
  integrateLineAbrasion(c1,a,b,1/60,DEFAULT_RELINHO_PHYSICS_CONFIG);
  assert.notEqual(c1.abrasionRateA,c1.abrasionRateB);
  assert.ok(c1.abrasionRateB>c1.abrasionRateA,'chilena deve poder desgastar mais o algodão');
  const h2={...h,slideA:-10,slideB:2};
  const c2=contact(computeLineContactPhysics(a,b,h2,DEFAULT_RELINHO_PHYSICS_CONFIG));
  integrateLineAbrasion(c2,a,b,1/60,DEFAULT_RELINHO_PHYSICS_CONFIG);
  assert.notEqual(c2.abrasionRateA,c1.abrasionRateA,'sinal/direção local deve influenciar exposição');
});

test('trocar A/B preserva a física quando velocidades relativas e slides são transformados',async()=>{
  const [{computeLineContactPhysics},{integrateLineAbrasion},{DEFAULT_RELINHO_PHYSICS_CONFIG},{getLineMaterial}]=await Promise.all([
    import(`${physicsUrl}?t=${Date.now()}`),import(`${abrasionUrl}?t=${Date.now()}`),import(configUrl),import(materialUrl)]);
  const a=kite('a',getLineMaterial('chile'),.85), b=kite('b',getLineMaterial('algodao'),.55);
  const forwardHit={...hit(10),slideA:10,slideB:-2,relativeVx:7,relativeVy:1};
  const reverseHit={...forwardHit,slideA:2,slideB:-10,relativeVx:-7,relativeVy:-1,
    segmentIndexA:forwardHit.segmentIndexB,segmentIndexB:forwardHit.segmentIndexA,s:forwardHit.t,t:forwardHit.s};
  const forward=contact(computeLineContactPhysics(a,b,forwardHit,DEFAULT_RELINHO_PHYSICS_CONFIG));
  const reverse=contact(computeLineContactPhysics(b,a,reverseHit,DEFAULT_RELINHO_PHYSICS_CONFIG));
  integrateLineAbrasion(forward,a,b,1/60,DEFAULT_RELINHO_PHYSICS_CONFIG);
  integrateLineAbrasion(reverse,b,a,1/60,DEFAULT_RELINHO_PHYSICS_CONFIG);
  assert.ok(Math.abs(forward.abrasionRateA-reverse.abrasionRateB)<1e-12,'wear da mesma linha A deve ser invariável');
  assert.ok(Math.abs(forward.abrasionRateB-reverse.abrasionRateA)<1e-12,'wear da mesma linha B deve ser invariável');
});
