const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const smoothstep=t=>t*t*(3-2*t);

export function physicalKiteRange(kite){
  const direct=Number(kite?.rope?._directDistance);
  if(Number.isFinite(direct)&&direct>0)return direct;
  const dx=(Number(kite?.x)||0)-(Number(kite?.baseX)||0);
  const dy=(Number(kite?.y)||0)-(Number(kite?.baseY)||0);
  const dz=(Number(kite?.z)||0)-(Number(kite?.baseZ)||0);
  return Math.hypot(dx,dy,dz);
}

export function projectKitePerspectiveDepth(kite,cameraZ=830){
  const cam=Number.isFinite(cameraZ)?cameraZ:830;
  const total=Math.max(600,Number(kite?.rope?.totalLineLength)||1800);
  const range=physicalKiteRange(kite);
  const nearRange=Math.min(320,total*.16);
  const span=Math.max(1,total-nearRange);
  const t=smoothstep(clamp((range-nearRange)/span,0,1));
  const nearCameraDistance=280;
  const farCameraDistance=Math.min(1050,cam+180);
  const physicalZ=(Number(kite?.z)||0)-(Number(kite?.baseZ)||0);
  const zNuance=clamp(physicalZ/Math.max(1,total),-1,1)*55;
  return clamp(cam-(nearCameraDistance+(farCameraDistance-nearCameraDistance)*t)+zNuance,cam-1180,cam-180);
}
