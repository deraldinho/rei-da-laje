const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src/engine');
const load=file=>import(pathToFileURL(path.join(root,file)).href+`?t=${Date.now()}-${Math.random()}`);
const kite={x:400,y:420,z:90,vx:0,vy:0,vz:0,attitude:{heading:0,pitch:0,roll:0},lineTension:.6,lineSlack:.12,screenWidth:1080,screenHeight:1920};
const wind={x:.7,y:0,z:.15,gust:1};

test('retão prefere corredor alcançável com maior densidade de linhas',async()=>{
  const {planGiftManeuver}=await load('physics/GiftManeuverAI.js');
  const density={scoreCorridor:(origin,dir)=>dir.x>0.15?12:dir.x<-.15?2:4};
  const plan=planGiftManeuver(kite,{name:'retao',reach:300,speed:1.4,duration:4},wind,density);
  assert.ok(plan.steerDir>0,JSON.stringify(plan));
  assert.ok(plan.corridorScore>=10);
  assert.ok(plan.intensity>=.6&&plan.intensity<=2);
  assert.ok(plan.duration>=.4&&plan.duration<=2.4);
});

test('planner nunca retorna jogador alvo e perseguir vira fluxo denso',async()=>{
  const {planGiftManeuver}=await load('physics/GiftManeuverAI.js');
  const density={scoreCorridor:()=>3};
  const plan=planGiftManeuver(kite,{name:'perseguir',reach:230,speed:1.1,duration:4},wind,density);
  assert.equal(plan.profile,'dense_flow');
  assert.equal('target' in plan,false);assert.equal('player' in plan,false);
  assert.deepEqual(Object.keys(plan).sort(),['corridorScore','duration','heading','intensity','profile','steerDir'].sort());
});

test('produção de manobra não contém seleção de oponente',()=>{
  const maneuvers=fs.readFileSync(path.join(root,'Maneuvers.js'),'utf8');
  const controller=fs.readFileSync(path.join(root,'physics/PlayerIntentController.js'),'utf8');
  assert.doesNotMatch(maneuvers,/maneuverTarget\s*\(|target\s*=/);
  assert.doesNotMatch(controller,/findClosestTarget\s*\(|targetKite/);
});

test('falha/ausência do campo de densidade degrada para plano físico finito',async()=>{
  const {planGiftManeuver}=await load('physics/GiftManeuverAI.js');
  for(const field of [null,{scoreCorridor(){throw new Error('stale');}}]){
    const plan=planGiftManeuver(kite,{name:'retao',reach:300,speed:1.4,duration:4},wind,field);
    for(const key of ['steerDir','intensity','duration','heading','corridorScore'])assert.ok(Number.isFinite(plan[key]),key);
  }
});
