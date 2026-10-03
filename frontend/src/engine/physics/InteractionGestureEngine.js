const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

function hash32(text){let h=2166136261>>>0;for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function unit(seed,salt){let x=(seed^Math.imul(salt+1,0x9e3779b1))>>>0;x^=x>>>16;x=Math.imul(x,0x7feb352d);x^=x>>>15;x=Math.imul(x,0x846ca68b);x^=x>>>16;return (x>>>0)/4294967295;}

const BASE=Object.freeze({
  like:{strength:.34,duration:.42},share:{strength:.78,duration:.85},
  follow:{strength:.66,duration:.72},gift:{strength:.92,duration:1.0},interaction:{strength:.45,duration:.55}
});

export function createInteractionGesture({type='interaction',count=1,userId='',kite=null,wind=null}={}){
  const kind=BASE[type]?type:'interaction',cfg=BASE[kind];
  const amount=clamp(Math.log2(1+Math.max(1,Number(count)||1))/5,0,1);
  const strength=clamp(cfg.strength+(kind==='like'?amount*.36:amount*.10),.25,1);
  const seed=hash32(`${String(userId||kite?.userId||'anon')}|${kind}|${Math.round(amount*20)}`);
  const windDir=Math.abs(Number(wind?.x)||0)>.05?Math.sign(Number(wind.x)):1;
  const slack=clamp(Number(kite?.lineSlack)||0,0,1.5),tension=clamp(Number(kite?.lineTension)||.58,0,1);
  const pullBias=slack>.2?-.16:(tension>.86?.12:-.04);
  return {source:`live_${kind}`,
    spoolCommand:clamp((unit(seed,1)*2-1)*.34*strength+pullBias,-.72,.72),
    debicoTorque:clamp((unit(seed,2)*2-1)*.34*strength+windDir*.06,-.65,.65),
    trimPitch:clamp(-.055-.13*strength+(unit(seed,3)*2-1)*.035,-.28,.02),
    tensionAssist:clamp(.04+.15*strength-spoolAssist(slack),-.08,.24),
    duration:clamp(cfg.duration+.35*amount,.3,1.35),intensity:clamp(.55+.55*strength,.55,1.2)};
}
function spoolAssist(slack){return slack>.45?.03:0;}

export const InteractionGestureEngine=Object.freeze({createGesture:createInteractionGesture});