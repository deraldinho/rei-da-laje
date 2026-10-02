const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src/engine');
const load=file=>import(pathToFileURL(path.join(root,file)).href+`?t=${Date.now()}-${Math.random()}`);
const motionKeys=['x','y','z','vx','vy','vz'];
const snapshot=k=>Object.fromEntries(motionKeys.map(key=>[key,k[key]]));

async function controlledKite(){
  const [{PlayerIntentController},{RopePhysics}]=await Promise.all([
    load('physics/PlayerIntentController.js'),load('physics/RopePhysics.js')]);
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});
  const kite={userId:'u',nickname:'U',x:480,y:420,z:110,vx:1,vy:-.5,vz:.25,mass:.85,rotation:0,
    baseX:400,baseY:1760,baseZ:0,screenWidth:1080,screenHeight:1920,windPhase:.4,
    lineSlack:0,lineTension:.7,spawnProtection:0,isAscending:false,rope};
  rope.resetPositions({x:kite.baseX,y:kite.baseY,z:0},{x:kite.x,y:kite.y,z:kite.z});
  kite.intentController=new PlayerIntentController(kite);
  return kite;
}

test('chat apenas agenda intenção e nunca move a pipa antes do passo físico',async()=>{
  const {startChatAction,applyChatAction}=await load('ChatControls.js');
  for(const action of ['puxar','descarregar','embicar','tenteio']){
    const kite=await controlledKite(),before=snapshot(kite);
    assert.equal(startChatAction(kite,action),true,action);
    applyChatAction(kite,1,{x:1,y:0,z:.1,gust:1});
    assert.deepEqual(snapshot(kite),before,`${action} não pode escrever posição/velocidade`);
    assert.ok(kite.intentController.currentAction,'ação deve virar intenção física');
  }
});

test('manobra retão agenda controlador sem escrever coordenadas',async()=>{
  const {applyManeuverMovement}=await load('Maneuvers.js');
  const kite=await controlledKite(),before=snapshot(kite);
  kite.maneuver={name:'retao',duration:2,remaining:2,reach:250,speed:1.4};
  const other={x:620,y:430,z:100,isAscending:false,spawnProtection:0};
  assert.equal(applyManeuverMovement(kite,[kite,other],1,{x:1,y:0,z:0,gust:1}),true);
  assert.deepEqual(snapshot(kite),before,'retão deve ser sequência física, não deslocamento');
  assert.equal(kite.intentController.currentAction,'retao');
});

test('chat, manobras e teclado não contêm escrita cinemática direta',()=>{
  const chat=fs.readFileSync(path.join(root,'ChatControls.js'),'utf8');
  const maneuvers=fs.readFileSync(path.join(root,'Maneuvers.js'),'utf8');
  const app=fs.readFileSync(path.join(root,'App.js'),'utf8');
  const write=/kite\.(?:x|y|z|vx|vy|vz)\s*(?:\+=|-=|\*=|\/=|=)/;
  assert.doesNotMatch(chat,write);
  assert.doesNotMatch(maneuvers,write);
  const keyboardStart=app.indexOf('  executeKeyboardAction(');
  const keyboardEnd=app.indexOf('  setupSocketEvents()',keyboardStart);
  assert.ok(keyboardStart>=0&&keyboardEnd>keyboardStart,'bloco de teclado deve ser encontrado');
  const keyboard=app.slice(keyboardStart,keyboardEnd);
  assert.doesNotMatch(keyboard,write);
});

test('retão físico faz solta -> orienta -> puxa na direção adquirida',async()=>{
  const [{KiteDynamics},{PlayerIntentController}]=await Promise.all([
    load('physics/KiteDynamics.js'),load('physics/PlayerIntentController.js')]);
  const kite=await controlledKite();
  kite.vx=0;kite.vy=0;kite.vz=0;kite.heading=0;kite.attitude=null;
  kite.intentController=new PlayerIntentController(kite);
  kite.intentController.triggerAction('retao',1.5,{intensity:1,steerDir:1});
  const initialSpool=kite.rope.spoolLength;
  let releaseSpool=initialSpool,headingAfterTurn=0,speedBeforePull=0,maxSpeedAfterPull=0;
  for(let frame=0;frame<120;frame++){
    KiteDynamics._stepFrame=frame;
    const wind={x:.85,y:.02,z:.08,gust:1,turbulence:0,current:'normal'};
    KiteDynamics.step(kite,1/60,wind,2);
    kite.rope.step(1/60,{x:kite.baseX,y:kite.baseY,z:0},{x:kite.x,y:kite.y,z:kite.z},wind,{});
    if(frame===24) releaseSpool=kite.rope.spoolLength;
    if(frame===46){headingAfterTurn=kite.heading;speedBeforePull=kite.contactSpeed;}
    if(frame>55) maxSpeedAfterPull=Math.max(maxSpeedAfterPull,kite.contactSpeed||0);
  }
  assert.ok(releaseSpool>initialSpool+10,'fase inicial deve liberar linha');
  assert.ok(Math.abs(headingAfterTurn)>.08,'desbico deve adquirir direção com linha frouxa');
  assert.ok(kite.rope.spoolLength<releaseSpool,'fase final deve recolher linha');
  assert.ok(maxSpeedAfterPull>speedBeforePull*1.08,'puxada deve produzir passagem mais forte');
});
