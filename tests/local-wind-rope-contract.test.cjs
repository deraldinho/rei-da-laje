const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src');
const load=rel=>import(pathToFileURL(path.join(root,rel)).href+`?t=${Date.now()}-${Math.random()}`);

test('KiteDynamics publica o mesmo vento local usado pelo corpo para a corda',async()=>{
  const [{KiteDynamics},{RopePhysics},{PlayerIntentController}]=await Promise.all([
    load('engine/physics/KiteDynamics.js'),load('engine/physics/RopePhysics.js'),load('engine/physics/PlayerIntentController.js')]);
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});
  const kite={userId:'a',x:400,y:420,z:90,baseX:400,baseY:1700,baseZ:0,vx:0,vy:0,vz:0,mass:.85,
    screenWidth:1080,screenHeight:1920,windPhase:2.13,lineSlack:0,lineTension:.7,likeBoostRemaining:0,
    rooftopPlayer:{layoutIndex:7},rope};
  rope.resetPositions({x:kite.baseX,y:kite.baseY,z:0},{x:kite.x,y:kite.y,z:kite.z});
  kite.intentController=new PlayerIntentController(kite);
  KiteDynamics._globalTime=0;KiteDynamics._lastFrame=-1;KiteDynamics._stepFrame=1;
  const globalWind={x:1.1,y:.05,z:.02,gust:1};
  KiteDynamics.step(kite,1/60,globalWind,40,[kite]);
  assert.ok(kite._localPhysicsWind,'vento local precisa ficar disponível para RopePhysics');
  assert.notDeepEqual(kite._localPhysicsWind,globalWind,'vento local deve conter variação individual');
});

test('Kite envia vento local da própria física para RopePhysics.step',()=>{
  const source=fs.readFileSync(path.join(root,'entities/Kite.js'),'utf8');
  assert.match(source,/this\.rope\.step\([^\n]+this\._localPhysicsWind\s*\|\|\s*windObj/,
    'RopePhysics ainda está recebendo apenas vento global');
});