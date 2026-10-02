const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const ropeUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/RopePhysics.js')).href;
const physicsUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/LineContactPhysics.js')).href;
const abrasionUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/LineAbrasionModel.js')).href;
const breakUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/LineBreakSystem.js')).href;
const configUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/RelinhoPhysicsConfig.js')).href;

async function makeKite(id,type='algodao',tension=.8){
  const {RopePhysics}=await import(ropeUrl); const rope=new RopePhysics({nodeCount:6,lineType:type});
  rope.resetPositions({x:0,y:100,z:0},{x:100,y:0,z:0}); rope.tension=tension;
  return {userId:id,lineType:type,rope,maxLineHP:100,lineHP:100,x:100,y:0,baseX:0,baseY:100,
    _hpBarDirty:false,takeDamage(){throw new Error('takeDamage não deve ser usado pela abrasão física');}};
}
function hit(slide=12){return {hit:true,x:50,y:50,z:0,sinAngle:1,slidingSpeed:slide,slideA:slide,slideB:-slide,
  relativeVx:slide,relativeVy:0,segmentIndexA:2,segmentIndexB:3,s:.3,t:.7,distance:0,contactRadius:3};}

test('desgaste localizado rompe exatamente no segmento e coordenada do contato',async()=>{
  const [{applyLineWearAndEvaluateBreak},{DEFAULT_RELINHO_PHYSICS_CONFIG}]=await Promise.all([import(`${breakUrl}?t=${Date.now()}`),import(configUrl)]);
  const a=await makeKite('a'),b=await makeKite('b'); a.rope.segmentWear[2]=.995;
  const c={...hit(),lineAId:'a',lineBId:'b',wearDeltaA:1,wearDeltaB:0,abrasionRateA:1,abrasionRateB:0};
  const result=applyLineWearAndEvaluateBreak(c,a,b,DEFAULT_RELINHO_PHYSICS_CONFIG);
  assert.equal(result.loser,a); assert.equal(result.winner,b);
  assert.equal(result.segmentIndex,2); assert.equal(result.segmentT,.3);
  assert.equal(a.rope.segmentWear[2],1); assert.equal(a.rope.segmentWear[1],0);
  assert.equal(a.lineHP,0);
});

test('contato curto não corta, mas deslizamento prolongado rompe eventualmente',async()=>{
  const [{computeLineContactPhysics},{integrateLineAbrasion},{applyLineWearAndEvaluateBreak},{DEFAULT_RELINHO_PHYSICS_CONFIG}]=await Promise.all([
    import(`${physicsUrl}?t=${Date.now()}`),import(`${abrasionUrl}?t=${Date.now()}`),import(`${breakUrl}?t=${Date.now()}`),import(configUrl)]);
  const a=await makeKite('a'),b=await makeKite('b');
  const metrics=computeLineContactPhysics(a,b,hit(18),DEFAULT_RELINHO_PHYSICS_CONFIG);
  const c={...hit(18),...metrics,lineAId:'a',lineBId:'b',contactTime:.02,slidingDistance:0,abrasionA:0,abrasionB:0};
  integrateLineAbrasion(c,a,b,1/60,DEFAULT_RELINHO_PHYSICS_CONFIG);
  assert.equal(applyLineWearAndEvaluateBreak(c,a,b,DEFAULT_RELINHO_PHYSICS_CONFIG),null);
  assert.equal(a.rope.getWeakestSegmentIntegrity(),1);
  c.contactTime=.5;
  let result=null;
  for(let i=0;i<600&&!result;i++){
    integrateLineAbrasion(c,a,b,1/60,DEFAULT_RELINHO_PHYSICS_CONFIG);
    result=applyLineWearAndEvaluateBreak(c,a,b,DEFAULT_RELINHO_PHYSICS_CONFIG);
  }
  assert.ok(result,'contato abrasivo prolongado deve romper alguma linha');
  assert.ok(result.segmentIndex===2||result.segmentIndex===3);
});

test('ruptura simultânea idêntica usa desempate determinístico estável',async()=>{
  const [{applyLineWearAndEvaluateBreak},{DEFAULT_RELINHO_PHYSICS_CONFIG}]=await Promise.all([import(`${breakUrl}?t=${Date.now()}`),import(configUrl)]);
  const a=await makeKite('a'),b=await makeKite('b'); a.rope.segmentWear[2]=.995; b.rope.segmentWear[3]=.995;
  const c={...hit(),lineAId:'a',lineBId:'b',wearDeltaA:1,wearDeltaB:1,abrasionRateA:1,abrasionRateB:1};
  const result=applyLineWearAndEvaluateBreak(c,a,b,DEFAULT_RELINHO_PHYSICS_CONFIG);
  assert.equal(result.winner.userId,'a'); assert.equal(result.loser.userId,'b');
  assert.equal(result.segmentIndex,3); assert.equal(result.segmentT,.7);
});
test('falha estrutural converge no mesmo descritor localizado de ruptura',async()=>{
  const [{applyLineWearAndEvaluateBreak},{DEFAULT_RELINHO_PHYSICS_CONFIG}]=await Promise.all([
    import(`${breakUrl}?t=${Date.now()}-struct`),import(configUrl)]);
  const a=await makeKite('a'),b=await makeKite('b');
  a.rope.structuralFailure={broke:true,cause:'tension',segmentIndex:1,segmentT:.5,point:{x:30,y:70,z:0}};
  const c={...hit(),lineAId:'a',lineBId:'b',wearDeltaA:0,wearDeltaB:0,abrasionRateA:0,abrasionRateB:0};
  const result=applyLineWearAndEvaluateBreak(c,a,b,DEFAULT_RELINHO_PHYSICS_CONFIG);
  assert.equal(result.loser,a);assert.equal(result.winner,b);assert.equal(result.cause,'tension');
  assert.equal(result.segmentIndex,1);assert.equal(result.segmentT,.5);
});
