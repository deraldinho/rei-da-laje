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
test('qualquer comentário entra e comandos exatos controlam a própria pipa', () => {
  const {service,rules,events}=setup();
  for(const comment of ['oi','puxar','1','descarregar','embicar','#pegar']) {
    service.handleChatMessage({userId:comment,nickname:comment,comment});
    assert.ok(rules.activePlayers.has(comment));
  }
  const actions=events.filter(e=>e.name==='competition:chat_action');
  assert.deepEqual(actions.map(e=>e.data.action),['puxar','puxar','descarregar','embicar','pegar']);
  service.handleChatMessage({userId:'oi',nickname:'oi',comment:'puxar'});
  assert.equal(events.filter(e=>e.name==='competition:chat_action').at(-1).data.userId,'oi');
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
test('vento muda direção e movimenta pipas sem comandos', async () => {
  const p=path.join(__dirname,'../frontend/src/engine/Wind.js');
  const {Wind}=await import(require('node:url').pathToFileURL(p).href+'?t='+Date.now());
  const k={x:400,y:200,screenWidth:800,screenHeight:600,windPhase:1,windInfluence:1,likeBoostRemaining:0};
  const initial={x:k.x,y:k.y};
  for(let n=0;n<600;n++) Wind.move(k,1,n/60);
  assert.ok(Math.hypot(k.x-initial.x,k.y-initial.y)>30);
  assert.ok(k.x>=30 && k.x<=770 && k.y>=40 && k.y<=390);
  Wind.setSettings({windDirection:'left'}); assert.ok(Wind.sample(20).x<0);
  Wind.setSettings({windDirection:'right'}); assert.ok(Wind.sample(20).x>0);
  Wind.setSettings({windDirection:'auto'});
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
test('redemoinho atrai no máximo três pipas elegíveis', async () => {
  const {Wind}=await import(require('node:url').pathToFileURL(path.join(__dirname,'../frontend/src/engine/Wind.js')).href+'?t='+Date.now());
  const owner={x:100,y:100};
  const others=Array.from({length:5},(_,i)=>({x:120+i*15,y:100,isAscending:false,spawnProtection:0}));
  const start=others.map(k=>k.x);
  assert.equal(Wind.attract(owner,others,1),3);
  assert.equal(others.filter((k,i)=>k.x!==start[i]).length,3);
});
test('combo não restaura escudo já consumido', () => {
  const {buffs}=setup();
  try {
    buffs.applyGiftUpgrade('a',GIFTS.CAPIVARA);
    buffs.consumeShield('a');
    assert.equal(buffs.applyGiftUpgrade('a',GIFTS.CAPIVARA).shieldCount,3);
  } finally {buffs.removePlayer('a');}
});
