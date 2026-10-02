const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {openPipaDatabase}=require('../backend/persistence/database');
const PlayerRepository=require('../backend/persistence/playerRepository');

function tempCtx(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-avatar-'));return {dir,db:path.join(dir,'pipa.db'),avatars:path.join(dir,'avatars')}}
function cleanup(ctx){fs.rmSync(ctx.dir,{recursive:true,force:true});}
function response(body,{type='image/webp',length=body.length}={}){
  return {ok:true,status:200,headers:{get(name){name=String(name).toLowerCase();return name==='content-type'?type:name==='content-length'?String(length):null;}},
    async arrayBuffer(){return body.buffer.slice(body.byteOffset,body.byteOffset+body.byteLength);}};
}
function seed(db){new PlayerRepository(db).upsertProfile({userId:'user/unsafe',uniqueId:'u',nickname:'U',seenAt:1000});}

test('avatar HTTPS válido é cacheado por hash e reutilizado após restart',async()=>{
  const AvatarCache=require('../backend/persistence/avatarCache');
  const ctx=tempCtx();
  try{
    let calls=0,db=openPipaDatabase(ctx.db);seed(db);
    let cache=new AvatarCache({db,rootDir:ctx.avatars,fetchImpl:async()=>{calls++;return response(Buffer.from('fake-webp'));}});
    const first=await cache.refresh({userId:'user/unsafe',remoteUrl:'https://cdn.test/avatar.webp'});
    assert.equal(first.cached,false); assert.match(first.url,/^\/player-assets\/avatars\/[a-f0-9]{64}\.webp$/);
    assert.equal(calls,1); assert.equal(fs.existsSync(path.join(ctx.avatars,path.basename(first.url))),true);
    db.close();
    db=openPipaDatabase(ctx.db); cache=new AvatarCache({db,rootDir:ctx.avatars,fetchImpl:async()=>{calls++;throw new Error('should not fetch');}});
    assert.equal(cache.cachedUrl('user/unsafe'),first.url);
    const second=await cache.refresh({userId:'user/unsafe',remoteUrl:'https://cdn.test/avatar.webp'});
    assert.equal(second.cached,true); assert.equal(calls,1); db.close();
  } finally {cleanup(ctx);}
});

test('cache rejeita URL insegura, MIME inválido e corpo acima do limite',async()=>{
  const AvatarCache=require('../backend/persistence/avatarCache');
  const ctx=tempCtx();
  try{
    const db=openPipaDatabase(ctx.db);seed(db);let calls=0;
    const cache=new AvatarCache({db,rootDir:ctx.avatars,maxBytes:8,fetchImpl:async(url)=>{
      calls++;
      if(String(url).includes('mime'))return response(Buffer.from('abc'),{type:'text/plain'});
      return response(Buffer.alloc(9),{type:'image/png',length:9});
    }});
    assert.equal(await cache.refresh({userId:'user/unsafe',remoteUrl:'http://cdn.test/a.png'}),null);
    assert.equal(calls,0);
    assert.equal(await cache.refresh({userId:'user/unsafe',remoteUrl:'https://cdn.test/mime'}),null);
    assert.equal(await cache.refresh({userId:'user/unsafe',remoteUrl:'https://cdn.test/big.png'}),null);
    assert.equal(cache.cachedUrl('user/unsafe'),null);
    db.close();
  } finally {cleanup(ctx);}
});

test('server e loaders aceitam somente rota local de avatar segura além de HTTPS',()=>{
  const root=path.resolve(__dirname,'..');
  const server=fs.readFileSync(path.join(root,'backend/server.js'),'utf8');
  const kite=fs.readFileSync(path.join(root,'frontend/src/entities/Kite.js'),'utf8');
  const rooftop=fs.readFileSync(path.join(root,'frontend/src/ui/RooftopPlayer.js'),'utf8');
  assert.match(server,/app\.use\(['"]\/player-assets\/avatars['"],\s*express\.static/);
  for(const source of [kite,rooftop]){
    assert.match(source,/player-assets\\?\/avatars/);
    assert.match(source,/\^https:/);
  }
});
