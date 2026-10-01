const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const { capturePlayerStates, restorePlayerStates }=require('../backend/arenaLiveState');
const ArenaStateStore=require('../backend/arenaStateStore');
const GameRules=require('../backend/rules/gameRules');
const BuffManager=require('../backend/rules/buffManager');

test('checkpoint físico ignora impostores e restringe HP, dimensões e efeitos',()=>{
 const rules=new GameRules(2),buffs=new BuffManager(null);
 rules.handlePlayerComment({userId:'a'});
 const entry={userId:'a',x:-500,y:10000,lineHP:1e8,spawnProtection:999,
  windPhase:2,windInfluence:9,likeBoostRemaining:999,
  maneuver:{name:'retao',remaining:500,damage:99,defense:0,reach:1e6,speed:9}};
 const result=capturePlayerStates({width:1080,height:1920,kites:[entry,{...entry,userId:'fake'}]},rules,buffs,1000);
 assert.equal(result.size,1);
 const row=result.get('a');
 assert.equal(row.x,30);assert.ok(row.y<=1248);assert.equal(row.lineHP,100);
 assert.equal(row.maneuver.remaining,45);assert.equal(row.maneuver.damage,1.25);
 assert.equal(row.maneuver.defense,0.5);assert.equal(row.maneuver.reach,390);
 assert.equal(capturePlayerStates({width:1080,height:1920,kites: Array.from({length:41},()=>entry)},rules,buffs),null);
});

test('estado físico restaura após reinício apenas dentro do TTL e para pipa ativa',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-live-'));
 const pathState=path.join(dir,'state.json');
 const clock=()=>10000;
 const original=new GameRules(2),originalBuffs=new BuffManager(null);
 original.handlePlayerComment({userId:'a'});
 const store=new ArenaStateStore(pathState,clock);
 store.playerStates=capturePlayerStates({width:1080,height:1920,kites:[{
  userId:'a',x:240,y:340,lineHP:41,spawnProtection:1,isAscending:false,
  windPhase:1,windInfluence:1,likeBoostRemaining:0}]},original,originalBuffs,clock());
 try{
  assert.equal(store.save(original,originalBuffs),true);
  const next=new ArenaStateStore(pathState,clock),rules=new GameRules(2),buffs=new BuffManager(null);
  assert.equal(next.restore(rules,buffs),true);
  assert.equal(next.playerStates.get('a').lineHP,41);
  assert.equal(restorePlayerStates([...next.playerStates.values()],new Set(['b']),clock()).size,0);
  assert.equal(restorePlayerStates([...next.playerStates.values()],new Set(['a']),clock()+90001).size,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('checkpoint persistido preserva geometria da linha com limites da arena',()=>{
 const rules=new GameRules(2),buffs=new BuffManager(null);
 rules.handlePlayerComment({userId:'a'});
 const states=capturePlayerStates({width:1440,height:2560,kites:[{
   userId:'a',x:720,y:640,baseX:360,targetX:960,targetY:740,lineHP:37,
   spawnProtection:0,isAscending:false,windPhase:1,windInfluence:1,likeBoostRemaining:0
 }]},rules,buffs,1000);
 const state=states.get('a');
 assert.equal(state.screenWidth,1440);
 assert.equal(state.screenHeight,2560);
 assert.equal(state.baseX,360);
 assert.equal(state.targetX,960);
 assert.equal(state.targetY,740);
});

test('checkpoint não reinicia os segundos de manobra ao reconectar',()=>{
 const rules=new GameRules(2),buffs=new BuffManager(null);
 rules.handlePlayerComment({userId:'a'});
 const now=100000;
 const make=expiresAt=>capturePlayerStates({width:1080,height:1920,kites:[{
  userId:'a',x:200,y:300,lineHP:50,
  maneuver:{name:'retao',duration:15,remaining:15,expiresAt}
 }]},rules,buffs,now).get('a');
 const halfway=make(now+9000);
 assert.ok(halfway.maneuver.remaining<=9 && halfway.maneuver.remaining>8);
 assert.equal(halfway.maneuver.expiresAt,now+9000);
 assert.equal(make(now-1).maneuver,null);
});
