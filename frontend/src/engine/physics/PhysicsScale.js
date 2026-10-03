const REF_WIDTH=1080;
const REF_HEIGHT=1920;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));

export function physicsWorldScale(width,height){
  const w=Math.max(1,Number(width)||REF_WIDTH);
  const h=Math.max(1,Number(height)||REF_HEIGHT);
  return clamp(Math.sqrt((w*h)/(REF_WIDTH*REF_HEIGHT)),.35,3);
}

export function contactScaleForPair(kiteA,kiteB){
  const scaleOf=kite=>Number.isFinite(Number(kite?.physicsScale))
    ? Number(kite.physicsScale)
    : physicsWorldScale(kite?.screenWidth,kite?.screenHeight);
  const a=scaleOf(kiteA),b=scaleOf(kiteB);
  return Math.sqrt(Math.max(.01,a*b));
}
