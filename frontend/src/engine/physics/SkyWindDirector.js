const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

function seedPhase(seed){
  const n=Number(seed)||0;
  const x=Math.sin((n+1)*12.9898)*43758.5453;
  return (x-Math.floor(x))*Math.PI*2;
}

export class SkyWindDirector {
  constructor(options={}){
    this.seed=Number(options.seed)||0;
    this._phase=seedPhase(this.seed)*.18;
  }

  sample(timeSeconds=0,baseWind={},crowdEnergy=0){
    const t=Math.max(0,Number(timeSeconds)||0);
    const crowd=clamp(crowdEnergy,0,1);
    const baseX=Number(baseWind.x)||0;
    const baseZ=Number(baseWind.z)||0;
    const magnitude=clamp(Math.hypot(baseX,baseZ)||Math.abs(baseX)||1,.05,1.35);
    const angle=.58*Math.sin(t*.055+this._phase)+crowd*.04*Math.sin(t*.31+this._phase*.7);
    const activity=1+crowd*.10;
    const x=Math.sin(angle)*magnitude*activity;
    const z=Math.cos(angle)*magnitude*activity;
    const y=clamp((Number(baseWind.y)||0)*(1+crowd*.08)+Math.sin(t*.071+this._phase)*.025,-.42,.42);
    const gust=clamp((Number(baseWind.gust)||1)*(1+crowd*.14),.55,1.45);
    const turbulence=clamp((Number(baseWind.turbulence)||0)+crowd*.06*(.65+.35*Math.sin(t*.23+this._phase)), -.22,.22);
    const phaseIndex=Math.floor((t+this.seed*.37)/18)%5;
    const phase=['calm','transition','crosswind','gust','recovery'][phaseIndex];
    return {...baseWind,time:t,x,y,z,gust,turbulence,phase,crowdEnergy:crowd};
  }
}
