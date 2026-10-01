const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../frontend/src/engine/ArenaCheckpoint.js'),'utf8');
const ready=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('checkpoint restaura somente participantes ativos da mesma sessão',async()=>{
 const {captureArena,readArenaCheckpoint}=await ready;
 const mock=(userId,lineHP=44)=>({userId,x:240,y:360,baseX:120,targetX:330,targetY:370,lineHP,maxLineHP:100,
 spawnProtection:0,isAscending:false,windPhase:1,windInfluence:1,score:2,streak:1,likeBoostRemaining:0,maneuver:null});
 const state=captureArena([mock('a'),mock('b')],'sessao-1',10000);
 assert.equal(readArenaCheckpoint(JSON.stringify(state),'sessao-1',['a'],12000).size,1);
 assert.equal(readArenaCheckpoint(JSON.stringify(state),'sessao-2',['a'],12000).size,0);
 assert.equal(readArenaCheckpoint(JSON.stringify(state),'sessao-1',['a'],110001).size,0);
 assert.equal(readArenaCheckpoint('{','sessao-1',['a'],12000).size,0);
});

test('checkpoint impede HP acima do máximo e não recria linha destruída',async()=>{
 const {restoreKiteState}=await ready;
 const kite={screenWidth:1080,screenHeight:1920,maxLineHP:100,updateHPBar(){},line:{update(){}},tail:{update(){}},visualScale:1};
 assert.equal(restoreKiteState(kite,{x:-100,y:5000,lineHP:800,spawnProtection:10,isAscending:false,
 windPhase:1,windInfluence:1,likeBoostRemaining:0,maneuver:null}),true);
 assert.equal(kite.lineHP,100);
 assert.equal(kite.x,30);
 assert.ok(kite.y<=1920*0.65);
});

test('checkpoint captura iterador uma única vez e preserva âncora e destino em nova resolução',async()=>{
 const {captureArena,restoreKiteState}=await ready;
 const original={userId:'a',screenWidth:1440,screenHeight:2560,x:720,y:640,baseX:360,
   targetX:960,targetY:740,lineHP:37,maxLineHP:100,spawnProtection:0,isAscending:false,
   windPhase:1,windInfluence:1,score:1,streak:1,likeBoostRemaining:0,maneuver:null};
 const snapshot=captureArena([original].values(),'sessao',10000);
 assert.equal(snapshot.kites.length,1);
 assert.equal(snapshot.width,1440);
 assert.equal(snapshot.kites[0].baseX,360);
 const restored={screenWidth:1080,screenHeight:1920,maxLineHP:100,updateHPBar(){},
   line:{update(){}},tail:{update(){}},visualScale:1};
 assert.equal(restoreKiteState(restored,snapshot.kites[0]),true);
 assert.equal(restored.x,540);
 assert.equal(restored.y,480);
 assert.equal(restored.baseX,270);
 assert.equal(restored.targetX,720);
 assert.equal(restored.targetY,555);
 assert.equal(restored.lineHP,37);
});
