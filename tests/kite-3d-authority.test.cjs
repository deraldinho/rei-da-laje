const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const engineRoot=path.resolve(__dirname,'../frontend/src/engine');
const dynamicsPath=path.join(engineRoot,'physics/KiteDynamics.js');
const appPath=path.join(engineRoot,'App.js');
const threePath=path.resolve(__dirname,'../frontend/src/ui/ThreeSkyScene.js');

async function load(){
  const [{KiteDynamics},{RopePhysics}]=await Promise.all([
    import(pathToFileURL(dynamicsPath).href+`?t=${Date.now()}`),
    import(pathToFileURL(path.join(engineRoot,'physics/RopePhysics.js')).href+`?t=${Date.now()}-r`)
  ]);
  return {KiteDynamics,RopePhysics};
}

function makeKite(RopePhysics,id='a'){
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});
  const k={userId:id,x:520,y:430,z:90,vx:0,vy:0,vz:0,mass:.85,rotation:0,
    baseX:500,baseY:1760,baseZ:0,screenWidth:1080,screenHeight:1920,windPhase:.73,
    lineSlack:0,lineTension:.75,likeBoostRemaining:0,rooftopPlayer:{layoutIndex:3},rope};
  rope.resetPositions({x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z});
  return k;
}

test('física atualiza z/vz sem depender do renderer',async()=>{
  const {KiteDynamics,RopePhysics}=await load();
  const k=makeKite(RopePhysics);
  const z0=k.z, wind={x:1.05,y:.04,z:.55,gust:1,turbulence:.02,current:'normal'};
  for(let frame=0;frame<180;frame++){
    KiteDynamics._stepFrame=frame;
    KiteDynamics.step(k,1/60,wind,12);
    k.rope.step(1/60,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},wind,{});
  }
  assert.ok(Number.isFinite(k.vz),'vz precisa existir e ser finito');
  assert.ok(Math.abs(k.z-z0)>1,'vento/tensão precisam produzir profundidade física');
});

test('App e ThreeSkyScene jamais escrevem z do renderer de volta na entidade',()=>{
  const app=fs.readFileSync(appPath,'utf8');
  const three=fs.readFileSync(threePath,'utf8');
  assert.doesNotMatch(app,/kite\.z\s*=\s*k3d\.position\.z/);
  assert.doesNotMatch(three,/kite\.z\s*=\s*k3d\.position\.z/);
});

test('mesmos estados físicos produzem a mesma trajetória 3D sem estado visual',async()=>{
  const {KiteDynamics,RopePhysics}=await load();
  const a=makeKite(RopePhysics,'a'),b=makeKite(RopePhysics,'b');
  const wind={x:.92,y:.03,z:.25,gust:.96,turbulence:0,current:'normal'};
  for(let frame=0;frame<120;frame++){
    KiteDynamics._stepFrame=frame;
    KiteDynamics.step(a,1/60,wind,12); KiteDynamics.step(b,1/60,wind,12);
    for(const k of [a,b]) k.rope.step(1/60,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},wind,{});
  }
  for(const key of ['x','y','z','vx','vy','vz']) assert.ok(Math.abs(a[key]-b[key])<1e-9,`${key} divergiu`);
});
