const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const GameRules = require('../backend/rules/gameRules');
const { pathToFileURL } = require('node:url');
const esm = async file => import(pathToFileURL(path.join(__dirname, '../frontend/src/engine/', file)).href);

test('presentes geram manobras com alcance e duração limitados sem selecionar oponente', async () => {
  const { selectGiftManeuver, maneuverStats, applyManeuverMovement } = await esm('Maneuvers.js');
  const {planGiftManeuver}=await esm('physics/GiftManeuverAI.js');
  const {PlayerIntentController}=await esm('physics/PlayerIntentController.js');
  assert.equal(selectGiftManeuver('Flor'),'retao'); assert.equal(selectGiftManeuver('Donut'),'despicar');
  assert.equal(selectGiftManeuver('Capivara'),'aparar_retao'); assert.equal(selectGiftManeuver('Perfume'),'perseguir');
  assert.equal(selectGiftManeuver('Leão'),'aparar_despicada'); assert.equal(selectGiftManeuver('desconhecido'),null);
  const rose=maneuverStats('retao',1,1), expensive=maneuverStats('retao',1000,1000);
  assert.ok(expensive.reach>rose.reach&&expensive.reach<=390&&expensive.duration===45);
  const owner={x:100,y:100,z:60,screenWidth:1080,screenHeight:1920,isAscending:false,spawnProtection:0,
    attitude:{heading:0,pitch:0,roll:0},lineTension:.6,lineSlack:.1,maneuver:{...rose,remaining:rose.duration}};
  owner.intentController=new PlayerIntentController(owner);
  const density={scoreCorridor:(o,d)=>d.x>0?8:2};owner.maneuver.plan=planGiftManeuver(owner,owner.maneuver,{x:.2,y:0,z:.1},density);
  assert.equal(applyManeuverMovement(owner,[],1,{x:.2,y:0,z:.1},density),true);
  const intent=owner.intentController.update(1/60,{x:.2,y:0,z:.1},[]);
  assert.ok(intent.spoolCommand!==0||intent.debicoTorque!==0); assert.equal(owner.x,100); assert.equal(owner.y,100);
  assert.equal('target' in owner.maneuver.plan,false);
});

test('manobra defensiva reduz abrasão e bônus ofensivo não vira dano fixo', async () => {
  const { RelinhoContactSolver } = await esm('physics/RelinhoContactSolver.js');
  const kite = (maneuver = null, contactSpeed = 0) => ({lineHP:100,maxLineHP:100,shieldCount:0,lineType:'algodao',maneuver,contactSpeed,lineTension:.8,calculateCombatPower:()=>1});
  const contact={slidingSpeed:12,vSlide:12,slideA:12,slideB:-12,sinAngle:.8,contactTime:.5};
  const defended=RelinhoContactSolver.calculateFrictionalWork(kite({defense:.6}),kite(),{x:0,y:0},contact);
  const baseline=RelinhoContactSolver.calculateFrictionalWork(kite(),kite(),{x:0,y:0},contact);
  assert.ok(defended.damageRateA < baseline.damageRateA,'defesa reduz desgaste recebido');
  const offensive=RelinhoContactSolver.calculateFrictionalWork(kite({damage:1.16}),kite(),{x:0,y:0},contact);
  assert.ok(Math.abs(offensive.damageRateB-baseline.damageRateB)<1e-12,'damage da manobra não pode ser dano fixo fora da física');
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

test('contactSpeed isolado não injeta dano fora do vSlide físico', async()=>{
  const {RelinhoContactSolver}=await esm('physics/RelinhoContactSolver.js');
  const kite=contactSpeed=>({lineHP:100,maxLineHP:100,lineType:'algodao',shieldCount:0,contactSpeed,lineTension:.8,calculateCombatPower:()=>1});
  const contact={slidingSpeed:10,vSlide:10,slideA:10,slideB:-10,sinAngle:.8,contactTime:.5};
  const fast=RelinhoContactSolver.calculateFrictionalWork(kite(30),kite(0),{x:0,y:0},contact);
  const slow=RelinhoContactSolver.calculateFrictionalWork(kite(0),kite(0),{x:0,y:0},contact);
  assert.ok(Math.abs(fast.damageRateA-slow.damageRateA)<1e-12);
  assert.ok(Math.abs(fast.damageRateB-slow.damageRateB)<1e-12);
});
