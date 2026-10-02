const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const smoothstep=t=>t*t*(3-2*t);

function hash01(index,salt=0){
  const x=Math.sin((index+1)*12.9898+(salt+1)*78.233)*43758.5453123;
  return x-Math.floor(x);
}

function smoothNoise(time,period,salt=0){
  const p=Math.max(1e-6,period);
  const u=time/p;
  const i=Math.floor(u);
  const f=smoothstep(u-i);
  const a=hash01(i,salt)*2-1;
  const b=hash01(i+1,salt)*2-1;
  return a+(b-a)*f;
}

function paceMultiplier(pace){
  if(String(pace).toLowerCase()==='frenetico') return 1.35;
  if(String(pace).toLowerCase()==='calmo') return .72;
  return 1;
}

export function sampleWindField(timeSeconds=0,config={}){
  const t=Math.max(0,Number(timeSeconds)||0)*paceMultiplier(config.pace);
  const intensity=Math.max(.05,Number(config.intensityMultiplier)||1);
  const direction=String(config.direction||'auto').toLowerCase();
  const dirSign=direction==='left'?-1:1;
  const base=1.02+smoothNoise(t,28,1)*.22+smoothNoise(t,53,2)*.11;
  const directional=direction==='auto'?base:Math.abs(base)*dirSign;
  const meander=smoothNoise(t,34,3)*.20;
  const vertical=smoothNoise(t,22,4)*.24;
  const depth=smoothNoise(t,31,5)*.18;

  const gustEnvelope=.88+(.5+.5*Math.sin((t/18)*TAU+0.7))*.17;
  const gustNoise=smoothNoise(t,13,6)*.055;
  const gust=clamp(gustEnvelope+gustNoise,.72,1.18)*intensity;
  const turbulence=(smoothNoise(t,7.5,7)*.08+smoothNoise(t,3.8,8)*.035)*intensity;

  const currentPhase=Math.sin(t*.055);
  const crossPhase=Math.cos(t*.041+1.1);
  const current=currentPhase>.72?'updraft'
    :currentPhase<-.72?'downdraft'
      :crossPhase>.92?'crosswind':'normal';

  return {
    time:t,
    x:(directional+meander)*intensity,
    y:vertical*intensity,
    z:depth*intensity,
    gust,
    turbulence,
    current
  };
}
