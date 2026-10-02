const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {openPipaDatabase}=require('../backend/persistence/database');
const PlayerRepository=require('../backend/persistence/playerRepository');
const GiftLedger=require('../backend/persistence/giftLedger');
const PlayerInventory=require('../backend/persistence/playerInventory');
const MarketplaceService=require('../backend/persistence/marketplaceService');
const playerSpawnPayload=require('../backend/playerSpawnPayload');

function setup({threshold=30,cachedUrl='/player-assets/avatars/'+'a'.repeat(64)+'.webp'}={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-platform-'));
  const db=openPipaDatabase(path.join(dir,'pipa.db'));
  const repository=new PlayerRepository(db),inventory=new PlayerInventory(db),ledger=new GiftLedger(db);
  const avatarCache={cachedUrl:()=>cachedUrl,refresh:async()=>({cached:true,url:cachedUrl})};
  const marketplace=new MarketplaceService({db,inventory,customKiteMinCoins:threshold});
  return {dir,db,repository,inventory,ledger,avatarCache,marketplace};
}
function close(ctx){ctx.db.close();fs.rmSync(ctx.dir,{recursive:true,force:true});}

test('plataforma observa perfil e devolve avatar local sem perder identidade TikTok',()=>{
  const PlayerPlatform=require('../backend/persistence/playerPlatform');
  const ctx=setup();
  try{
    const platform=new PlayerPlatform(ctx);
    const snap=platform.observeProfile({userId:'u1',uniqueId:'old',nickname:'Antigo',profilePictureUrl:'https://cdn.test/a.webp',seenAt:1000});
    platform.observeProfile({userId:'u1',uniqueId:'new',nickname:'Novo',profilePictureUrl:'https://cdn.test/b.webp',seenAt:2000});
    assert.equal(snap.profilePictureUrl.startsWith('/player-assets/avatars/'),true);
    assert.equal(ctx.repository.getProfile('u1').uniqueId,'new');
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,1);
  } finally {close(ctx);}
});

test('gift persistente duplicado executa efeito temporário e progressão uma única vez',()=>{
  const PlayerPlatform=require('../backend/persistence/playerPlatform');
  const ctx=setup({threshold:30});
  try{
    const platform=new PlayerPlatform(ctx);
    platform.observeProfile({userId:'u1',uniqueId:'u1',nickname:'U1',seenAt:1000});
    let tempCalls=0;
    const gift={roomId:'r',messageId:'m1',userId:'u1',giftId:'5655',giftName:'Rosa',repeatCount:30};
    const resolution={unitCoinValue:1,totalCoinValue:30,tierKey:'chile',maneuverName:'Donut'};
    const first=platform.resolveGift(gift,resolution,()=>{tempCalls++;});
    const second=platform.resolveGift(gift,resolution,()=>{tempCalls++;});
    assert.equal(first.accepted,true); assert.equal(second.duplicate,true); assert.equal(tempCalls,1);
    assert.equal(ctx.inventory.snapshot('u1').progression.lifetimeCoinValue,30);
    assert.equal(ctx.marketplace.listCustomKiteOrders('u1').length,1);
  } finally {close(ctx);}
});

test('gift transitório continua jogável mas não cria progressão nem pedido',()=>{
  const PlayerPlatform=require('../backend/persistence/playerPlatform');
  const ctx=setup({threshold:1});
  try{
    const platform=new PlayerPlatform(ctx);
    platform.observeProfile({userId:'u1',uniqueId:'u1',nickname:'U1',seenAt:1000});
    let tempCalls=0;
    const result=platform.resolveGift({userId:'u1',giftName:'Simulado'},
      {unitCoinValue:100,totalCoinValue:100,tierKey:'kevlar'},()=>{tempCalls++;});
    assert.equal(result.persistent,false); assert.equal(tempCalls,1);
    assert.equal(ctx.inventory.snapshot('u1').progression.lifetimeCoinValue,0);
    assert.equal(ctx.marketplace.listCustomKiteOrders('u1').length,0);
  } finally {close(ctx);}
});

test('spawn snapshot aplica loadout persistente e avatar cacheado sem acessar física',()=>{
  const PlayerPlatform=require('../backend/persistence/playerPlatform');
  const ctx=setup({threshold:0});
  try{
    const platform=new PlayerPlatform(ctx);
    platform.observeProfile({userId:'u1',uniqueId:'u1',nickname:'U1',profilePictureUrl:'https://cdn.test/u1.webp',seenAt:1000});
    ctx.inventory.grantKite('u1','raiada',{displayName:'Raiada Persistente'});
    ctx.inventory.equip('u1',{kiteKey:'raiada'});
    const persistent=platform.spawnSnapshot('u1');
    const payload=playerSpawnPayload({userId:'u1',uniqueId:'u1',nickname:'U1',profilePictureUrl:'https://remote.test/a.jpg',kiteType:'peixinho',score:0,streak:0,isKing:false},{lineType:'algodao'},[],persistent);
    assert.equal(payload.profilePictureUrl,persistent.profilePictureUrl);
    assert.equal(payload.kiteType,'raiada');
    assert.deepEqual(payload.persistentLoadout,{kiteKey:'raiada',skinKey:null});
    assert.equal(payload.equippedKite.kiteKey,'raiada');
  } finally {close(ctx);}
});

test('TikTokService e server possuem os pontos únicos de integração persistente',()=>{
  const root=path.resolve(__dirname,'..');
  const service=fs.readFileSync(path.join(root,'backend/tiktokService.js'),'utf8');
  const server=fs.readFileSync(path.join(root,'backend/server.js'),'utf8');
  assert.match(service,/playerPlatform/);
  assert.match(service,/resolveGift\(/);
  assert.match(service,/spawnSnapshot\(/);
  assert.match(server,/openPipaDatabase/);
  assert.match(server,/\/api\/marketplace\/custom-kite-orders/);
  assert.match(server,/playerPlatform/);
});

test('identidade sem userId estável permanece transitória e não cria conta persistente',()=>{
  const PlayerPlatform=require('../backend/persistence/playerPlatform');
  const ctx=setup({threshold:1});
  try{
    const platform=new PlayerPlatform(ctx);let tempCalls=0;
    const observed=platform.observeProfile({uniqueId:'nome_mutavel',nickname:'Nome'});
    const result=platform.resolveGift({uniqueId:'nome_mutavel',messageId:'m-x',roomId:'r'},
      {unitCoinValue:50,totalCoinValue:50,tierKey:'kevlar'},()=>{tempCalls++;});
    assert.equal(observed,null);assert.equal(result.persistent,false);assert.equal(tempCalls,1);
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM users').get().n,0);
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM gift_ledger').get().n,0);
  } finally {close(ctx);}
});

test('TikTokService mantém fallback de sessão sem promover uniqueId mutável a identidade persistente',()=>{
  const TikTokService=require('../backend/tiktokService');
  const GameRules=require('../backend/rules/gameRules');
  const observed=[],resolved=[];
  const io={emit(){}};const rules=new GameRules(4);
  const buffs={applyGiftUpgrade(){return {lineType:'cerol',powerMultiplier:1};}};
  const service=new TikTokService(io,rules,buffs);
  service.playerPlatform={
    observeProfile(profile){observed.push(profile);return null;},
    spawnSnapshot(){return null;},
    resolveGift(gift,resolution,applyTemporary){resolved.push(gift);applyTemporary();return {accepted:true,persistent:false};}
  };
  service.handleChatMessage({uniqueId:'mutavel',nickname:'Nome',comment:'oi'});
  service.handleFollow({uniqueId:'mutavel',nickname:'Nome'});
  service.handleGift({uniqueId:'mutavel',nickname:'Nome',giftName:'Rosa',diamondCount:1,repeatCount:1});
  assert.equal(rules.activePlayers.has('mutavel'),true,'fallback continua válido apenas na arena');
  assert.equal(observed.every(profile=>!profile.userId),true);
  assert.equal(resolved[0]?.userId,'');
});
