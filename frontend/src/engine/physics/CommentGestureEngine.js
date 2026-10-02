const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

function normalize(text=''){
  return String(text||'').trim().toLowerCase().replace(/\s+/g,' ').slice(0,180);
}
function hash32(text){
  let h=2166136261>>>0;
  for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
  return h>>>0;
}
function unit(seed,salt){
  let x=(seed^Math.imul((salt+1),0x9e3779b1))>>>0;
  x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;
  return (x>>>0)/4294967295;
}
function textQuality(text,engagement=0){
  const words=text.split(' ').filter(Boolean),unique=new Set(words);
  const diversity=words.length?unique.size/words.length:0;
  const reaction=Math.min(1,(text.match(/[^\p{L}\p{N}\s]/gu)||[]).length/4);
  return clamp(.16+Math.min(1,text.length/70)*.34+diversity*.22+reaction*.10+clamp(engagement,0,1)*.18,.12,1);
}
export function createCommentGesture({text='',userId='',kite=null,wind=null,engagement=0}={}){
  const clean=normalize(text);
  if(!clean)return null;
  const seed=hash32(`${String(userId||'')}|${clean}`),q=textQuality(clean,engagement);
  const r1=unit(seed,1),r2=unit(seed,2),r3=unit(seed,3),r4=unit(seed,4);
  const windDir=Math.abs(Number(wind?.x)||0)>.05?Math.sign(Number(wind.x)):1;
  const slack=clamp(Number(kite?.lineSlack)||0,0,1.5);
  const tension=clamp(Number(kite?.lineTension)||.58,0,1);
  const spoolBias=slack<.08?.12:tension>.82?.18:0;
  const spoolCommand=clamp((r1*2-1)*(.42+.38*q)+spoolBias,-1,1);
  const debicoTorque=clamp((r2*2-1)*(.50+.60*q)+windDir*.10*q,-1.2,1.2);
  const trimPitch=clamp((r3*2-1)*(.10+.20*q),-.4,.4);
  const tensionAssist=clamp((r4*2-1)*(.10+.22*q)-spoolCommand*.06,-.4,.4);
  const duration=clamp(.30+1.45*(.35*q+.65*unit(seed,5)),.3,2);
  const intensity=clamp(.35+q*.78+unit(seed,6)*.22,.35,1.5);
  return {source:'comment',spoolCommand,debicoTorque,trimPitch,tensionAssist,duration,intensity};
}

export const CommentGestureEngine=Object.freeze({createGesture:createCommentGesture});
