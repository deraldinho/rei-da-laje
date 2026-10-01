const test=require('node:test');
const assert=require('node:assert/strict');
const BuffManager=require('../backend/rules/buffManager');
const {GIFTS}=require('../backend/rules/giftConfig');
const playerSpawnPayload=require('../backend/playerSpawnPayload');

test('entrada direta e saída da fila usam foto, expiração e especiais no mesmo payload',()=>{
 const buffs=new BuffManager(null);
 try{
  const player={userId:'a',uniqueId:'ana',nickname:'Ana',profilePictureUrl:'https://cdn.test/a.jpg',
    kiteType:'peixinho',score:2,streak:2,isKing:false};
  const buff=buffs.applyGiftUpgrade('a',GIFTS.CAPIVARA);
  buffs.applyGiftUpgrade('a',GIFTS.PERFUME);
  const payload=playerSpawnPayload(player,buffs);
  assert.equal(payload.profilePictureUrl,player.profilePictureUrl);
  assert.equal(payload.buffExpiresAt,buff.expiresAt);
  assert.equal(payload.lineType,'kevlar');
  assert.equal(payload.shield,2);
  assert.ok(payload.specials.some(s=>s.ability==='tornado' && s.expiresAt>Date.now()));
  assert.equal(payload.score,2);
 }finally{buffs.removePlayer('a');}
});

const GameRules=require('../backend/rules/gameRules');
const TikTokService=require('../backend/tiktokService');

test('foto nova atualiza jogador ativo e fila sem mudar posição',()=>{
 const rules=new GameRules(1);
 rules.handlePlayerComment({userId:'a',nickname:'A'});
 let active=rules.handlePlayerComment({userId:'a',nickname:'Ana',profilePictureUrl:'https://cdn.test/a.jpg'});
 assert.equal(active.status,'already_active');
 assert.equal(active.player.profilePictureUrl,'https://cdn.test/a.jpg');
 rules.handlePlayerComment({userId:'b',nickname:'B'});
 const queued=rules.handlePlayerComment({userId:'b',nickname:'Bia',profilePictureUrl:'https://cdn.test/b.jpg'});
 assert.equal(queued.status,'queued');assert.equal(queued.position,1);
 assert.equal(queued.player.profilePictureUrl,'https://cdn.test/b.jpg');
 const cut=rules.handlePlayerCut('a');
 assert.equal(cut.spawnedFromQueue.userId,'b');
 assert.equal(cut.spawnedFromQueue.profilePictureUrl,'https://cdn.test/b.jpg');
});

test('comentário posterior emite profile_updated para participante já ativo',()=>{
 const events=[],io={emit:(event,payload)=>events.push({event,payload})};
 const rules=new GameRules(2),buffs=new BuffManager(io),service=new TikTokService(io,rules,buffs);
 service.handleChatMessage({userId:'a',nickname:'A',comment:'oi'});
 service.handleChatMessage({userId:'a',nickname:'Ana',profilePictureUrl:'https://cdn.test/a.jpg',comment:'de novo'});
 const update=events.find(e=>e.event==='player:profile_updated');
 assert.equal(update.payload.userId,'a');
 assert.equal(update.payload.nickname,'Ana');
 assert.equal(update.payload.profilePictureUrl,'https://cdn.test/a.jpg');
 buffs.removePlayer('a');
});

test('playerSpawnPayload suporta formato polimórfico de buff e fallbacks seguros sem exceções',()=>{
 const player = { userId: 'safe_1', nickname: 'Tester' };
 const payloadDirect = playerSpawnPayload(player, { lineType: 'chile', powerMultiplier: 2.2 }, [{ ability: 'tornado' }]);
 assert.equal(payloadDirect.userId, 'safe_1');
 assert.equal(payloadDirect.lineType, 'chile');
 assert.equal(payloadDirect.power, 2.2);
 assert.equal(payloadDirect.specials[0].ability, 'tornado');

 const payloadEmpty = playerSpawnPayload(player, null);
 assert.equal(payloadEmpty.lineType, 'algodao');
 assert.equal(payloadEmpty.power, 1.0);
 assert.equal(payloadEmpty.shield, 0);

 const payloadNull = playerSpawnPayload(null);
 assert.equal(payloadNull, null);
});

