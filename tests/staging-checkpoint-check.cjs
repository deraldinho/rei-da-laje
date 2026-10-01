const assert=require('node:assert/strict');
const {io}=require('socket.io-client');
const first=io('http://localhost:3116',{reconnection:false});
const observer=io('http://localhost:3116',{reconnection:false});
const ready=client=>client.connected?Promise.resolve():new Promise((resolve,reject)=>{client.once('connect',resolve);client.once('connect_error',reject);});
(async()=>{
 try{
  await Promise.all([ready(first),ready(observer)]);
  assert.equal((await new Promise(done=>first.emit('arena:claim_authority',done))).granted,true);
  assert.equal((await new Promise(done=>observer.emit('arena:claim_authority',done))).granted,false);
  const before=await (await fetch('http://localhost:3116/api/competition/arena')).json();
  const id=before.players[0].userId;
  const make=lineHP=>({width:1080,height:1920,kites:[{userId:id,x:321,y:654,lineHP,
    spawnProtection:0,isAscending:false,windPhase:2,windInfluence:1,likeBoostRemaining:0}]});
  first.emit('arena:heartbeat',{fps:59});
  first.emit('arena:checkpoint',make(37));
  await new Promise(r=>setTimeout(r,200));
  observer.emit('arena:checkpoint',make(99));
  await new Promise(r=>setTimeout(r,200));
  const after=await (await fetch('http://localhost:3116/api/competition/arena')).json();
  assert.equal(after.playerStates[id].lineHP,37);
  assert.equal(after.playerStates[id].x,321);
  const health=await (await fetch('http://localhost:3116/api/competition/health')).json();
  assert.equal(health.combat.fps,59);
  console.log('OK: HP 37 persistido, observador não alterou estado, FPS 59.');
 }catch(error){console.error(error);process.exitCode=1;}
 finally{first.disconnect();observer.disconnect();}
})();
