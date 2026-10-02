const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src/engine');
const load=file=>import(pathToFileURL(path.join(root,file)).href+`?t=${Date.now()}-${Math.random()}`);

function baseKite(){return {userId:'u',x:400,y:420,z:90,vx:0,vy:0,vz:0,lineTension:.62,lineSlack:.1,
  attitude:{heading:0,pitch:0,roll:0},rope:{spoolLength:900},screenWidth:1080,screenHeight:1920};}

test('comentário pode enviesar torque para lado com maior tráfego sem selecionar jogador',async()=>{
  const {createCommentGesture}=await load('physics/CommentGestureEngine.js');
  const kite=baseKite(),wind={x:.7,y:0,z:.1,gust:1};
  const right={scoreCorridor:(o,d)=>d.x>0?12:1};
  const left={scoreCorridor:(o,d)=>d.x<0?12:1};
  const a=createCommentGesture({text:'bora cortar geral 🔥',userId:'u',kite,wind,lineDensity:right,engagement:.8});
  const b=createCommentGesture({text:'bora cortar geral 🔥',userId:'u',kite,wind,lineDensity:left,engagement:.8});
  assert.ok(a.debicoTorque>0,`right=${a.debicoTorque}`);
  assert.ok(b.debicoTorque<0,`left=${b.debicoTorque}`);
});

test('gift planner reconhece corredor contendo múltiplas linhas reais do campo 3D',async()=>{
  const [{LineDensityField},{planGiftManeuver}]=await Promise.all([load('physics/LineDensityField.js'),load('physics/GiftManeuverAI.js')]);
  const field=new LineDensityField({width:1080,height:1920,depth:600,cellsX:10,cellsY:10,cellsZ:6,updateIntervalMs:1});
  const line=(id,dy)=>({userId:id,screenWidth:1080,screenHeight:1920,isAscending:false,spawnProtection:0,lineTension:.7,
    rope:{getNodes:()=>[{x:445,y:420+dy,z:125},{x:820,y:420+dy,z:410}]}});
  field.update([line('a',-12),line('b',0),line('c',12)],1000);
  const kite=baseKite();
  const plan=planGiftManeuver(kite,{name:'retao',reach:390,speed:1.55,duration:4},{x:.7,y:0,z:.15,gust:1},field);
  assert.ok(field.segmentCount>=3);
  assert.ok(plan.corridorScore>0,JSON.stringify(plan));
  assert.equal('target' in plan,false);
});

test('X em XY com separação Z continua sem contato e sem abrasão',async()=>{
  const [{RopePhysics},{RopeCollision},{integrateLineAbrasion}]=await Promise.all([
    load('physics/RopePhysics.js'),load('physics/RopeCollision.js'),load('physics/LineAbrasionModel.js')]);
  const a=new RopePhysics({nodeCount:12,lineType:'algodao'}),b=new RopePhysics({nodeCount:12,lineType:'cerol'});
  a.resetPositions({x:100,y:900,z:220},{x:800,y:300,z:220});
  b.resetPositions({x:800,y:900,z:40},{x:100,y:300,z:40});
  const contact=RopeCollision.checkRopeCollision(a,b,4.5,{maxZDistance:45,minSinAngle:.15});
  assert.equal(contact.hit,false);assert.equal(contact.reason,'Z_SEPARATION');
  integrateLineAbrasion(contact,{rope:a,lineType:'algodao'},{rope:b,lineType:'cerol'},1/60,
    {minSlideSpeed:0,minContactTime:0,engagementRampSec:.1,abrasionK:.02,frictionMultiplier:1,contactDamageFloor:.004});
  assert.equal(contact.wearDeltaA,0);assert.equal(contact.wearDeltaB,0);
});
