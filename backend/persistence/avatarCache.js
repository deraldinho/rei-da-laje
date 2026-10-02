const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const MIME_EXT=Object.freeze({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'});
function clean(value,max){return String(value??'').trim().slice(0,max);}
function validHttps(value){
  try{const u=new URL(String(value||''));return u.protocol==='https:'&&!u.username&&!u.password;}catch(_){return false;}
}
function digest(value){return crypto.createHash('sha256').update(value).digest('hex');}

class AvatarCache {
  constructor({db,rootDir,fetchImpl=globalThis.fetch,maxBytes=2*1024*1024}={}){
    if(!db)throw new Error('AvatarCache requires db');
    this.db=db;
    this.rootDir=rootDir||path.join(__dirname,'..','data','avatars');
    this.fetchImpl=fetchImpl;
    this.maxBytes=Math.max(1,Math.min(8*1024*1024,Number(maxBytes)||2*1024*1024));
    fs.mkdirSync(this.rootDir,{recursive:true});
    this.getStmt=db.prepare('SELECT relative_path,remote_url FROM avatar_cache WHERE user_id=?');
  }

  cachedUrl(userId){
    const row=this.getStmt.get(clean(userId,128));
    if(!row||!this._validFilename(row.relative_path))return null;
    const full=path.join(this.rootDir,row.relative_path);
    return fs.existsSync(full)?`/player-assets/avatars/${row.relative_path}`:null;
  }

  _validFilename(name){return /^[a-f0-9]{64}\.(?:jpg|png|webp)$/i.test(String(name||''));}
  async refresh({userId,remoteUrl}={}){
    const id=clean(userId,128),url=clean(remoteUrl,1000);
    if(!id||!validHttps(url)||typeof this.fetchImpl!=='function')return null;
    const existing=this.getStmt.get(id);
    const existingUrl=this.cachedUrl(id);
    if(existing&&existing.remote_url===url&&existingUrl)return {cached:true,url:existingUrl};

    let response;
    try{response=await this.fetchImpl(url,{redirect:'follow'});}catch(_){return null;}
    if(!response||response.ok===false)return null;
    const type=String(response.headers?.get?.('content-type')||'').split(';')[0].trim().toLowerCase();
    const ext=MIME_EXT[type];
    if(!ext)return null;
    const declared=Number(response.headers?.get?.('content-length'));
    if(Number.isFinite(declared)&&declared>this.maxBytes)return null;

    let body;
    try{body=Buffer.from(await response.arrayBuffer());}catch(_){return null;}
    if(!body.length||body.length>this.maxBytes)return null;
    const contentHash=digest(body);
    const filename=`${digest(`${id}:${contentHash}`)}.${ext}`;
    const full=path.join(this.rootDir,filename);
    const temp=`${full}.tmp-${process.pid}-${Date.now()}`;
    try{fs.writeFileSync(temp,body,{flag:'wx'});fs.renameSync(temp,full);}catch(_){try{fs.rmSync(temp,{force:true});}catch(__){}return null;}

    const previousPath=existing?.relative_path||null;
    try{
      this.db.exec('BEGIN IMMEDIATE');
      this.db.prepare(`INSERT INTO avatar_cache(user_id,relative_path,remote_url,etag,content_hash,mime_type,byte_size,updated_at)
        VALUES(?,?,?,?,?,?,?,?)
        ON CONFLICT(user_id) DO UPDATE SET relative_path=excluded.relative_path,remote_url=excluded.remote_url,
          etag=excluded.etag,content_hash=excluded.content_hash,mime_type=excluded.mime_type,
          byte_size=excluded.byte_size,updated_at=excluded.updated_at`)
        .run(id,filename,url,clean(response.headers?.get?.('etag'),200)||null,contentHash,type,body.length,Date.now());
      this.db.exec('COMMIT');
    }catch(_){
      try{this.db.exec('ROLLBACK');}catch(__){}
      try{fs.rmSync(full,{force:true});}catch(__){}
      return null;
    }
    if(previousPath&&previousPath!==filename&&this._validFilename(previousPath)){
      try{fs.rmSync(path.join(this.rootDir,previousPath),{force:true});}catch(_){}
    }
    return {cached:false,url:`/player-assets/avatars/${filename}`};
  }
}

module.exports=AvatarCache;
module.exports.validHttps=validHttps;
