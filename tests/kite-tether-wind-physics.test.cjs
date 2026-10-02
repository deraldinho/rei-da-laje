const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src/engine');
const load=f=>import(pathToFileURL(path.join(root,f)).href+`?t=${Date.now()}-${Math.random()}`);

function makeRopeKite(RopePhysics,id='kite'){
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});
  const k={userId:id,x:540,y:360,z:100,baseX:540,baseY:1760,baseZ:0,
    vx:0,vy:0,vz:0,mass:.85,screenWidth:1080,screenHeight:1920,windPhase:.7,
    lineTension:.6,lineSlack:0,spawnProtection:0,isAscending:false,
    rooftopPlayer:{layoutIndex:3,layoutTotal:40},rope};
  rope.resetPositions({x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z});
  return k;
}

test('vento 3D deforma também a profundidade da corda',async()=>{
  const {RopePhysics}=await load('physics/RopePhysics.js');
  const calm=new RopePhysics({nodeCount:12}),windy=new RopePhysics({nodeCount:12});
  const hand={x:0,y:900,z:0},kite={x:120,y:220,z:80};
  calm.resetPositions(hand,kite);windy.resetPositions(hand,kite);
  calm.adjustSpoolLength(160);windy.adjustSpoolLength(160);
  for(let i=0;i<120;i++){calm.step(1/60,hand,kite,{x:0,y:0,z:0},{});windy.step(1/60,hand,kite,{x:1,y:.3,z:.9},{});}
  const m=Math.floor(calm.nodes.length/2);
  assert.ok(Math.abs(windy.nodes[m].z-calm.nodes[m].z)>2,'vento Z não está deformando a linha');
});
test('comprimento liberado não cresce sozinho quando a pipa estica a linha',async()=>{
  const [{RopePhysics},{SpoolController}]=await Promise.all([load('physics/RopePhysics.js'),load('physics/SpoolController.js')]);
  const rope=new RopePhysics({nodeCount:12});
  const hand={x:0,y:1000,z:0},kite={x:0,y:200,z:0};
  rope.resetPositions(hand,kite);const released=rope.spoolLength;
  const spool=new SpoolController(rope);spool.step(1/60,0);
  rope.step(1/60,hand,{x:0,y:0,z:0},{x:1,y:0,z:0},{});
  assert.ok(Math.abs(rope.spoolLength-released)<1,'a linha liberou comprimento sem carretel');
});

test('puxar carretel aproxima a pipa da mão em 3D',async()=>{
  const [{RopePhysics},{KiteDynamics}]=await Promise.all([load('physics/RopePhysics.js'),load('physics/KiteDynamics.js')]);
  const neutral=makeRopeKite(RopePhysics,'neutral'),pull=makeRopeKite(RopePhysics,'pull');
  neutral.intentController={update:()=>({spoolCommand:0})};
  pull.intentController={update:()=>({spoolCommand:-1})};
  for(let frame=0;frame<180;frame++){
    KiteDynamics._stepFrame=frame;const wind={x:1.05,y:-.06,z:.12,gust:1};
    for(const k of [neutral,pull]){KiteDynamics.step(k,1/60,wind,2,[neutral,pull]);k.rope.step(1/60,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},k._localPhysicsWind||wind,{});}
  }
  const dn=Math.hypot(neutral.x-neutral.baseX,neutral.y-neutral.baseY,neutral.z-neutral.baseZ);
  const dp=Math.hypot(pull.x-pull.baseX,pull.y-pull.baseY,pull.z-pull.baseZ);
  assert.ok(dp<dn-40,`puxar não aproximou a pipa: pull=${dp.toFixed(1)} neutral=${dn.toFixed(1)}`);
});
test('comprimentos diferentes de linha produzem alturas diferentes sob o mesmo vento',async()=>{
  const [{RopePhysics},{KiteDynamics}]=await Promise.all([load('physics/RopePhysics.js'),load('physics/KiteDynamics.js')]);
  const short=makeRopeKite(RopePhysics,'short'),long=makeRopeKite(RopePhysics,'long');
  short.rope.adjustSpoolLength(-260);long.rope.adjustSpoolLength(180);
  short.intentController={update:()=>({spoolCommand:0})};long.intentController={update:()=>({spoolCommand:0})};
  for(let frame=0;frame<240;frame++){
    KiteDynamics._stepFrame=frame;const wind={x:1.15,y:-.08,z:.14,gust:1.05};
    for(const k of [short,long]){KiteDynamics.step(k,1/60,wind,2,[short,long]);k.rope.step(1/60,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},k._localPhysicsWind||wind,{});}
  }
  assert.ok(short.y>long.y+35,`altura não responde ao comprimento: short=${short.y.toFixed(1)} long=${long.y.toFixed(1)}`);
});
test('inverter vento Z inverte a barriga 3D da linha',async()=>{
  const {RopePhysics}=await load('physics/RopePhysics.js');
  const plus=new RopePhysics({nodeCount:12}),minus=new RopePhysics({nodeCount:12});
  const hand={x:0,y:900,z:0},kite={x:140,y:220,z:0};
  plus.resetPositions(hand,kite);minus.resetPositions(hand,kite);
  plus.adjustSpoolLength(180);minus.adjustSpoolLength(180);
  for(let i=0;i<120;i++){plus.step(1/60,hand,kite,{x:0,y:0,z:.9,gust:1},{});minus.step(1/60,hand,kite,{x:0,y:0,z:-.9,gust:1},{});}
  const m=Math.floor(plus.nodes.length/2),diff=plus.nodes[m].z-minus.nodes[m].z;
  assert.ok(diff>4,`vento Z não atravessa a física da corda: diff=${diff.toFixed(2)}`);
});
test('vento moderado sustenta uma pipa com linha funcionalmente tensionada',async()=>{
  const [{Wind},{RopePhysics},{KiteDynamics}]=await Promise.all([load('Wind.js'),load('physics/RopePhysics.js'),load('physics/KiteDynamics.js')]);
  Wind.setSettings({windIntensity:'moderado',windDirection:'auto',relinhoPace:'normal'});
  const k=makeRopeKite(RopePhysics,'moderate');
  for(let frame=0;frame<480;frame++){KiteDynamics._stepFrame=frame;const wind=Wind.sample(frame/60);KiteDynamics.step(k,1/60,wind,1,[k]);k.rope.step(1/60,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},k._localPhysicsWind||wind,{});}
  const st=k.rope.getMechanicalState();
  assert.ok(st.strain>.82,`vento moderado deixou linha frouxa demais: strain=${st.strain.toFixed(3)}`);
  assert.ok(st.tension>.35,`vento moderado não tensionou a linha: tension=${st.tension.toFixed(3)}`);
});
test('vento tensiona uma linha com barriga sem comando de carretel',async()=>{
  const {RopePhysics}=await load('physics/RopePhysics.js');
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});
  const hand={x:0,y:1000,z:0},kite={x:0,y:200,z:80};
  rope.resetPositions(hand,kite);rope.adjustSpoolLength(280);
  for(let i=0;i<180;i++) rope.step(1/60,hand,kite,{x:1.3,y:-.12,z:.28,gust:1.05},{});
  const st=rope.getMechanicalState(hand,kite);
  assert.ok(st.strain<.8,'pré-condição: linha deveria continuar com barriga');
  assert.ok(st.tension>.18,`vento não tensionou a linha com barriga: ${st.tension.toFixed(3)}`);
});
test('vento mantém diversidade de profundidade sem colar todas as pipas no mesmo Z',async()=>{
  const [{Wind},{RopePhysics},{KiteDynamics}]=await Promise.all([load('Wind.js'),load('physics/RopePhysics.js'),load('physics/KiteDynamics.js')]);
  Wind.setSettings({windIntensity:'moderado',windDirection:'auto',relinhoPace:'normal'});
  const kites=Array.from({length:20},(_,i)=>{const k=makeRopeKite(RopePhysics,`z${i}`);k.baseX=120+i*(840/19);k.x=k.baseX;k.z=45+(i%5)*34;k.windPhase=i*.73;k.rooftopPlayer={layoutIndex:i,layoutTotal:20};k.rope.resetPositions({x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z});return k;});
  for(let frame=0;frame<900;frame++){KiteDynamics._stepFrame=frame;const wind=Wind.sample(frame/60);for(const k of kites){KiteDynamics.step(k,1/60,wind,20,kites);k.rope.step(1/60,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},k._localPhysicsWind||wind,{})}}
  const zs=kites.map(k=>k.z),span=Math.max(...zs)-Math.min(...zs);
  assert.ok(span>40,`profundidade colapsou: zSpan=${span.toFixed(1)}`);
});
test('carretel conserva comprimento total entre linha liberada e enrolada',async()=>{
  const {RopePhysics}=await load('physics/RopePhysics.js');
  const rope=new RopePhysics({nodeCount:12,totalLineLength:1800,minSpoolLength:80});
  rope.resetPositions({x:0,y:1000,z:0},{x:0,y:200,z:0});
  assert.equal(rope.totalLineLength,1800);
  assert.equal(rope.releasedLength,rope.spoolLength);
  assert.ok(Math.abs(rope.releasedLength+rope.woundLength-1800)<1e-9);
  rope.adjustSpoolLength(300);
  assert.ok(Math.abs(rope.releasedLength+rope.woundLength-1800)<1e-9);
  rope.adjustSpoolLength(-500);
  assert.ok(Math.abs(rope.releasedLength+rope.woundLength-1800)<1e-9);
});
test('linha liberada segura a pipa contra vento forte sem parede de cenário',async()=>{
  const [{RopePhysics},{KiteDynamics}]=await Promise.all([load('physics/RopePhysics.js'),load('physics/KiteDynamics.js')]);
  const rope=new RopePhysics({nodeCount:12,totalLineLength:1800,minSpoolLength:80});
  const k={userId:'tether',x:0,y:300,z:0,baseX:0,baseY:1100,baseZ:0,vx:0,vy:0,vz:0,mass:.85,screenWidth:1080,screenHeight:1920,windPhase:.2,lineTension:.7,lineSlack:0,spawnProtection:0,isAscending:false,rooftopPlayer:{layoutIndex:0},rope};
  rope.resetPositions({x:0,y:1100,z:0},{x:0,y:300,z:0});
  rope.adjustSpoolLength(-80);
  const released=rope.spoolLength;
  for(let f=0;f<300;f++){KiteDynamics._stepFrame=f;const wind={x:2.2,y:-.3,z:.7,gust:1.2};KiteDynamics.step(k,1/60,wind,1,[k]);rope.step(1/60,{x:0,y:1100,z:0},{x:k.x,y:k.y,z:k.z},k._localPhysicsWind||wind,{})}
  const dist=Math.hypot(k.x,k.y-1100,k.z);
  assert.ok(dist<=released*1.08,`linha não segurou a pipa: dist=${dist.toFixed(1)} released=${released.toFixed(1)}`);
  assert.ok(rope.tension>.25,'linha tensionada deve reagir ao vento forte');
});

test('limites de tela não alteram posição física da pipa',async()=>{
  const [{RopePhysics},{KiteDynamics}]=await Promise.all([load('physics/RopePhysics.js'),load('physics/KiteDynamics.js')]);
  const rope=new RopePhysics({nodeCount:12,totalLineLength:5000,minSpoolLength:80});
  const k={userId:'free',x:1250,y:250,z:420,baseX:540,baseY:1760,baseZ:0,vx:0,vy:0,vz:0,mass:.85,screenWidth:1080,screenHeight:1920,windPhase:.1,lineTension:.1,lineSlack:1,spawnProtection:0,isAscending:false,rooftopPlayer:{layoutIndex:0},rope};
  rope.resetPositions({x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z});rope.adjustSpoolLength(1200);
  KiteDynamics._stepFrame=1;KiteDynamics.step(k,1/60,{x:0,y:0,z:0,gust:1},1,[k]);
  assert.ok(k.x>1000,`x foi preso à câmera: ${k.x}`);
  assert.ok(k.z>300,`z foi preso à câmera: ${k.z}`);
});

test('vento forte tensiona a linha mesmo quando o tirante está alinhado ao vento',async()=>{
  const {RopePhysics}=await load('physics/RopePhysics.js');
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao',totalLineLength:1800});
  const hand={x:0,y:900,z:0},kite={x:780,y:900,z:0};
  rope.resetPositions(hand,kite);
  rope.adjustSpoolLength(300);
  for(let i=0;i<240;i++){
    rope.step(1/60,hand,kite,{x:1.95,y:0,z:0,gust:1.05},{});
  }
  const st=rope.getMechanicalState(hand,kite);
  assert.ok(st.strain<.8,`pré-condição: a linha deve manter barriga, strain=${st.strain.toFixed(3)}`);
  assert.ok(st.tension>.25,`vento forte alinhado não transmitiu carga ao tirante: tension=${st.tension.toFixed(3)}`);
});

test('windInfluence altera a resposta física inicial ao mesmo campo de vento',async()=>{
  const [{KiteDynamics},{RopePhysics}]=await Promise.all([load('physics/KiteDynamics.js'),load('physics/RopePhysics.js')]);
  const run=influence=>{KiteDynamics._globalTime=0;KiteDynamics._lastFrame=-1;KiteDynamics._stepFrame=0;const rope=new RopePhysics({nodeCount:12,lineType:'algodao',totalLineLength:5000});const k={userId:`w${influence}`,x:540,y:520,z:100,baseX:540,baseY:1760,baseZ:0,vx:0,vy:0,vz:0,mass:.85,aeroArea:1,screenWidth:1080,screenHeight:1920,windPhase:.5,windInfluence:influence,lineSlack:1,lineTension:.2,rooftopPlayer:{layoutIndex:2},rope};rope.resetPositions({x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z});rope.adjustSpoolLength(2200);for(let frame=0;frame<6;frame++){KiteDynamics._stepFrame=frame;const wind={x:1.35,y:-.12,z:.18,gust:1};KiteDynamics.step(k,1/60,wind,1,[k]);rope.step(1/60,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},k._localPhysicsWind||wind,{})}return {wind:Math.hypot(k._localPhysicsWind.x,k._localPhysicsWind.y,k._localPhysicsWind.z),speed:Math.hypot(k.vx,k.vy,k.vz)}};
  const low=run(.8),high=run(1.4);
  assert.ok(high.wind>low.wind*1.15,`vento local não respeita sensibilidade: low=${low.wind.toFixed(2)} high=${high.wind.toFixed(2)}`);
  assert.ok(high.speed>low.speed,`resposta inicial não aumentou: low=${low.speed.toFixed(2)} high=${high.speed.toFixed(2)}`);
});
