const fs=require('node:fs');
const path=require('node:path');
function buildHistoricalSimulation(snapshotPath=path.join(__dirname,'data','arena-state.json'), outDir=path.join(__dirname,'data','replays')){
  const s=JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
  const byId=new Map((s.stats||[]).map(([id,x])=>[String(id),x]));
  const known=new Map();
  for(const p of [...(s.players||[]),...(s.queue||[])])known.set(String(p.userId),p);
  for(const [id,st] of byId)if(!known.has(id))known.set(id,{userId:id,uniqueId:st.nickname,nickname:st.nickname});
  const base=Math.max(1,Math.min(...[...byId.values()].map(x=>Number(x.lastSeenAt)||s.savedAt)));
  const events=[];let at=base;
  for(const [id,st] of byId){
    const p=known.get(id); const entries=Math.max(1,Math.min(5,Number(st.entries)||1));
    for(let i=0;i<entries;i++){events.push({type:'chat',at,payload:{userId:id,uniqueId:p.uniqueId||st.nickname,nickname:st.nickname,comment:'replay-entry'}});at+=1200;}
  }
  const totalCuts=[...byId.values()].reduce((n,x)=>n+(Number(x.cuts)||0),0);
  const doc={version:1,sessionId:String(s.sessionId),label:'reconstructed-'+String(s.sessionId).slice(0,8),
    startedAt:base,endedAt:Number(s.savedAt)||at,reconstructed:true,
    note:'Reconstrução a partir do snapshot final: preserva participantes/entradas; não inventa a ordem histórica de cortes ou presentes.',
    sourceSummary:{players:byId.size,cuts:totalCuts},events};
  fs.mkdirSync(outDir,{recursive:true});
  const file=path.join(outDir,doc.startedAt+'-'+doc.sessionId+'-reconstructed.json');
  fs.writeFileSync(file,JSON.stringify(doc,null,2),'utf8');return file;
}
if(require.main===module)console.log(buildHistoricalSimulation());
module.exports=buildHistoricalSimulation;
