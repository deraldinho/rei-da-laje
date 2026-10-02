const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

function normalize(text=''){
  return String(text||'').trim().toLowerCase().replace(/\s+/g,' ').slice(0,180);
}
function quality(text){
  const words=text.split(' ').filter(Boolean),unique=new Set(words);
  const diversity=words.length?unique.size/words.length:0;
  return clamp(.25+Math.min(1,text.length/80)*.45+diversity*.30,.2,1);
}

export class CrowdEnergy{
  constructor(options={}){
    this.value=0;
    this.maxRecent=Math.max(16,Math.floor(Number(options.maxRecent)||256));
    this.recent=new Map();
  }
  get recentSize(){return this.recent.size;}
  _trim(){while(this.recent.size>this.maxRecent)this.recent.delete(this.recent.keys().next().value);}
  accept(event={},nowMs=Date.now()){
    const userId=String(event.userId||event.uniqueId||'anon').slice(0,128);
    const text=normalize(event.text||event.comment||'');
    if(!text)return this.value;
    const now=Number(nowMs)||Date.now(),prior=this.recent.get(userId);
    const same=prior?.text===text,age=prior?Math.max(0,now-prior.at):Infinity;
    let multiplier=1;
    if(age<700)multiplier=.05;
    else if(same&&age<3500)multiplier=.18;
    else if(age<1400)multiplier=.45;
    const delta=(.018+quality(text)*.032)*multiplier;
    this.value=clamp(this.value+delta,0,1);
    this.recent.delete(userId);
    this.recent.set(userId,{at:now,text});
    this._trim();
    return this.value;
  }
  step(dt=1/60){
    const seconds=clamp(dt,0,.25);
    this.value=clamp(this.value*Math.exp(-seconds/7.5),0,1);
    return this.value;
  }
  reset(){this.value=0;this.recent.clear();}
}
