const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src');
const load=file=>import(pathToFileURL(path.join(root,file)).href+`?t=${Date.now()}-${Math.random()}`);

test('4 usuários simulados entram em relinho físico quando a Live gera interações',async()=>{
 const [{Wind},{KiteDynamics},{RopePhysics},{LineContactSystem},{PlayerIntentController},{LiveInputBuffer},{spawnTargetForRank},{RopeCollision},layout,{physicsWorldScale}]=await Promise.all([
  load('engine/Wind.js'),load('engine/physics/KiteDynamics.js'),load('engine/physics/RopePhysics.js'),load('engine/physics/LineContactSystem.js'),
  load('engine/physics/PlayerIntentController.js'),load('engine/physics/LiveInputBuffer.js'),load('engine/SpawnLayout.js'),load('engine/physics/RopeCollision.js'),load('ui/RooftopLayout.js'),load('engine/physics/PhysicsScale.js')]);
 const {rooftopSlotOrder,rooftopPlayerLayout,rooftopHandAnchor}=layout;
 const count=4,w=1432,h=2428,dt=1/60,order=rooftopSlotOrder(count,w,h),worldScale=physicsWorldScale(w,h),kites=[];
 for(let i=0;i<count;i++){
  const id=`sim_bot_${i}`,slot=rooftopPlayerLayout(order[i],count,w,h),hand=rooftopHandAnchor(slot.x,slot.y,slot.scale,slot.scale,0),sp=spawnTargetForRank(i,i+1,w,h);
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao',totalLineLength:1800*worldScale,minSpoolLength:80*worldScale,worldScale});
  const k={userId:id,isSimulation:true,x:sp.x,y:sp.y,z:0,baseX:hand.x,baseY:hand.y,baseZ:0,vx:0,vy:0,vz:0,mass:.85,
   screenWidth:w,screenHeight:h,physicsScale:worldScale,windPhase:i*.73,lineType:'algodao',lineHP:100,maxLineHP:100,lineSlack:0,lineTension:.75,
   spawnProtection:3,isAscending:true,rooftopPlayer:{layoutIndex:order[i]},rope};
  rope.resetPositions({x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:0});k.intentController=new PlayerIntentController(k);k.inputBuffer=new LiveInputBuffer(k);kites.push(k);
 }
 const system=new LineContactSystem();let maxTracked=0,minProtected=100;const before=kites.map(k=>({x:k.x,y:k.y,z:k.z}));
 const kinds=['like','share','follow','gift'];
 for(let frame=0;frame<1200;frame++){
  const time=frame/60;KiteDynamics._stepFrame=frame;const wind=Wind.sample(time);
  if(frame>=180&&frame%36===0){
    for(let i=0;i<kites.length;i++)kites[i].inputBuffer.addInteraction(kinds[i],kinds[i]==='like'?20:1,{userId:kites[i].userId,wind,nowMs:frame*1000/60});
  }
  for(const k of kites){
    k.spawnProtection=Math.max(0,k.spawnProtection-dt);if(k.isAscending&&k.spawnProtection<=0)k.isAscending=false;
    KiteDynamics.step(k,dt,wind,count,kites);k.rope.step(dt,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},k._localPhysicsWind||wind,{});
  }
  const r=system.step(kites,dt,frame*1000/60,{allowWear:true});for(const job of r.couplingJobs)RopeCollision.applyMutualContactCoupling(job.ropeA,job.ropeB,job.inter);
  maxTracked=Math.max(maxTracked,r.metrics.trackedContacts||0);const hp=Math.min(...kites.map(k=>k.lineHP));
  if(frame<180)minProtected=Math.min(minProtected,hp);
 }
 assert.equal(minProtected,100,'proteção de spawn não pode causar dano');
 assert.ok(maxTracked>=1,`nenhum relinho físico após interações: tracked=${maxTracked}`);
 const moved=Math.max(...kites.map((k,i)=>Math.hypot(k.x-before[i].x,k.y-before[i].y,k.z-before[i].z)));
 assert.ok(moved>80,`interações não movimentaram as pipas o suficiente: ${moved.toFixed(1)}`);
});
