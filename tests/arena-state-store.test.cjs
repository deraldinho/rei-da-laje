const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ArenaStateStore = require('../backend/arenaStateStore');
const GameRules = require('../backend/rules/gameRules');
const BuffManager = require('../backend/rules/buffManager');
const {GIFTS} = require('../backend/rules/giftConfig');

test('persistência restaura jogadores, fila, liderança, pontuação e escudos sem ressuscitar eliminados',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-arena-'));
  const file=path.join(dir,'data','arena-state.json');
  const original=new GameRules(2), buffs=new BuffManager(null);
  const loadedBuffs=new BuffManager(null);
  try {
    for(const userId of ['a','b','c'])original.handlePlayerComment({userId,nickname:userId});
    buffs.applyGiftUpgrade('a', GIFTS.CAPIVARA);
    const cut=original.recordCut('a','b');
    assert.equal(cut.spawnedFromQueue.userId,'c');
    const store=new ArenaStateStore(file);
    assert.equal(store.save(original,buffs),true);
    const restored=new GameRules(2), second=new ArenaStateStore(file);
    assert.equal(second.restore(restored,loadedBuffs),true);
    assert.equal(second.sessionId,store.sessionId);
    assert.deepEqual([...restored.activePlayers.keys()],['a','c']);
    assert.equal(restored.leaderId,'a');
    assert.equal(restored.activePlayers.get('a').score,1);
    assert.equal(restored.sessionStats.get('a').cuts,1);
    assert.equal(restored.sessionStats.get('b').defeats,1);
    assert.equal(loadedBuffs.getPlayerBuff('a').shieldCount,2);
    assert.equal(loadedBuffs.getPlayerBuff('b').lineType,'algodao');
  } finally {
    for(const id of ['a','b','c']){buffs.removePlayer(id);loadedBuffs.removePlayer(id);}
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

test('snapshot inválido não é sobrescrito automaticamente por estado vazio',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-arena-invalid-'));
  const file=path.join(dir,'state.json');
  try {
    fs.writeFileSync(file,'{erro');
    const store=new ArenaStateStore(file);
    assert.equal(store.restore(new GameRules(2),new BuffManager(null)),false);
    assert.equal(store.save(new GameRules(2),new BuffManager(null)),false);
    assert.equal(fs.readFileSync(file,'utf8'),'{erro');
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

test('buff expirado não retorna depois de reiniciar',()=>{
  const buff=new BuffManager(null);
  buff.restoreState([{userId:'a',lineType:'chile',expiresAt:Date.now()-10,shieldCount:9}],[],new Set(['a']));
  assert.equal(buff.getPlayerBuff('a').lineType,'algodao');
});

test('restore respeita limites atuais de fila e histórico mesmo com snapshot legado maior',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-arena-limits-'));
  const file=path.join(dir,'state.json');
  try{
    const now=Date.now();
    const players=[{userId:'p0',nickname:'P0'}];
    const queue=Array.from({length:8},(_,i)=>({userId:'q'+i,nickname:'Q'+i}));
    const stats=[['p0',{cuts:1}],...queue.map(p=>[p.userId,{cuts:0}]),...Array.from({length:15},(_,i)=>['h'+i,{cuts:i}])];
    fs.writeFileSync(file,JSON.stringify({version:1,sessionId:'legacy',savedAt:now,players,queue,stats,leaderId:null,buffs:[],specials:[],playerStates:[]}));
    const rules=new GameRules(1,3,6),buffs=new BuffManager(null),store=new ArenaStateStore(file);
    assert.equal(store.restore(rules,buffs),true);
    assert.equal(rules.queue.length,3);
    assert.ok(rules.sessionStats.size<=6);
    for(const id of ['p0',...rules.queue.map(p=>p.userId)])assert.ok(rules.sessionStats.has(id));
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('presente válido de jogador na fila sobrevive ao reinício pelo tempo restante',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-arena-queued-buff-'));
  const file=path.join(dir,'state.json');
  const original=new GameRules(1),buffs=new BuffManager(null);
  const restoredRules=new GameRules(1),restoredBuffs=new BuffManager(null);
  try{
    original.handlePlayerComment({userId:'a',nickname:'A'});
    original.handlePlayerComment({userId:'b',nickname:'B'});
    const buff=buffs.applyGiftUpgrade('b',GIFTS.DONUT);
    const store=new ArenaStateStore(file);
    assert.equal(store.save(original,buffs),true);
    const second=new ArenaStateStore(file);
    assert.equal(second.restore(restoredRules,restoredBuffs),true);
    assert.equal(restoredRules.queue[0].userId,'b');
    const restored=restoredBuffs.getPlayerBuff('b');
    assert.equal(restored.lineType,'chile');
    assert.ok(restored.expiresAt>Date.now());
    assert.ok(restored.expiresAt<=buff.expiresAt);
  }finally{
    for(const id of ['a','b']){buffs.removePlayer(id);restoredBuffs.removePlayer(id);}
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

test('snapshot não duplica avatar no histórico e restaura foto para ativos/fila',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-arena-compact-stats-'));
  const file=path.join(dir,'state.json'),rules=new GameRules(1),buffs=new BuffManager(null);
  try{
    rules.handlePlayerComment({userId:'a',nickname:'Ana',profilePictureUrl:'https://cdn.test/a.jpg'});
    rules.handlePlayerComment({userId:'b',nickname:'Bia',profilePictureUrl:'https://cdn.test/b.jpg'});
    const store=new ArenaStateStore(file);
    const snap=store.snapshot(rules,buffs);
    assert.equal(snap.stats.find(([id])=>id==='a')[1].profilePictureUrl,undefined);
    assert.equal(snap.stats.find(([id])=>id==='b')[1].profilePictureUrl,undefined);
    assert.equal(store.save(rules,buffs),true);
    const restored=new GameRules(1),loaded=new BuffManager(null),second=new ArenaStateStore(file);
    assert.equal(second.restore(restored,loaded),true);
    assert.equal(restored.sessionStats.get('a').profilePictureUrl,'https://cdn.test/a.jpg');
    assert.equal(restored.sessionStats.get('b').profilePictureUrl,'https://cdn.test/b.jpg');
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('snapshot suporta 40 ativos e 1000 na fila com URLs de avatar longas',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-arena-large-'));
  const file=path.join(dir,'state.json'),rules=new GameRules(40),buffs=new BuffManager(null);
  try{
    const url='https://cdn.example.com/'+('x'.repeat(950));
    for(let i=0;i<1040;i++)rules.handlePlayerComment({
      userId:'user-'+i+'-'+('u'.repeat(80)),nickname:'N'.repeat(60),profilePictureUrl:url+i
    });
    const store=new ArenaStateStore(file);
    assert.equal(store.save(rules,buffs),true);
    assert.ok(fs.statSync(file).size<2*1024*1024);
    const restored=new GameRules(40),loaded=new BuffManager(null),second=new ArenaStateStore(file);
    assert.equal(second.restore(restored,loaded),true);
    assert.equal(restored.activePlayers.size,40);
    assert.equal(restored.queue.length,1000);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('presente recebido antes do comentário sobrevive ao reinício',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-arena-precomment-gift-'));
  const file=path.join(dir,'state.json'),buffs=new BuffManager(null),rules=new GameRules(2);
  const loadedBuffs=new BuffManager(null),loadedRules=new GameRules(2);
  try{
    buffs.applyGiftUpgrade('future-user',GIFTS.DONUT);
    buffs.applyGiftUpgrade('future-user',GIFTS.PERFUME);
    const store=new ArenaStateStore(file);
    assert.equal(store.save(rules,buffs),true);
    const second=new ArenaStateStore(file);
    assert.equal(second.restore(loadedRules,loadedBuffs),true);
    assert.equal(loadedRules.activePlayers.size,0);
    assert.equal(loadedRules.queue.length,0);
    assert.equal(loadedBuffs.getPlayerBuff('future-user').lineType,'chile');
    assert.ok(loadedBuffs.getPlayerSpecials('future-user').some(s=>s.ability==='tornado'));
  }finally{
    buffs.removePlayer('future-user');loadedBuffs.removePlayer('future-user');
    fs.rmSync(dir,{recursive:true,force:true});
  }
});

test('benefício ainda válido de jogador na fila sobrevive ao restart',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-queued-buff-'));
  const file=path.join(dir,'state.json');
  const rules=new GameRules(1),buffs=new BuffManager(null),loadedRules=new GameRules(1),loadedBuffs=new BuffManager(null);
  try{
    rules.handlePlayerComment({userId:'active',nickname:'Ativo'});
    rules.handlePlayerComment({userId:'queued',nickname:'Fila'});
    const before=buffs.applyGiftUpgrade('queued',GIFTS.CAPIVARA);
    const store=new ArenaStateStore(file);
    assert.equal(store.save(rules,buffs),true);
    const restored=new ArenaStateStore(file);
    assert.equal(restored.restore(loadedRules,loadedBuffs),true);
    assert.equal(loadedRules.queue[0].userId,'queued');
    const after=loadedBuffs.getPlayerBuff('queued');
    assert.equal(after.lineType,'kevlar');
    assert.equal(after.shieldCount,2);
    assert.ok(after.expiresAt>Date.now());
    assert.ok(after.expiresAt<=before.expiresAt);
  }finally{
    for(const id of ['active','queued']){buffs.removePlayer(id);loadedBuffs.removePlayer(id);}
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
