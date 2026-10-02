const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src/engine');
const load=f=>import(pathToFileURL(path.join(root,f)).href+`?${Date.now()}-${Math.random()}`);

test('vento normal produz PvP sem massacrar 40 pipas em poucos segundos',async()=>{
 const [{Wind},{KiteDynamics},{RopePhysics},{LineContactSystem},{PlayerIntentController},{spawnTargetForRank}]=await Promise.all([
  load('Wind.js'),load('physics/KiteDynamics.js'),load('physics/RopePhysics.js'),load('physics/LineContactSystem.js'),load('physics/PlayerIntentController.js'),load('SpawnLayout.js')]);
 Wind.setSettings({windIntensity:'moderado',windDirection:'auto',relinhoPace:'normal'});
 const w=1080,h=1920,dt=1/60,count=40;KiteDynamics._globalTime=0;KiteDynamics._lastFrame=-1;KiteDynamics._stepFrame=0;
 let kites=Array.from({length:count},(_,i)=>{const sp=spawnTargetForRank(i,count,w,h),baseX=w*(.10+.80*i/(count-1));const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});const k={userId:`bal${i}`,x:sp.x,y:sp.y,z:0,baseX,baseY:h*.92,baseZ:0,vx:0,vy:0,vz:0,mass:.85,screenWidth:w,screenHeight:h,windPhase:i*.73,windInfluence:1,lineType:'algodao',lineHP:100,maxLineHP:100,lineSlack:0,lineTension:.75,spawnProtection:0,isAscending:false,rooftopPlayer:{layoutIndex:i},rope};rope.resetPositions({x:baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:0});k.intentController=new PlayerIntentController(k);return k});
 const system=new LineContactSystem();let firstCut=null;
 for(let frame=0;frame<=720;frame++){KiteDynamics._stepFrame=frame;const wind=Wind.sample(frame/60);for(const k of kites){KiteDynamics.step(k,dt,wind,kites.length,kites);k.rope.step(dt,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},k._localPhysicsWind||wind,{lineSlack:k.lineSlack,lineTension:k.lineTension})}const r=system.step(kites,dt,frame*1000/60,{allowWear:true});if(r.cuts.length){if(firstCut===null)firstCut=frame/60;const losers=new Set(r.cuts.map(c=>String(c.loser?.userId)));kites=kites.filter(k=>!losers.has(String(k.userId)));}}
 assert.ok(firstCut!==null&&firstCut>=5&&firstCut<=12,`primeiro corte fora da janela: ${firstCut}`);
 assert.ok(kites.length>=34,`corte ambiental agressivo demais: restaram ${kites.length}/40 em 12s`);
});

test('vento moderado não rompe linha íntegra por tração sem comando do jogador',async()=>{
 const [{Wind},{KiteDynamics},{RopePhysics},{PlayerIntentController},{spawnTargetForRank}]=await Promise.all([
  load('Wind.js'),load('physics/KiteDynamics.js'),load('physics/RopePhysics.js'),load('physics/PlayerIntentController.js'),load('SpawnLayout.js')]);
 Wind.setSettings({windIntensity:'moderado',windDirection:'auto',relinhoPace:'normal'});
 const w=1080,h=1920,dt=1/60,count=40;KiteDynamics._globalTime=0;KiteDynamics._lastFrame=-1;KiteDynamics._stepFrame=0;
 const kites=Array.from({length:count},(_,i)=>{const sp=spawnTargetForRank(i,count,w,h),baseX=w*(.10+.80*i/(count-1));
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});const k={userId:`struct${i}`,x:sp.x,y:sp.y,z:0,baseX,baseY:h*.92,baseZ:0,
   vx:0,vy:0,vz:0,mass:.85,screenWidth:w,screenHeight:h,windPhase:i*.73,lineType:'algodao',lineSlack:0,lineTension:.75,
   spawnProtection:0,isAscending:false,rooftopPlayer:{layoutIndex:i},rope};rope.resetPositions({x:baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:0});k.intentController=new PlayerIntentController(k);return k;});
 for(let frame=0;frame<=720;frame++){KiteDynamics._stepFrame=frame;const wind=Wind.sample(frame/60);for(const k of kites){KiteDynamics.step(k,dt,wind,kites.length,kites);k.rope.step(dt,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},k._localPhysicsWind||wind,{})}}
 const broken=kites.filter(k=>k.rope.structuralFailure?.broke);
 assert.equal(broken.length,0,`vento moderado rompeu por tração: ${broken.map(k=>`${k.userId}:${k.rope.structuralLoad.toFixed(1)}`).join(', ')}`);
});
