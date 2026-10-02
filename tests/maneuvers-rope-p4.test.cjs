const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const loadESM=rel=>import(pathToFileURL(path.resolve(__dirname,'..',rel)).href);

function makeKite(RopePhysics,maneuver){
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});
  rope.resetPositions({x:400,y:900,z:0},{x:400,y:300,z:0});
  return {userId:'p4',x:400,y:300,baseX:400,baseY:900,z:0,
    screenWidth:800,screenHeight:1200,isAscending:false,spawnProtection:0,
    lineTension:.6,lineSlack:0,contactSpeed:0,rotation:0,rope,maneuver};
}

async function setup(name){
  const [{RopePhysics},{applyManeuverMovement},{PlayerIntentController},{SpoolController}]=await Promise.all([
    loadESM('frontend/src/engine/physics/RopePhysics.js'),loadESM('frontend/src/engine/Maneuvers.js'),
    loadESM('frontend/src/engine/physics/PlayerIntentController.js'),loadESM('frontend/src/engine/physics/SpoolController.js')]);
  const kite=makeKite(RopePhysics,name);kite.intentController=new PlayerIntentController(kite);
  return {kite,applyManeuverMovement,spool:new SpoolController(kite.rope)};
}
test('P4.1 - Retão libera, orienta e depois recolhe o carretel',async()=>{
  const {kite,applyManeuverMovement,spool}=await setup({name:'retao',duration:30,remaining:29,speed:1.55,reach:240});
  const initial=kite.rope.spoolLength;assert.equal(applyManeuverMovement(kite,[],1,{x:.2,y:0}),true);
  let intent=kite.intentController.update(1/60,{x:.2,y:0},[kite]);spool.step(1/60,intent.spoolCommand);
  assert.ok(intent.spoolCommand>0);assert.ok(kite.rope.spoolLength>initial);
  let peak=kite.rope.spoolLength,late=null;
  for(let i=0;i<110;i++){
    late=kite.intentController.update(1/60,{x:.2,y:0},[kite]);spool.step(1/60,late.spoolCommand);
    peak=Math.max(peak,kite.rope.spoolLength);
  }
  assert.ok(late.spoolCommand<0,'fase final do retão deve recolher');
  assert.ok(kite.rope.spoolLength<peak,'recolhimento deve reduzir comprimento a partir do pico');
});

test('P4.2 - Despicada libera linha e gera torque no vento',async()=>{
  const {kite,applyManeuverMovement,spool}=await setup({name:'despicar',duration:30,remaining:29,speed:1.35,reach:180});
  const initial=kite.rope.spoolLength;assert.equal(applyManeuverMovement(kite,[],1,{x:1.2,y:.1}),true);
  const intent=kite.intentController.update(1/60,{x:1.2,y:.1},[kite]);spool.step(1/60,intent.spoolCommand);
  assert.ok(intent.spoolCommand>0);assert.ok(intent.debicoTorque>0);assert.ok(kite.rope.spoolLength>initial);
});
test('P4.3 - Mergulho alterna folga na descida e tração na recuperação',async()=>{
  const {kite,applyManeuverMovement,spool}=await setup({name:'mergulho',duration:30,remaining:29,speed:1.5,reach:220});
  const initial=kite.rope.spoolLength;applyManeuverMovement(kite,[],1,{x:.2,y:0});
  let intent=kite.intentController.update(1/60,{x:.2,y:0},[kite]);spool.step(1/60,intent.spoolCommand);
  assert.ok(intent.spoolCommand>0);assert.ok(kite.rope.spoolLength>initial);
  let peak=kite.rope.spoolLength;
  for(let i=0;i<100;i++){
    intent=kite.intentController.update(1/60,{x:.2,y:0},[kite]);spool.step(1/60,intent.spoolCommand);
    peak=Math.max(peak,kite.rope.spoolLength);
  }
  assert.ok(intent.spoolCommand<0,'recuperação do mergulho deve recolher');
  assert.ok(kite.rope.spoolLength<peak);
});

test('P4.4 - Aparada alivia carga sem teleporte',async()=>{
  const {kite,applyManeuverMovement,spool}=await setup({name:'aparar_retao',duration:45,remaining:44,reach:150});
  const before={x:kite.x,y:kite.y},initial=kite.rope.spoolLength;
  assert.equal(applyManeuverMovement(kite,[],1,{x:.2,y:0}),true);
  const intent=kite.intentController.update(1/60,{x:.2,y:0},[kite]);spool.step(1/60,intent.spoolCommand);
  assert.ok(intent.tensionAssist<0);assert.ok(kite.rope.spoolLength>=initial);
  assert.deepEqual({x:kite.x,y:kite.y},before);
});
