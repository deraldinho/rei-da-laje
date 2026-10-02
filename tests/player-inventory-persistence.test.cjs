const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {openPipaDatabase}=require('../backend/persistence/database');
const PlayerRepository=require('../backend/persistence/playerRepository');
const GiftLedger=require('../backend/persistence/giftLedger');

function tempDb(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-inv-'));return {dir,file:path.join(dir,'pipa-live.db')}}
function cleanup(ctx){fs.rmSync(ctx.dir,{recursive:true,force:true});}
function seed(db){new PlayerRepository(db).upsertProfile({userId:'u1',uniqueId:'u1',nickname:'U1',seenAt:1000});}

test('progressão ownership e loadout persistem após reabrir banco',()=>{
  const PlayerInventory=require('../backend/persistence/playerInventory');
  const ctx=tempDb();
  try{
    let db=openPipaDatabase(ctx.file); seed(db); let inv=new PlayerInventory(db);
    inv.addProgress('u1',{coinValue:300,giftPoints:30});
    inv.grantKite('u1','custom:alpha',{displayName:'Alpha',assetPath:'models/alpha.glb'});
    inv.grantSkin('u1','skin:azul',{displayName:'Azul'});
    inv.equip('u1',{kiteKey:'custom:alpha',skinKey:'skin:azul'});
    db.close();
    db=openPipaDatabase(ctx.file); inv=new PlayerInventory(db);
    const snap=inv.snapshot('u1');
    assert.deepEqual(snap.progression,{giftPoints:30,lifetimeCoinValue:300,level:1});
    assert.equal(snap.ownedKites[0].kiteKey,'custom:alpha');
    assert.equal(snap.ownedSkins[0].skinKey,'skin:azul');
    assert.deepEqual(snap.loadout,{kiteKey:'custom:alpha',skinKey:'skin:azul'});
    db.close();
  } finally {cleanup(ctx);}
});

test('grant de ownership é idempotente e equip rejeita item não possuído',()=>{
  const PlayerInventory=require('../backend/persistence/playerInventory');
  const ctx=tempDb();
  try{
    const db=openPipaDatabase(ctx.file); seed(db); const inv=new PlayerInventory(db);
    assert.equal(inv.grantKite('u1','kite:one',{displayName:'One'}).granted,true);
    assert.equal(inv.grantKite('u1','kite:one',{displayName:'One'}).granted,false);
    assert.equal(inv.snapshot('u1').ownedKites.length,1);
    assert.throws(()=>inv.equip('u1',{kiteKey:'kite:missing'}),/not owned/i);
    db.close();
  } finally {cleanup(ctx);}
});

test('grant feito dentro do ledger participa do rollback atômico',()=>{
  const PlayerInventory=require('../backend/persistence/playerInventory');
  const ctx=tempDb();
  try{
    const db=openPipaDatabase(ctx.file); seed(db); const inv=new PlayerInventory(db), ledger=new GiftLedger(db);
    const entry={roomId:'r',messageId:'m',userId:'u1',giftId:'g',giftName:'G',repeatCount:1,
      unitCoinValue:100,totalCoinValue:100,tierKey:'tier',createdAt:2000};
    assert.throws(()=>ledger.claim(entry,(tx,id)=>{
      inv.addProgress('u1',{coinValue:100,giftPoints:10},tx);
      inv.grantKite('u1','kite:rollback',{sourceLedgerId:id},tx);
      throw new Error('abort');
    }),/abort/);
    assert.equal(inv.snapshot('u1').ownedKites.length,0);
    assert.equal(inv.snapshot('u1').progression.lifetimeCoinValue,0);
    db.close();
  } finally {cleanup(ctx);}
});
