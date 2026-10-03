const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const root=path.resolve(__dirname,'..');
const load=rel=>import(pathToFileURL(path.join(root,rel)).href+`?t=${Date.now()}-${Math.random()}`);

test('snapshot canônico restaura HP, profundidade, velocidade, carretel e desgaste',async()=>{
  const {applyArenaLiveState}=await load('frontend/src/engine/ArenaCheckpoint.js');
  const kite={
    userId:'u1',screenWidth:1080,screenHeight:1920,maxLineHP:100,lineHP:100,
    x:10,y:20,z:0,baseX:100,baseY:1700,baseZ:0,vx:0,vy:0,vz:0,
    updateHPBar(){this.hpUpdated=true;},line:{update(){}},tail:{update(){}},visualScale:1,
    rope:{
      spoolLength:900,segmentWear:new Float32Array(3),
      nodes:[0,1,2,3].map(()=>({x:0,y:0,z:0,prevX:0,prevY:0,prevZ:0,vx:0,vy:0,vz:0})),
      updateAABB(){this.aabbUpdated=true;}
    }
  };
  const kites=new Map([['u1',kite]]);
  const applied=applyArenaLiveState(kites,{sessionId:'s1',width:1080,height:1920,kites:[{
    userId:'u1',screenWidth:1080,screenHeight:1920,x:420,y:580,z:260,baseX:120,baseY:1720,baseZ:12,
    vx:3,vy:-4,vz:5,lineHP:63,maxLineHP:100,spawnProtection:0,isAscending:false,windPhase:2,windInfluence:1.1,
    lineTension:.72,targetLineTension:.70,likeSpool:0,likeSpoolRemaining:0,defenseWindowRemaining:0,likeBoostRemaining:0,
    spoolLength:1260,segmentWear:[.1,.4,.7],ropeNodes:[
      {x:120,y:1720,z:12},{x:210,y:1300,z:90},{x:320,y:900,z:170},{x:420,y:580,z:260}
    ],maneuver:null
  }]},'s1');
  assert.equal(applied,1);
  assert.equal(kite.lineHP,63);
  assert.equal(kite.z,260);
  assert.equal(kite.vz,5);
  assert.equal(kite.rope.spoolLength,1260);
  assert.ok(Math.abs(kite.rope.segmentWear[1]-.4)<1e-6);
  assert.equal(kite.rope.nodes[2].z,170);
  assert.equal(kite.rope.nodes[2].prevZ,170);
  assert.equal(kite.hpUpdated,true);
});

test('runtime transmite estado vivo somente pela autoridade e observadores aplicam arena:state',()=>{
  const app=fs.readFileSync(path.join(root,'frontend/src/engine/App.js'),'utf8');
  const server=fs.readFileSync(path.join(root,'backend/server.js'),'utf8');
  assert.match(app,/broadcastArenaLiveState\(\)/);
  assert.match(app,/this\.isCombatAuthority/);
  assert.match(app,/socket\.emit\('arena:live_state'/);
  assert.match(app,/_socketSubscriptions\.on\('arena:state'/);
  assert.match(app,/applyArenaLiveState\(/);
  assert.match(server,/socket\.on\('arena:live_state'/);
  assert.match(server,/socket\.id\s*!==\s*combatOwnerSocketId/);
  assert.match(server,/socket\.broadcast\.emit\('arena:state'/);
});
