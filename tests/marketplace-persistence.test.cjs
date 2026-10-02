const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {openPipaDatabase}=require('../backend/persistence/database');
const PlayerRepository=require('../backend/persistence/playerRepository');
const PlayerInventory=require('../backend/persistence/playerInventory');
const GiftLedger=require('../backend/persistence/giftLedger');

function context(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-market-'));const db=openPipaDatabase(path.join(dir,'pipa.db'));new PlayerRepository(db).upsertProfile({userId:'u1',uniqueId:'u1',nickname:'U1',seenAt:1000});return {dir,db,inventory:new PlayerInventory(db),ledger:new GiftLedger(db)};}
function close(ctx){ctx.db.close();fs.rmSync(ctx.dir,{recursive:true,force:true});}
function claim(ctx,messageId,total=500){return ctx.ledger.claim({roomId:'r',messageId,userId:'u1',giftId:'g',giftName:'Gift',repeatCount:1,unitCoinValue:total,totalCoinValue:total,tierKey:'tier',createdAt:2000}).ledgerId;}

test('sem preço configurado nenhum gift cria pedido personalizado',()=>{
  const MarketplaceService=require('../backend/persistence/marketplaceService');
  const ctx=context();
  try{
    const market=new MarketplaceService({db:ctx.db,inventory:ctx.inventory});
    const ledgerId=claim(ctx,'m1',50000);
    assert.deepEqual(market.applyGiftEntitlements({userId:'u1',totalCoinValue:50000,ledgerId}),[]);
    assert.equal(market.listCustomKiteOrders('u1').length,0);
  } finally {close(ctx);}
});

test('threshold configurado cria um único pedido persistente por ledger',()=>{
  const MarketplaceService=require('../backend/persistence/marketplaceService');
  const ctx=context();
  try{
    const market=new MarketplaceService({db:ctx.db,inventory:ctx.inventory,customKiteMinCoins:500});
    const ledgerId=claim(ctx,'m2',600);
    const first=market.applyGiftEntitlements({userId:'u1',totalCoinValue:600,ledgerId});
    const second=market.applyGiftEntitlements({userId:'u1',totalCoinValue:600,ledgerId});
    assert.equal(first.length,1); assert.equal(first[0].type,'custom_kite_order');
    assert.deepEqual(second,[]);
    const orders=market.listCustomKiteOrders('u1');
    assert.equal(orders.length,1); assert.equal(orders[0].status,'pending');
    assert.equal(orders[0].sourceLedgerId,ledgerId);
  } finally {close(ctx);}
});

test('gift transitório sem ledgerId nunca fabrica pedido permanente',()=>{
  const MarketplaceService=require('../backend/persistence/marketplaceService');
  const ctx=context();
  try{
    const market=new MarketplaceService({db:ctx.db,inventory:ctx.inventory,customKiteMinCoins:1});
    assert.deepEqual(market.applyGiftEntitlements({userId:'u1',totalCoinValue:99999,ledgerId:null}),[]);
    assert.equal(market.listCustomKiteOrders().length,0);
  } finally {close(ctx);}
});

test('aprovar pedido concede ownership permanente da pipa exatamente uma vez',()=>{
  const MarketplaceService=require('../backend/persistence/marketplaceService');
  const ctx=context();
  try{
    const market=new MarketplaceService({db:ctx.db,inventory:ctx.inventory,customKiteMinCoins:500});
    const ledgerId=claim(ctx,'m3',800);
    market.applyGiftEntitlements({userId:'u1',totalCoinValue:800,ledgerId});
    const order=market.listCustomKiteOrders('u1')[0];
    const owned=market.approveCustomKiteOrder(order.id,{kiteKey:'custom:dynho-01',name:'Dynho 01',assetPath:'models/dynho-01.glb'});
    assert.equal(owned.kiteKey,'custom:dynho-01');
    assert.equal(ctx.inventory.snapshot('u1').ownedKites.length,1);
    assert.equal(market.listCustomKiteOrders('u1')[0].status,'approved');
    assert.throws(()=>market.approveCustomKiteOrder(order.id,{kiteKey:'custom:dynho-02'}),/not pending/i);
  } finally {close(ctx);}
});
