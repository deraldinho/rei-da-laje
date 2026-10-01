const assert=require('node:assert/strict');
const {io}=require('socket.io-client');
const base=process.env.PIPA_TEST_BASE||'http://127.0.0.1:3118';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const connected=c=>c.connected?Promise.resolve():new Promise((resolve,reject)=>{c.once('connect',resolve);c.once('connect_error',reject);});
const claim=c=>new Promise(resolve=>c.emit('arena:claim_authority',resolve));
const post=async(path,body)=>{
 const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 assert.equal(r.status,200);return r.json();
};
const arena=async()=>{const r=await fetch(base+'/api/competition/arena');assert.equal(r.status,200);return r.json();};
const health=async()=>{const r=await fetch(base+'/api/competition/health');assert.equal(r.status,200);return r.json();};

(async()=>{
 const owner=io(base,{reconnection:false}),observer=io(base,{reconnection:false});
 try{
  await Promise.all([connected(owner),connected(observer)]);
  await post('/api/simulate/comment',{userId:'A',nickname:'Alpha',comment:'oi'});
  await post('/api/simulate/comment',{userId:'B',nickname:'Bravo',comment:'oi'});
  await post('/api/simulate/gift',{userId:'B',nickname:'Bravo',giftName:'CAPIVARA'});
  assert.equal((await claim(owner)).granted,true);
  assert.equal((await claim(observer)).granted,false);
  owner.emit('arena:heartbeat',{fps:58});
  await wait(120);

  let snap=await arena();
  const b=snap.players.find(p=>p.userId==='B');
  assert.equal(b.shield,2,'Capivara deveria iniciar com 2 escudos');

  observer.emit('player:shield_used',{userId:'B',remainingShields:1});
  await wait(120);
  snap=await arena();
  assert.equal(snap.players.find(p=>p.userId==='B').shield,2,'observador consumiu escudo');

  owner.emit('player:shield_used',{userId:'B',remainingShields:1});
  await wait(120);
  snap=await arena();
  assert.equal(snap.players.find(p=>p.userId==='B').shield,1,'autoridade não consumiu escudo');

  observer.emit('relinho:cut',{winnerId:'A',loserId:'B',cutX:100,cutY:100,lineType:'algodao'});
  await wait(120);
  assert.equal((await arena()).players.length,2,'observador conseguiu cortar');

  owner.emit('relinho:cut',{winnerId:'A',loserId:'B',cutX:100,cutY:100,lineType:'algodao'});
  await wait(150);
  assert.equal((await arena()).players.length,1,'autoridade não conseguiu cortar');

  await post('/api/simulate/comment',{userId:'B',nickname:'Bravo',comment:'voltei'});
  assert.equal((await arena()).players.length,2);

  const available=new Promise(resolve=>observer.once('arena:authority_available',resolve));
  owner.disconnect();
  await Promise.race([available,wait(2500).then(()=>{throw Error('sem authority_available');})]);
  const h0=await health();
  assert.equal(h0.combat.authorityActive,false);
  assert.equal(h0.combat.fps,null,'FPS deveria zerar quando a autoridade cai');

  observer.emit('relinho:cut',{winnerId:'A',loserId:'B',cutX:120,cutY:120,lineType:'algodao'});
  await wait(120);
  assert.equal((await arena()).players.length,2,'corte foi aceito sem autoridade');

  assert.equal((await claim(observer)).granted,true);
  observer.emit('arena:heartbeat',{fps:61});
  observer.emit('relinho:cut',{winnerId:'A',loserId:'B',cutX:120,cutY:120,lineType:'algodao'});
  await wait(150);
  assert.equal((await arena()).players.length,1,'novo executor não conseguiu cortar');
  const h1=await health();
  assert.equal(h1.combat.fps,61);

  console.log('OK: autoridade estrita, escudo protegido, corte sem owner bloqueado, failover e FPS válidos.');
 }catch(e){console.error(e);process.exitCode=1;}
 finally{owner.disconnect();observer.disconnect();}
})();
