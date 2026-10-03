const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const SimulationBotPilot=require('../backend/simulationBotPilot');
const root=path.resolve(__dirname,'../frontend/src');
const load=file=>import(pathToFileURL(path.join(root,file)).href+`?t=${Date.now()}-${Math.random()}`);

test('4 bots do Admin entram em relinho físico após proteção',async()=>{
 const [{Wind},{KiteDynamics},{RopePhysics},{LineContactSystem},{PlayerIntentController},{spawnTargetForRank,stabilizeSpawnKite},{RopeCollision},layout,maneuvers,{LineDensityField},{physicsWorldScale}]=await Promise.all([
  load('engine/Wind.js'),load('engine/physics/KiteDynamics.js'),load('engine/physics/RopePhysics.js'),load('engine/physics/LineContactSystem.js'),
  load('engine/physics/PlayerIntentController.js'),load('engine/SpawnLayout.js'),load('engine/physics/RopeCollision.js'),load('ui/RooftopLayout.js'),
  load('engine/Maneuvers.js'),load('engine/physics/LineDensityField.js'),load('engine/physics/PhysicsScale.js')]);
 const {rooftopSlotOrder,rooftopPlayerLayout,rooftopHandAnchor}=layout;
 const {maneuverStats,applyManeuverMovement}=maneuvers;
 const count=4,w=1432,h=2428,dt=1/60,order=rooftopSlotOrder(count,w,h),density=new LineDensityField(),worldScale=physicsWorldScale(w,h);
 const players=new Map(),kites=[];
 for(let i=0;i<count;i++){
  const id=`sim_bot_${i}`,slot=rooftopPlayerLayout(order[i],count,w,h),hand=rooftopHandAnchor(slot.x,slot.y,slot.scale,slot.scale,0),sp=spawnTargetForRank(i,i+1,w,h);
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao',totalLineLength:1800*worldScale,minSpoolLength:80*worldScale});
  const k={userId:id,isSimulation:true,x:sp.x,y:sp.y,z:0,baseX:hand.x,baseY:hand.y,baseZ:0,vx:0,vy:0,vz:0,mass:.85,
   screenWidth:w,screenHeight:h,physicsScale:worldScale,windPhase:i*.73,lineType:'algodao',lineHP:100,maxLineHP:100,lineSlack:0,lineTension:.75,
   likeBoostRemaining:0,spawnProtection:3,isAscending:true,rooftopPlayer:{layoutIndex:order[i]},rope};
  rope.resetPositions({x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:0});k.intentController=new PlayerIntentController(k);kites.push(k);
  players.set(id,{userId:id,nickname:`Bot ${i}`,isSimulation:true,joinedAt:0});
 }
 const byId=new Map(kites.map(k=>[k.userId,k]));
 const io={emit:(name,data)=>{if(name!=='competition:maneuver')return;const k=byId.get(String(data.userId));if(!k)return;const stats=maneuverStats(data.giftName,data.giftCost,data.repeatCount);stats.remaining=stats.duration;k.maneuver=stats;}};
 const pilot=new SimulationBotPilot(io,{activePlayers:players},{minAgeMs:3000});
 const system=new LineContactSystem();let maxTracked=0,minHp=100,minProtected=100,firstDamage=null;
 for(let frame=0;frame<1200;frame++){
  const time=frame/60;KiteDynamics._stepFrame=frame;const wind=Wind.sample(time);
  density.update(kites,time*1000);if(frame%51===0)pilot.tick(time*1000);
  for(const k of kites){k.spawnProtection=Math.max(0,k.spawnProtection-dt);if(k.isAscending&&k.spawnProtection<=0)k.isAscending=false;applyManeuverMovement(k,kites,1,wind,density);KiteDynamics.step(k,dt,wind,count,kites);k.rope.step(dt,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},k._localPhysicsWind||wind,{lineSlack:k.lineSlack,lineTension:k.lineTension});}
  density.update(kites,time*1000);const r=system.step(kites,dt,frame*1000/60,{allowWear:true});for(const job of r.couplingJobs)RopeCollision.applyMutualContactCoupling(job.ropeA,job.ropeB,job.inter);
  maxTracked=Math.max(maxTracked,r.metrics.trackedContacts||0);const hp=Math.min(...kites.map(k=>k.lineHP));minHp=Math.min(minHp,hp);if(frame<180)minProtected=Math.min(minProtected,hp);if(firstDamage===null&&hp<100)firstDamage=time;
 }
 assert.equal(minProtected,100,'proteção de spawn não pode causar dano');
 assert.ok(maxTracked>=1,`nenhum relinho físico: tracked=${maxTracked}`);
 assert.ok(firstDamage!==null&&firstDamage<=15,`bots demoraram demais para brigar: ${firstDamage}`);
 assert.ok(minHp<100,`nenhum desgaste físico: ${minHp}`);
});
