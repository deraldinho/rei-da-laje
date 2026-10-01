const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const GameRules = require('../backend/rules/gameRules');
const { pathToFileURL } = require('node:url');
const esm = async file => import(pathToFileURL(path.join(__dirname, '../frontend/src/engine/', file)).href);

test('presentes geram manobras com alcance e duração limitados', async () => {
  const { selectGiftManeuver, maneuverStats, maneuverTarget, applyManeuverMovement } = await esm('Maneuvers.js');
  assert.equal(selectGiftManeuver('Flor'), 'retao');
  assert.equal(selectGiftManeuver('Donut'), 'despicar');
  assert.equal(selectGiftManeuver('Capivara'), 'aparar_retao');
  assert.equal(selectGiftManeuver('Perfume'), 'perseguir');
  assert.equal(selectGiftManeuver('Leão'), 'aparar_despicada');
  assert.equal(selectGiftManeuver('desconhecido'), null);
  const rose = maneuverStats('retao',1,1), expensive = maneuverStats('retao',1000,1000);
  assert.ok(expensive.reach > rose.reach && expensive.reach <= 390 && expensive.duration === 45);
  const owner={x:100,y:100,screenWidth:1080,screenHeight:1920,isAscending:false,spawnProtection:0,maneuver:{...rose,remaining:rose.duration}};
  const target={x:200,y:130,isAscending:false,spawnProtection:0};
  assert.equal(maneuverTarget(owner,[owner,target],rose.reach),target);
  assert.equal(applyManeuverMovement(owner,[owner,target],1),true);
  assert.ok(owner.x>100 && owner.x<200);
  assert.equal(maneuverTarget(owner,[owner,{...target,x:999}],10),null);
});

test('manobra defensiva reduz dano, manobra ofensiva não garante corte', async () => {
  const { Physics } = await esm('Physics.js');
  const kite = (maneuver = null) => ({lineHP:100,maxLineHP:100,shieldCount:0,lineType:'algodao',maneuver,
    calculateCombatPower:()=>1,takeDamage(amount){this.lineHP-=amount;return this.lineHP<=0;}});
  const a=kite({defense:0.6}), b=kite({damage:1.16});
  const outcome=Physics.resolveRelinhoCombat(a,b,{x:0,y:0});
  assert.equal(outcome.tied,true);
  assert.ok(a.lineHP>b.lineHP);
});

test('estatísticas de cortes, derrotas e fila permanecem na sessão', () => {
  const rules=new GameRules(2);
  rules.handlePlayerComment({userId:'a',nickname:'Ana'});
  rules.handlePlayerComment({userId:'b',nickname:'Bia'});
  const queued=rules.handlePlayerComment({userId:'c',nickname:'Caio'});
  assert.equal(queued.status,'queued');
  const cut=rules.recordCut('a','b');
  assert.equal(cut.spawnedFromQueue.userId,'c');
  assert.equal(rules.sessionRanking()[0].cuts,1);
  assert.equal(rules.sessionStats.get('b').defeats,1);
  assert.equal(rules.queue.length,0);
});

test('correntes de vento possuem estados definidos sem deslocamento inválido', async()=>{
  const {Wind}=await esm('Wind.js');
  const states=new Set();
  for(let time=0;time<150;time+=0.5){
    const sample=Wind.sample(time);states.add(sample.current);
    assert.ok(Number.isFinite(sample.gust));
  }
  assert.ok(states.has('updraft')&&states.has('downdraft')&&states.has('crosswind'));
});

test('troca de linha preserva o dano acumulado em vez de curar totalmente', () => {
  const source=fs.readFileSync(path.join(__dirname,'../frontend/src/entities/Kite.js'),'utf8').replace(/\r\n/g,'\n');
  const match=source.match(/  setBuff\(lineType, powerMultiplier, color, lineWidth, shieldCount(?:, expiresAt = null)?\) \{([\s\S]*?)\n  \}\n\n  triggerShieldAbsorb\(/);
  assert.ok(match);
  const setBuff=new Function('lineType','powerMultiplier','color','lineWidth','shieldCount','expiresAt','benefitExpiry',match[1]);
  const kite={maxLineHP:100,lineHP:40,line:{setAppearance(){}},tail:{setBoost(){}},
    getMaxHPForLine(type){return type==='kevlar'?250:100;},updateHPBar(){},likeBoostRemaining:0};
  setBuff.call(kite,'kevlar',2.5,'#fff',3,2,null,()=>0);
  assert.equal(kite.lineHP,190);
  setBuff.call(kite,'algodao',1,'#fff',1,0,null,()=>0);
  assert.equal(kite.lineHP,40);
});

test('choque rápido aumenta dano em no máximo 10 por cento', async()=>{
  const {Physics}=await esm('Physics.js');
  const kite=contactSpeed=>({lineHP:100,maxLineHP:100,lineType:'algodao',shieldCount:0,contactSpeed,
    calculateCombatPower:()=>1,takeDamage(n){this.lineHP-=n;return this.lineHP<=0;}});
  const a=kite(10),b=kite(0);
  Physics.resolveRelinhoCombat(a,b,{x:0,y:0});
  assert.ok(b.lineHP<a.lineHP && b.lineHP>=98.68);
});
