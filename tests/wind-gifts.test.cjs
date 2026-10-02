const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const GameRules = require('../backend/rules/gameRules');
const BuffManager = require('../backend/rules/buffManager');
const TikTokService = require('../backend/tiktokService');
const {GIFTS} = require('../backend/rules/giftConfig');
function setup() {
  const events=[];
  const io={emit:(name,data)=>events.push({name,data})};
  const rules=new GameRules(40), buffs=new BuffManager(io);
  return {events,rules,buffs,service:new TikTokService(io,rules,buffs)};
}
test('qualquer comentário entra e é encaminhado como gesto nativo da live', () => {
  const {service,rules,events}=setup();
  for(const comment of ['oi','puxar','1','descarregar','embicar','#pegar']) {
    service.handleChatMessage({userId:comment,nickname:comment,comment});
    assert.ok(rules.activePlayers.has(comment));
  }
  const comments=events.filter(e=>e.name==='competition:comment');
  assert.equal(comments.length,6);
  assert.deepEqual(comments.map(e=>e.data.text),['oi','puxar','1','descarregar','embicar','#pegar']);
  assert.equal(events.filter(e=>e.name==='competition:chat_action').length,0);
  service.handleChatMessage({userId:'oi',nickname:'oi',comment:'bora de novo 🔥'});
  assert.equal(events.filter(e=>e.name==='competition:comment').at(-1).data.userId,'oi');
  assert.equal(rules.activePlayers.size,6);
});
test('presente não coloca pipa no céu sem comentário', () => {
  const {service,rules,buffs}=setup();
  try { service.handleGift({userId:'a',giftName:'Rosa'}); assert.equal(rules.activePlayers.size,0); }
  finally {buffs.removePlayer('a');}
});
test('Perfume e Leão preservam linha e têm expiração independente', () => {
  const {buffs,events}=setup();
  try {
    buffs.applyGiftUpgrade('a',GIFTS.DONUT);
    buffs.applyGiftUpgrade('a',GIFTS.PERFUME);
    buffs.applyGiftUpgrade('a',GIFTS.LEAO);
    assert.equal(buffs.getPlayerBuff('a').lineType,'chile');
    assert.equal(buffs.getPlayerSpecials('a').length,2);
    buffs.expireSpecial('a','tornado');
    assert.equal(buffs.getPlayerSpecials('a').length,1);
    assert.equal(buffs.getPlayerBuff('a').lineType,'chile');
    assert.ok(events.some(e=>e.name==='player:special_applied'));
  } finally {buffs.removePlayer('a');}
});
test('spawn inclui presente recebido antes do comentário', () => {
  const {service,buffs,events}=setup();
  try {
    service.handleGift({userId:'a',giftName:'Leão'});
    service.handleChatMessage({userId:'a',comment:'oi'});
    const spawn=events.find(e=>e.name==='player:spawn');
    assert.equal(spawn.data.specials[0].ability,'invulnerable');
  } finally {buffs.removePlayer('a');}
});
test('vento muda direção e movimenta pipas pela dinâmica física', async () => {
  const moduleAt=async file=>import(require('node:url').pathToFileURL(path.join(__dirname,'../frontend/src/engine/',file)).href+'?t='+Date.now());
  const {Wind}=await moduleAt('Wind.js'),{KiteDynamics}=await moduleAt('physics/KiteDynamics.js'),{RopePhysics}=await moduleAt('physics/RopePhysics.js');
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});
  const k={userId:'wind',x:400,y:200,z:90,baseX:400,baseY:560,baseZ:0,vx:0,vy:0,vz:0,mass:.85,rotation:0,screenWidth:800,screenHeight:600,windPhase:1,windInfluence:1,likeBoostRemaining:0,lineSlack:0,lineTension:.75,spawnProtection:0,isAscending:false,rope};
  rope.resetPositions({x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z}); const initial={x:k.x,y:k.y,z:k.z};
  for(let n=0;n<600;n++){const w=Wind.sample(n/60);KiteDynamics._stepFrame=n;KiteDynamics.step(k,1/60,w,1);rope.step(1/60,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},w,{lineSlack:0,lineTension:.75});}
  assert.ok(Math.hypot(k.x-initial.x,k.y-initial.y,k.z-initial.z)>20);
  assert.ok([k.x,k.y,k.z,k.vx,k.vy,k.vz].every(Number.isFinite));
  Wind.setSettings({windDirection:'left'}); assert.ok(Wind.sample(20).x<0);
  Wind.setSettings({windDirection:'right'}); assert.ok(Wind.sample(20).x>0); Wind.setSettings({windDirection:'auto'});
});

test('vento e dinâmica física permanecem estáveis sem exigir corte espontâneo', async () => {
  async function moduleAt(file) { return import(require('node:url').pathToFileURL(path.join(__dirname, '../frontend/src/engine/', file)).href); }
  const {Wind}=await moduleAt('Wind.js');
  const {KiteDynamics}=await moduleAt('physics/KiteDynamics.js');
  const {RopePhysics}=await moduleAt('physics/RopePhysics.js');
  const {LineContactSystem}=await moduleAt('physics/LineContactSystem.js');
  const make=(id,index)=>{ const baseX=index===0?260:540; const rope=new RopePhysics({nodeCount:12,lineType:'algodao'}); const k={userId:id,x:baseX,y:220,baseX,baseY:620,baseZ:0,z:0,vx:0,vy:0,mass:.85,rotation:0,screenWidth:800,screenHeight:600,windPhase:index*Math.PI,windInfluence:1,likeBoostRemaining:0,lineType:'algodao',lineHP:100,maxLineHP:100,shieldCount:0,lineSlack:0,lineTension:.75,spawnProtection:0,isAscending:false,rooftopPlayer:{layoutIndex:index},rope}; rope.resetPositions({x:baseX,y:620,z:0},{x:k.x,y:k.y,z:0}); return k; };
  const kites=[make('a',0),make('b',1)], system=new LineContactSystem();
  let cuts=0,maxTracked=0,maxSolved=0;
  for(let frame=0;frame<1200&&!cuts;frame++){
    KiteDynamics._stepFrame=frame; const wind=Wind.sample(frame/60);
    for(const k of kites){ KiteDynamics.step(k,1/60,wind,kites.length); k.rope.step(1/60,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:0},wind,{lineSlack:0,lineTension:.75}); }
    const result=system.step(kites,1/60,frame*(1000/60),{allowWear:true});
    cuts+=result.cuts.length; maxTracked=Math.max(maxTracked,result.metrics.trackedContacts||0); maxSolved=Math.max(maxSolved,result.metrics.solvedContacts||0);
  }
  assert.ok(kites.every(k=>[k.x,k.y,k.z,k.vx,k.vy,k.vz].every(Number.isFinite)),'estado físico deve permanecer finito');
  assert.ok(maxTracked<=12); assert.ok(maxSolved<=3);
});
test('redemoinho altera o vento local sem atrair coordenadas diretamente', async () => {
  const {Wind}=await import(require('node:url').pathToFileURL(path.join(__dirname,'../frontend/src/engine/Wind.js')).href+'?t='+Date.now());
  const owner={userId:'o',x:100,y:100,z:80,specials:{tornado:5}};
  const others=Array.from({length:5},(_,i)=>({userId:String(i),x:120+i*45,y:100,z:80+i*8,specials:{tornado:0}}));
  const before=others.map(k=>({x:k.x,y:k.y,z:k.z})),base={x:.4,y:0,z:.05,gust:1,turbulence:.1};
  const winds=others.map(k=>Wind.withLocalVortices(base,k,[owner,...others]));
  assert.deepEqual(others.map(k=>({x:k.x,y:k.y,z:k.z})),before);
  assert.ok(winds.some(w=>Math.hypot(w.x-base.x,w.y-base.y,w.z-base.z)>0));
});
test('combo não restaura escudo já consumido', () => {
  const {buffs}=setup();
  try {
    buffs.applyGiftUpgrade('a',GIFTS.CAPIVARA);
    buffs.consumeShield('a');
    assert.equal(buffs.applyGiftUpgrade('a',GIFTS.CAPIVARA).shieldCount,3);
  } finally {buffs.removePlayer('a');}
});
