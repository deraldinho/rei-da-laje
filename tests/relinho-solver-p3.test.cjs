const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
async function load(relative){return import(pathToFileURL(path.resolve(__dirname,'..',relative)).href+`?t=${Date.now()}-${Math.random()}`);}

function mockKite(opts={}){
  return {userId:opts.userId||'p',x:400,y:300,baseX:400,baseY:900,lineHP:opts.lineHP??100,maxLineHP:100,
    shieldCount:opts.shieldCount??0,lineType:opts.lineType||'algodao',lineTension:opts.lineTension??.8,
    rope:opts.rope||null,maneuver:null,defenseWindowRemaining:0,chatCombo:{defense:1,attack:1},
    takeDamage(){throw new Error('compatibilidade nova não pode chamar takeDamage');},triggerShieldAbsorb(){},updateHPBar(){}};
}
function contact(slide=12){return {phase:'GRINDING',contactTime:.5,slidingSpeed:slide,vSlide:slide,slideA:slide,slideB:-slide,
  relativeVx:slide,relativeVy:0,sinAngle:1,x:400,y:500,z:0,segmentIndexA:2,segmentIndexB:3,s:.3,t:.7};}

test('P3.1 - fachada tribológica mantém vSlide explícito zero como abrasão zero',async()=>{
  const {RelinhoContactSolver}=await load('frontend/src/engine/physics/RelinhoContactSolver.js');
  const a=mockKite(),b=mockKite({userId:'b'});
  const work=RelinhoContactSolver.calculateFrictionalWork(a,b,{x:400,y:500},{...contact(0),slidingSpeed:0,vSlide:0});
  assert.equal(work.damageRateA,0); assert.equal(work.damageRateB,0); assert.equal(work.slidingSpeed,0);
});

test('P3.2 - fachada preserva assimetria física Chile versus Algodão/Kevlar',async()=>{
  const {RelinhoContactSolver}=await load('frontend/src/engine/physics/RelinhoContactSolver.js');
  const chile=mockKite({lineType:'chile'}), cotton=mockKite({userId:'cotton'}), kevlar=mockKite({userId:'kevlar',lineType:'kevlar'});
  const c=contact(12);
  const duel1=RelinhoContactSolver.calculateFrictionalWork(chile,cotton,c,c);
  assert.ok(duel1.damageRateB>duel1.damageRateA,'Chile deve desgastar mais o algodão');
  const duel2=RelinhoContactSolver.calculateFrictionalWork(cotton,kevlar,c,c);
  assert.ok(duel2.damageRateB<duel2.damageRateA,'Kevlar deve sofrer menos desgaste');
});

test('P3.3 - fachada acumula desgaste localizado sem mutação de HP por takeDamage',async()=>{
  const [{RelinhoContactSolver},{RopePhysics}]=await Promise.all([load('frontend/src/engine/physics/RelinhoContactSolver.js'),load('frontend/src/engine/physics/RopePhysics.js')]);
  const ra=new RopePhysics({nodeCount:6,lineType:'algodao'}), rb=new RopePhysics({nodeCount:6,lineType:'algodao'});
  ra.tension=rb.tension=1;
  const a=mockKite({rope:ra}),b=mockKite({userId:'b',rope:rb}); const c=contact(20);
  for(let i=0;i<20;i++) RelinhoContactSolver.resolveCombatStep(a,b,c,1,c);
  assert.ok(ra.segmentWear[2]>0); assert.ok(rb.segmentWear[3]>0);
  assert.equal(ra.segmentWear[0],0); assert.equal(rb.segmentWear[0],0);
});

test('P3.4 - segmento pré-desgastado rompe pela fachada e preserva ponto físico',async()=>{
  const [{RelinhoContactSolver},{RopePhysics}]=await Promise.all([load('frontend/src/engine/physics/RelinhoContactSolver.js'),load('frontend/src/engine/physics/RopePhysics.js')]);
  const ra=new RopePhysics({nodeCount:6,lineType:'algodao'}), rb=new RopePhysics({nodeCount:6,lineType:'algodao'}); ra.tension=rb.tension=1; rb.segmentWear[3]=.999;
  const a=mockKite({userId:'a',rope:ra}),b=mockKite({userId:'b',rope:rb}); const c=contact(40);
  const result=RelinhoContactSolver.resolveCombatStep(a,b,c,1,c,(winner,loser,pt)=>({tied:false,winner,loser,cutX:pt.x,cutY:pt.y,segmentIndex:pt.segmentIndexB,segmentT:pt.t}));
  assert.equal(result.tied,false); assert.equal(result.loser.userId,'b'); assert.equal(result.segmentIndex,3); assert.equal(result.segmentT,.7);
});

test('P3.5 - Physics.finalizeCut mantém escudo como único consumidor local de ruptura',async()=>{
  const [{Physics},{RopePhysics}]=await Promise.all([load('frontend/src/engine/Physics.js'),load('frontend/src/engine/physics/RopePhysics.js')]);
  const rope=new RopePhysics({nodeCount:6,lineType:'kevlar'}); rope.segmentWear.fill(.8);
  const winner=mockKite({userId:'winner'}), loser=mockKite({userId:'loser',rope,shieldCount:1,lineHP:0});
  const outcome=Physics.finalizeCut(winner,loser,{x:10,y:20,kiteA:winner,kiteB:loser,segmentIndexB:2,t:.4});
  assert.equal(outcome.absorbedByShield,true); assert.equal(loser.shieldCount,0); assert.equal(loser.lineHP,loser.maxLineHP);
  assert.ok([...rope.segmentWear].every(v=>v===0));
});

test('P3.6 - ruptura simultânea simétrica pela fachada resolve vencedor determinístico',async()=>{
  const [{RelinhoContactSolver},{RopePhysics}]=await Promise.all([load('frontend/src/engine/physics/RelinhoContactSolver.js'),load('frontend/src/engine/physics/RopePhysics.js')]);
  const ra=new RopePhysics({nodeCount:6,lineType:'algodao'}),rb=new RopePhysics({nodeCount:6,lineType:'algodao'}); ra.tension=rb.tension=1; ra.segmentWear[2]=.999; rb.segmentWear[3]=.999;
  const a=mockKite({userId:'duel_a',rope:ra}),b=mockKite({userId:'duel_b',rope:rb}); const c=contact(40);
  const result=RelinhoContactSolver.resolveCombatStep(a,b,c,1,c,(winner,loser,pt)=>({tied:false,winner,loser,cutX:pt.x,cutY:pt.y}));
  assert.equal(result.tied,false); assert.ok(result.winner&&result.loser); assert.notEqual(result.winner.userId,result.loser.userId);
});
