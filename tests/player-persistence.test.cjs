const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const databaseModule='../backend/persistence/database';
const repositoryModule='../backend/persistence/playerRepository';

function tempDb(){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-db-'));
  return {dir,file:path.join(dir,'pipa-live.db')};
}
function cleanup(ctx){fs.rmSync(ctx.dir,{recursive:true,force:true});}

test('SQLite cria schema v1 completo com WAL e foreign keys',()=>{
  const {openPipaDatabase}=require(databaseModule);
  const ctx=tempDb();
  try{
    const db=openPipaDatabase(ctx.file);
    assert.equal(db.prepare('PRAGMA journal_mode').get().journal_mode,'wal');
    assert.equal(db.prepare('PRAGMA foreign_keys').get().foreign_keys,1);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version,1);
    const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name);
    for(const name of ['users','avatar_cache','owned_kites','owned_skins','loadouts','progression','gift_ledger','custom_kite_orders']) assert.ok(tables.includes(name),name);
    db.close();
  } finally { cleanup(ctx); }
});

test('rename mantém uma única identidade pelo userId',()=>{
  const {openPipaDatabase}=require(databaseModule);
  const PlayerRepository=require(repositoryModule);
  const ctx=tempDb();
  try{
    const db=openPipaDatabase(ctx.file), repo=new PlayerRepository(db);
    repo.upsertProfile({userId:'123',uniqueId:'dynho_old',nickname:'Dynho',profilePictureUrl:'https://cdn.test/a.jpg',seenAt:1000});
    repo.upsertProfile({userId:'123',uniqueId:'dynho_new',nickname:'Deraldinho',profilePictureUrl:'https://cdn.test/b.jpg',seenAt:2000});
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM users').get().n,1);
    assert.deepEqual(repo.getProfile('123'),{
      userId:'123',uniqueId:'dynho_new',nickname:'Deraldinho',profilePictureUrl:'https://cdn.test/b.jpg',createdAt:1000,updatedAt:2000,lastSeenAt:2000
    });
    db.close();
  } finally { cleanup(ctx); }
});

test('perfil e snapshot persistem após reabrir banco',()=>{
  const {openPipaDatabase}=require(databaseModule);
  const PlayerRepository=require(repositoryModule);
  const ctx=tempDb();
  try{
    let db=openPipaDatabase(ctx.file), repo=new PlayerRepository(db);
    repo.upsertProfile({userId:'u9',uniqueId:'usuario',nickname:'Jogador',profilePictureUrl:'https://cdn.test/u9.webp',seenAt:3210});
    db.close();
    db=openPipaDatabase(ctx.file); repo=new PlayerRepository(db);
    const snap=repo.getPersistentSnapshot('u9');
    assert.equal(snap.userId,'u9'); assert.equal(snap.nickname,'Jogador');
    assert.equal(snap.avatarRelativePath,null);
    db.close();
  } finally { cleanup(ctx); }
});
