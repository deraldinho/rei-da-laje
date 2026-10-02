const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src/engine');
const load=file=>import(pathToFileURL(path.join(root,file)).href+`?t=${Date.now()}-${Math.random()}`);

test('40 pipas só com vento conseguem produzir corte em até 20s',async()=>{
 const [{Wind},{KiteDynamics},{RopePhysics},{LineContactSystem},{PlayerIntentController},{spawnTargetForRank}]=await Promise.all([
  load('Wind.js'),load('physics/KiteDynamics.js'),load('physics/RopePhysics.js'),load('physics/LineContactSystem.js'),
  load('physics/PlayerIntentController.js'),load('SpawnLayout.js')]);
 const count=40,w=1080,h=1920,dt=1/60;
 const kites=Array.from({length:count},(_,i)=>{
  const sp=spawnTargetForRank(i,count,w,h),baseX=w*(.10+.80*i/(count-1));
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});
  const k={userId:`ambient${i}`,x:sp.x,y:sp.y,z:0,baseX,baseY:h*.92,baseZ:0,vx:0,vy:0,vz:0,mass:.85,
   screenWidth:w,screenHeight:h,windPhase:i*.73,lineType:'algodao',lineHP:100,maxLineHP:100,lineSlack:0,lineTension:.75,
   likeBoostRemaining:0,spawnProtection:0,isAscending:false,rooftopPlayer:{layoutIndex:i},rope};
  rope.resetPositions({x:baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:0});k.intentController=new PlayerIntentController(k);return k;
 });
 const system=new LineContactSystem();let firstCut=null,maxTracked=0,maxSolved=0;
 for(let frame=0;frame<1200&&firstCut===null;frame++){
  KiteDynamics._stepFrame=frame;const wind=Wind.sample(frame/60);
  for(const k of kites){KiteDynamics.step(k,dt,wind,count,kites);k.rope.step(dt,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},k._localPhysicsWind||wind,{lineSlack:k.lineSlack,lineTension:k.lineTension});}
  const r=system.step(kites,dt,frame*1000/60,{allowWear:true});maxTracked=Math.max(maxTracked,r.metrics.trackedContacts||0);maxSolved=Math.max(maxSolved,r.metrics.solvedContacts||0);
  if(r.cuts.length)firstCut=frame/60;
 }
 assert.ok(firstCut!==null&&firstCut<20,`primeiro corte ambiental tardio: ${firstCut}`);
 assert.ok(maxTracked<=12&&maxSolved<=3,`budget regrediu ${maxTracked}/${maxSolved}`);
});