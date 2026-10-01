const fs=require('node:fs');
const path=require('node:path');
class GameReplayStore {
  constructor(dir=path.join(__dirname,'data','replays'), now=()=>Date.now()){
    this.dir=dir;this.now=now;this.sessionId=String(now());this.startedAt=now();this.events=[];
  }
  record(type,payload={}){
    const safe={type,at:this.now(),payload:{
      userId:String(payload.userId||payload.uniqueId||'').slice(0,128),
      uniqueId:String(payload.uniqueId||'').slice(0,60),
      nickname:String(payload.nickname||payload.uniqueId||'Espectador').slice(0,60),
      comment:type==='chat'?String(payload.comment||'').slice(0,160):undefined,
      giftId:type==='gift'?String(payload.giftId||'').slice(0,80):undefined,
      giftName:type==='gift'?String(payload.giftName||'').slice(0,90):undefined,
      repeatCount:type==='gift'?Math.min(1000,Math.max(1,Number(payload.repeatCount)||1)):undefined,
      diamondCount:type==='gift'?Math.max(0,Number(payload.diamondCount)||0):undefined,
      count:type==='like'?Math.min(100000,Math.max(1,Number(payload.count||payload.likeCount)||1)):undefined,
      profilePictureUrl:type==='follow'?String(payload.profilePictureUrl||'').slice(0,1000):undefined
    }};
    this.events.push(safe); if(this.events.length>10000)this.events.shift(); return safe;
  }
  save(label='session'){
    if(!this.events.length)return null;
    fs.mkdirSync(this.dir,{recursive:true});
    const doc={version:1,sessionId:this.sessionId,label:String(label).slice(0,80),startedAt:this.startedAt,
      endedAt:this.now(),events:this.events};
    const file=path.join(this.dir,doc.startedAt+'-'+this.sessionId+'.json');
    fs.writeFileSync(file,JSON.stringify(doc,null,2),'utf8'); return file;
  }
  list(){
    if(!fs.existsSync(this.dir))return [];
    return fs.readdirSync(this.dir).filter(x=>x.endsWith('.json')).sort().reverse().slice(0,50);
  }
  load(name){
    const base=path.basename(String(name)); if(base!==name || !base.endsWith('.json'))throw new Error('Replay inválido');
    const doc=JSON.parse(fs.readFileSync(path.join(this.dir,base),'utf8'));
    if(doc.version!==1||!Array.isArray(doc.events))throw new Error('Replay inválido');
    return doc;
  }
  async replay(name,handlers,{speed=20,maxDelayMs=1000}={}){
    const doc=this.load(name); const events=doc.events.slice(0,10000); let prev=null;
    for(const e of events){
      if(prev!==null){const wait=Math.min(maxDelayMs,Math.max(0,(e.at-prev)/Math.max(1,speed)));if(wait)await new Promise(r=>setTimeout(r,wait));}
      prev=e.at; const fn=handlers[e.type]; if(fn)await fn(e.payload);
    }
    return {success:true,events:events.length,sessionId:doc.sessionId};
  }
}
module.exports=GameReplayStore;
