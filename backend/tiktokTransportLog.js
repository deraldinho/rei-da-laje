const fs=require('node:fs');
const path=require('node:path');
const FILE=process.env.PIPA_TIKTOK_TRANSPORT_LOG || path.join(__dirname,'data','tiktok-transport.jsonl');
const MAX_BYTES=1024*1024;
function compact(value,depth=0){
  if(depth>2)return undefined;
  if(value===null||value===undefined||typeof value==='number'||typeof value==='boolean')return value;
  if(typeof value==='string')return value.slice(0,300);
  if(Array.isArray(value))return value.slice(0,20).map(v=>compact(v,depth+1));
  if(typeof value==='object'){const out={};for(const [k,v] of Object.entries(value).slice(0,30)){const c=compact(v,depth+1);if(c!==undefined)out[k]=c;}return out;}
  return String(value).slice(0,300);
}
function transportLog(event,payload={}){
  try{
    fs.mkdirSync(path.dirname(FILE),{recursive:true});
    if(fs.existsSync(FILE)&&fs.statSync(FILE).size>MAX_BYTES){
      try{fs.renameSync(FILE,FILE+'.1');}catch(_){try{fs.unlinkSync(FILE);}catch(__){}}
    }
    fs.appendFileSync(FILE,JSON.stringify({at:Date.now(),iso:new Date().toISOString(),pid:process.pid,event,payload:compact(payload)})+'\n');
  }catch(_){/* diagnóstico nunca interfere na Live */}
}
module.exports={transportLog,FILE};
