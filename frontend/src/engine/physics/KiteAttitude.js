const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const wrapPi=a=>{
  let v=Number(a)||0;
  while(v>Math.PI)v-=Math.PI*2;
  while(v<-Math.PI)v+=Math.PI*2;
  return v;
};

export function ensureKiteAttitude(kite){
  if(!kite) return null;
  if(!kite.attitude){
    kite.attitude={
      heading:wrapPi(Number.isFinite(kite.heading)?kite.heading:(Number.isFinite(kite.rotation)?kite.rotation:0)),
      pitch:clamp(Number.isFinite(kite.pitch)?kite.pitch:-.08,-.65,.65),
      roll:clamp(Number.isFinite(kite.roll)?kite.roll:0,-.75,.75),
      headingRate:0,
      pitchRate:0
    };
  }
  return kite.attitude;
}

export function stepKiteAttitude(kite,dt=1/60,{wind=null,tension=.58,debicoTorque=0,trimPitch=0}={}){
  const a=ensureKiteAttitude(kite);
  if(!a) return null;
  const seconds=Math.max(.001,Math.min(.05,Number(dt)||1/60));
  const t=clamp(tension,0,1);
  const wx=Number(wind?.x)||0, wy=Number(wind?.y)||0, wz=Number(wind?.z)||0;
  const yawGain=3.2*(1-.70*t);
  const yawDamping=1.6+7.5*t;
  const windYaw=(wz*.09-wx*.015)*(1-.55*t);
  a.headingRate += ((Number(debicoTorque)||0)*yawGain+windYaw-a.headingRate*yawDamping)*seconds;
  a.headingRate=clamp(a.headingRate,-2.4,2.4);
  a.heading=wrapPi(a.heading+a.headingRate*seconds);

  const targetPitch=-.08+clamp(Number(trimPitch)||0,-1,1)*.34;
  const pitchStiffness=2.2+5.8*t;
  const pitchDamping=1.8+6.2*t;
  const pitchDrive=(targetPitch-a.pitch)*pitchStiffness+wy*.06*(1-.4*t);
  a.pitchRate += (pitchDrive-a.pitchRate*pitchDamping)*seconds;
  a.pitchRate=clamp(a.pitchRate,-1.8,1.8);
  a.pitch=clamp(a.pitch+a.pitchRate*seconds,-.62,.62);

  const targetRoll=clamp(-a.headingRate*.28+wz*.04,-.55,.55);
  a.roll += (targetRoll-a.roll)*Math.min(1,seconds*(3.5+4*t));
  a.roll=clamp(a.roll,-.65,.65);

  kite.heading=a.heading;
  kite.pitch=a.pitch;
  kite.roll=a.roll;
  return a;
}
