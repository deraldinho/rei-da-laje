const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {openPipaDatabase}=require('../backend/persistence/database');
const PlayerRepository=require('../backend/persistence/playerRepository');

function tempDb(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-ledger-'));
  return {dir,file:path.join(dir,'pipa-live.db')};
}
function cleanup(ctx){fs.rmSync(ctx.dir,{recursive:true,force:true});}
function seedUser(db,userId='u1'){
  new PlayerRepository(db).upsertProfile({userId,uniqueId:userId,nickname:'Jogador',seenAt:1000});
}
function gift(overrides={}){
  return {roomId:'room-1',messageId:'msg-1',userId:'u1',giftId:'5655',giftName:'Rosa',
    repeatCount:30,unitCoinValue:1,totalCoinValue:30,tierKey:'chile',maneuverName:'Donut',createdAt:2000,...overrides};
}

test('buildGiftEventKey exige messageId estável e inclui sala quando disponível',()=>{
  const {buildGiftEventKey}=require('../backend/persistence/giftLedger');
  assert.equal(buildGiftEventKey({roomId:'r',messageId:'m'}),'tiktok:r:m');
  assert.equal(buildGiftEventKey({messageId:'m'}),'tiktok:_:m');
  assert.equal(buildGiftEventKey({roomId:'r'}),null);
});

test('mesmo gift é aceito uma vez inclusive após reabrir o banco',()=>{
  const GiftLedger=require('../backend/persistence/giftLedger');
  const ctx=tempDb();
  try{
    let db=openPipaDatabase(ctx.file); seedUser(db);
    let ledger=new GiftLedger(db);
    const first=ledger.claim(gift());
    const second=ledger.claim(gift());
    assert.equal(first.accepted,true); assert.equal(first.persistent,true);
    assert.equal(second.accepted,false); assert.equal(second.duplicate,true);
    db.close();

    db=openPipaDatabase(ctx.file); ledger=new GiftLedger(db);
    const afterRestart=ledger.claim(gift());
    assert.equal(afterRestart.accepted,false); assert.equal(afterRestart.duplicate,true);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM gift_ledger').get().n,1);
    db.close();
  } finally { cleanup(ctx); }
});

test('messageId diferente aceita novo evento e persiste valores finalizados',()=>{
  const GiftLedger=require('../backend/persistence/giftLedger');
  const ctx=tempDb();
  try{
    const db=openPipaDatabase(ctx.file); seedUser(db); const ledger=new GiftLedger(db);
    ledger.claim(gift()); ledger.claim(gift({messageId:'msg-2',repeatCount:1,unitCoinValue:30,totalCoinValue:30}));
    const rows=db.prepare('SELECT message_id,repeat_count,unit_coin_value,total_coin_value,tier_key FROM gift_ledger ORDER BY id').all();
    assert.equal(rows.length,2);
    assert.deepEqual(rows[0],Object.assign(Object.create(null),{message_id:'msg-1',repeat_count:30,unit_coin_value:1,total_coin_value:30,tier_key:'chile'}));
    db.close();
  } finally { cleanup(ctx); }
});

test('grant persistente falho reverte ledger e grant na mesma transação',()=>{
  const GiftLedger=require('../backend/persistence/giftLedger');
  const ctx=tempDb();
  try{
    const db=openPipaDatabase(ctx.file); seedUser(db); const ledger=new GiftLedger(db);
    assert.throws(()=>ledger.claim(gift(),(tx)=>{
      tx.prepare('INSERT INTO progression(user_id,gift_points,lifetime_coin_value,level,updated_at) VALUES(?,?,?,?,?)')
        .run('u1',30,30,1,2000);
      throw new Error('grant failed');
    }),/grant failed/);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM gift_ledger').get().n,0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM progression').get().n,0);
    db.close();
  } finally { cleanup(ctx); }
});

test('gift sem messageId permanece transitório e não executa grant permanente',()=>{
  const GiftLedger=require('../backend/persistence/giftLedger');
  const ctx=tempDb();
  try{
    const db=openPipaDatabase(ctx.file); seedUser(db); const ledger=new GiftLedger(db);
    let calls=0; const result=ledger.claim(gift({messageId:''}),()=>{calls++;});
    assert.deepEqual(result,{accepted:true,duplicate:false,persistent:false,ledgerId:null});
    assert.equal(calls,0);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM gift_ledger').get().n,0);
    db.close();
  } finally { cleanup(ctx); }
});
