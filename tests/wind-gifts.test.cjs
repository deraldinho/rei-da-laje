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
  const {Wind}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(p,'utf8')).toString('base64'));
  const k={x:400,y:200,screenWidth:800,screenHeight:600,windPhase:1,windInfluence:1,likeBoostRemaining:0};
  const initial={x:k.x,y:k.y};
  for(let n=0;n<600;n++) Wind.move(k,1,n/60);
  assert.ok(Math.hypot(k.x-initial.x,k.y-initial.y)>30);
  assert.ok(k.x>=30 && k.x<=770 && k.y>=40 && k.y<=390);
  const samples=Array.from({length:100},(_,i)=>Wind.sample(i).x);
  assert.ok(samples.some(x=>x>0)&&samples.some(x=>x<0));
});

test('vento gera cruzamentos reais e cortes sem ação do espectador', async () => {
  async function moduleAt(file) {
    return import(require('node:url').pathToFileURL(path.join(__dirname, '../frontend/src/engine/', file)).href);
  }
  const {Wind}=await moduleAt('Wind.js'), {Physics}=await moduleAt('Physics.js');
  const kites=Array.from({length:8},(_,i)=>({
    x:80+i*90,y:180,baseX:80+i*90,baseY:620,screenWidth:800,screenHeight:600,
    windPhase:i*0.7,windInfluence:1,likeBoostRemaining:0,lineType:'algodao',
    lineHP:100,maxLineHP:100,shieldCount:0,
    calculateCombatPower(){return 1;},
    takeDamage(n){this.lineHP-=n;return this.lineHP<=0;}
  }));
  let cuts=0;
  for(let frame=0;frame<3600 && !cuts;frame++) {
    kites.forEach(k=>Wind.move(k,1,frame/60));
    for(let i=0;i<kites.length;i++) for(let j=i+1;j<kites.length;j++) {
      const a=kites[i],b=kites[j];
      if(Math.hypot(a.x-b.x,a.y-b.y)>120)continue;
      const hit=Physics.checkLineIntersection(a.baseX,a.baseY,a.x,a.y,b.baseX,b.baseY,b.x,b.y);
      if(hit.hit && !Physics.resolveRelinhoCombat(a,b,hit,1).tied)cuts++;
    }
  }
  assert.ok(cuts>0);
});
test('redemoinho atrai no máximo três pipas elegíveis', async () => {
  const {Wind}=await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(__dirname,'../frontend/src/engine/Wind.js'),'utf8')).toString('base64'));
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
