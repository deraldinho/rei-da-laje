const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const GameRules = require('../backend/rules/gameRules');
const BuffManager = require('../backend/rules/buffManager');
const { GIFTS } = require('../backend/rules/giftConfig');
const { pathToFileURL } = require('node:url');
const physicsReady = import(pathToFileURL(path.join(__dirname, '../frontend/src/engine/Physics.js')).href);
function kite(power = 1, shield = 0, lineType = 'algodao') {
  return { lineHP: 100, maxLineHP: 100, shieldCount: shield, lineType,
    calculateCombatPower: () => power,
    takeDamage(n) { this.lineHP -= n; return this.lineHP <= 0; },
    triggerShieldAbsorb() {}, updateHPBar() {} };
}
test('fila contém uma única entrada por pessoa', () => {
  const rules = new GameRules(1);
  rules.handlePlayerComment({userId:'a'});
  rules.handlePlayerComment({userId:'b'});
  rules.handlePlayerComment({userId:'b'});
  assert.equal(rules.queue.length, 1);
  assert.equal(rules.handlePlayerCut('a').spawnedFromQueue.userId, 'b');
  assert.equal(rules.queue.length, 0);
});
test('corte inexistente não libera vaga', () => {
  const rules = new GameRules(1);
  rules.queue.push({userId:'b'});
  assert.equal(rules.handlePlayerCut('missing'), null);
  assert.equal(rules.activePlayers.size, 0);
});
test('corte é validado e pontuado uma única vez', () => {
  const rules = new GameRules(3);
  ['a','b','c'].forEach(userId => rules.handlePlayerComment({userId}));
  assert.equal(rules.recordCut('a','a'), null);
  assert.equal(rules.recordCut('missing','b'), null);
  assert.ok(rules.recordCut('a','b'));
  assert.equal(rules.recordCut('a','b'), null);
  assert.equal(rules.activePlayers.get('a').score, 1);
});
test('presente inferior não apaga a linha superior', () => {
  const buffs = new BuffManager(null);
  try {
    buffs.applyGiftUpgrade('a', GIFTS.DONUT);
    assert.equal(buffs.applyGiftUpgrade('a', GIFTS.ROSA).lineType, 'chile');
  } finally { buffs.removePlayer('a'); }
});
test('combo soma duração e escudos', () => {
  const buffs = new BuffManager(null);
  try {
    const buff = buffs.applyGiftUpgrade('a', GIFTS.CAPIVARA, 3);
    assert.equal(buff.shieldCount, 6);
    assert.ok(buff.expiresAt - Date.now() > 44000);
    assert.ok(buff.expiresAt - Date.now() <= 45000);
  } finally { buffs.removePlayer('a'); }
});
test('geometria reconhece cruzamento e rejeita paralelas', async () => {
  const {Physics} = await physicsReady;
  assert.deepEqual(Physics.checkLineIntersection(0,0,100,100,0,100,100,0), {hit:true,x:50,y:50});
  assert.equal(Physics.checkLineIntersection(0,0,100,0,0,5,100,5).hit, false);
});
test('mesmo tempo de combate causa mesmo dano em 30, 60 e 120 FPS', async () => {
  const {Physics} = await physicsReady;
  const results = [30,60,120].map(fps => {
    const a = kite(), b = kite();
    for (let frame=0; frame<fps/2; frame++) Physics.resolveRelinhoCombat(a,b,{x:1,y:1},60/fps);
    return a.lineHP;
  });
  for (const hp of results) assert.ok(Math.abs(hp-results[0]) < 0.00001);
});
test('escudo absorve derrota e restaura HP', async () => {
  const {Physics} = await physicsReady;
  const a = kite(10), b = kite(1,2);
  b.lineHP = 1;
  const result = Physics.resolveRelinhoCombat(a,b,{x:1,y:1});
  assert.equal(result.absorbedByShield, true);
  assert.equal(b.shieldCount, 1);
  assert.equal(b.lineHP, b.maxLineHP);
});
test('dois mestres do céu não cortam um ao outro', async () => {
  const {Physics} = await physicsReady;
  const result = Physics.resolveRelinhoCombat(kite(99,0,'mestre_do_ceu'),kite(99,0,'mestre_do_ceu'),{x:0,y:0});
  assert.equal(result.tied,true);
});

test('dupla ruptura igual não favorece ordem de criação das pipas', async () => {
  const { Physics } = await physicsReady;
  const run = reverse => {
    const a = kite(), b = kite();
    a.userId = 'a'; b.userId = 'b';
    a.lineHP = 0.5; b.lineHP = 0.5;
    return reverse ? Physics.resolveRelinhoCombat(b, a, {x:1,y:1}) : Physics.resolveRelinhoCombat(a, b, {x:1,y:1});
  };
  assert.equal(run(false).tied, true);
  assert.equal(run(true).tied, true);
});
test('liderança exige pontuação isolada e muda só com corte registrado', () => {
  const rules = new GameRules(4);
  ['a','b','c'].forEach(userId => rules.handlePlayerComment({userId}));
  assert.equal(rules.getSoleLeader(), null);
  let cut = rules.recordCut('a','c');
  assert.equal(cut.leadershipChanged, true);
  assert.equal(cut.leader.userId, 'a');
  rules.handlePlayerComment({userId:'c'});
  cut = rules.recordCut('b','c');
  assert.equal(cut.leader, null);
  assert.equal(cut.leadershipChanged, true);
});

test('geometria desempata a ruptura simultânea independentemente da ordem de processamento', async () => {
  const { Physics } = await physicsReady;
  const run = reverse => {
    const a = kite(), b = kite();
    Object.assign(a,{userId:'a',x:20,y:20,baseX:20,baseY:100,lineHP:0.5});
    Object.assign(b,{userId:'b',x:90,y:30,baseX:10,baseY:100,lineHP:0.5});
    const hit = {x:20,y:30};
    return reverse ? Physics.resolveRelinhoCombat(b,a,hit) : Physics.resolveRelinhoCombat(a,b,hit);
  };
  assert.equal(run(false).winner.userId, run(true).winner.userId);
});

test('fila e histórico têm limites de segurança sem duplicar ativos',()=>{
  const rules=new GameRules(1,2,5);
  assert.equal(rules.handlePlayerComment({userId:'a'}).status,'spawn');
  assert.equal(rules.handlePlayerComment({userId:'b'}).status,'queued');
  assert.equal(rules.handlePlayerComment({userId:'c'}).status,'queued');
  const full=rules.handlePlayerComment({userId:'d'});
  assert.equal(full.status,'queue_full');
  assert.equal(rules.queue.length,2);
  assert.equal(rules.sessionStats.has('d'),false);

  let current='a';
  for(let i=0;i<25;i++){
    const next='x'+i;
    if(rules.queue.length>=rules.maxQueueSize) rules.handlePlayerCut(current);
    current=[...rules.activePlayers.keys()][0];
    const result=rules.handlePlayerComment({userId:next});
    if(result.status==='queue_full'){
      rules.handlePlayerCut(current);
      current=[...rules.activePlayers.keys()][0];
      rules.handlePlayerComment({userId:next});
    }
    if(rules.queue.length){
      rules.handlePlayerCut(current);
      current=[...rules.activePlayers.keys()][0];
    }
    assert.ok(rules.sessionStats.size<=5);
    assert.ok(rules.sessionStats.has(current));
  }
});
