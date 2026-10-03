import { ensureKiteAttitude } from './KiteAttitude.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

export function computeKiteAerodynamics(kite,wind={},ropeState={},control={}){
  const a=ensureKiteAttitude(kite);
  const gust=Math.max(.5,Number(wind?.gust)||1);
  // Forward flight uses the same scale on all three axes, so a steady wind
  // still produces lift while its lateral component crosses zero.
  const windVx=(Number(wind?.x)||0)*(wind.flightCone?48:34)*gust;
  const windVy=(Number(wind?.y)||0)*(wind.flightCone?48*gust:16);
  const windVz=(Number(wind?.z)||0)*(wind.flightCone?48*gust:22);
  const avx=windVx-(Number(kite?.vx)||0);
  const avy=windVy-(Number(kite?.vy)||0);
  const avz=windVz-(Number(kite?.vz)||0);
  const apparentSpeed=Math.hypot(avx,avy,avz);
  const invSpeed=apparentSpeed>1e-6?1/apparentSpeed:0;
  const nx=avx*invSpeed, ny=avy*invSpeed, nz=avz*invSpeed;
  const tension=clamp(ropeState?.tension??.58,0,1);
  const slack=clamp(ropeState?.slackRatio??0,0,2);
  const area=Math.max(.35,Number(kite?.aeroArea)||1);
  const q=Math.min(2600,apparentSpeed*apparentSpeed*.018*area);
  const dragCoeff=.42;
  const liftCoeff=.78+.22*tension-.10*Math.min(1,slack);
  const drag=q*dragCoeff;
  const lift=q*liftCoeff;
  const cp=Math.cos(a.pitch);
  const forwardX=Math.sin(a.heading)*cp;
  const forwardY=Math.sin(a.pitch);
  const forwardZ=Math.cos(a.heading)*cp;
  const trim=clamp(control?.trimPitch??0,-1,1);

  const fx=nx*drag+forwardX*lift*.28;
  const fy=ny*drag-lift*(.72+.18*Math.cos(a.pitch))+forwardY*lift*.08-trim*lift*.08;
  const fz=nz*drag+Math.sin(a.roll)*lift*.16;
  const cross=nx*forwardZ-nz*forwardX;
  const headingTorque=clamp(cross*q*.012,-1.5,1.5);
  const pitchTorque=clamp((-a.pitch*.9+ny*.18+trim*.45)*q*.008,-1.2,1.2);

  return {
    fx:Number.isFinite(fx)?fx:0,
    fy:Number.isFinite(fy)?fy:0,
    fz:Number.isFinite(fz)?fz:0,
    headingTorque:Number.isFinite(headingTorque)?headingTorque:0,
    pitchTorque:Number.isFinite(pitchTorque)?pitchTorque:0,
    apparentSpeed:Number.isFinite(apparentSpeed)?apparentSpeed:0
  };
}
