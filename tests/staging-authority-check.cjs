const assert = require('node:assert/strict');
const {io} = require('socket.io-client');
const base='http://localhost:3116';
const first=io(base,{reconnection:false}),second=io(base,{reconnection:false});
const connected=client=>client.connected ? Promise.resolve() : new Promise((resolve,reject)=>{client.once('connect',resolve);client.once('connect_error',reject);});
const claim=client=>new Promise(resolve=>client.emit('arena:claim_authority',resolve));
const post=async userId=>{
 const response=await fetch(base+'/api/simulate/comment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,nickname:userId,comment:'subir'})});
 assert.equal(response.status,200);
};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 try{
  await Promise.all([connected(first),connected(second)]);
  assert.equal((await claim(first)).granted,true);
  assert.equal((await claim(second)).granted,false);
  first.emit('arena:heartbeat',{fps:57});
  await post('staging-B');
  const before=await (await fetch(base+'/api/competition/stats')).json();
  second.emit('relinho:cut',{winnerId:'staging-A',loserId:'staging-B',cutX:100,cutY:100});
  await wait(200);
  const blocked=await (await fetch(base+'/api/competition/stats')).json();
  assert.equal(blocked.active,before.active);
  first.emit('relinho:cut',{winnerId:'staging-A',loserId:'staging-B',cutX:100,cutY:100});
  await wait(200);
  const accepted=await (await fetch(base+'/api/competition/stats')).json();
  assert.equal(accepted.active,before.active-1);
  assert.equal(accepted.top.find(p=>p.userId==='staging-A').cuts,before.top.find(p=>p.userId==='staging-A').cuts+1);
  const available=new Promise(resolve=>second.once('arena:authority_available',resolve));
  first.disconnect();
  await Promise.race([available,wait(2500).then(()=>{throw Error('Sem aviso de substituição');})]);
  assert.equal((await claim(second)).granted,true);
  second.emit('arena:heartbeat',{fps:62});
  await post('staging-B');
  second.emit('relinho:cut',{winnerId:'staging-A',loserId:'staging-B',cutX:120,cutY:120});
  await wait(200);
  const after=await (await fetch(base+'/api/competition/stats')).json();
  assert.equal(after.top.find(p=>p.userId==='staging-A').cuts,accepted.top.find(p=>p.userId==='staging-A').cuts+1);
  const health=await (await fetch(base+'/api/competition/health')).json();
  assert.equal(health.combat.fps,62);
  assert.ok(health.savedAt);
  console.log('OK: bloqueio de observador, substituição de executor, persistência e FPS.');
 }catch(error){console.error(error);process.exitCode=1;}
 finally{first.disconnect();second.disconnect();}
})();
