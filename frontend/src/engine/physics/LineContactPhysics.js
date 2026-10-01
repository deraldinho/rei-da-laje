const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));

function naturalTension(kite){
  const ropeValue=kite?.rope?.getNaturalTension?.();
  const raw=Number.isFinite(ropeValue)?ropeValue:Number(kite?.lineTension);
  return clamp(Number.isFinite(raw)?raw:.58,0,1.5);
}

export function computeLineContactPhysics(kiteA,kiteB,hit,config={},out={}){
  if(!hit?.hit){
    Object.assign(out,{tensionA:0,tensionB:0,effectiveTension:0,sinAngle:0,crossingAngle:0,
      angleInfluence:0,normalForce:0,relativeVx:0,relativeVy:0,vSlide:0,slideA:0,slideB:0});
    return out;
  }
  const tensionA=naturalTension(kiteA), tensionB=naturalTension(kiteB);
  const sinAngle=clamp(hit.sinAngle,0,1);
  const exponent=Math.max(.01,Number(config.angleExponent)||1);
  const angleInfluence=Math.pow(sinAngle,exponent);
  const tensionMultiplier=Math.max(0,Number(config.tensionMultiplier)||0);
  const effectiveTension=.5*(tensionA+tensionB)*tensionMultiplier;
  const normalForce=effectiveTension*angleInfluence;
  const relativeVx=Number(hit.relativeVx)||0, relativeVy=Number(hit.relativeVy)||0;
  const slideA=Number(hit.slideA)||0, slideB=Number(hit.slideB)||0;
  const vSlide=Number.isFinite(hit.slidingSpeed)?Math.max(0,hit.slidingSpeed):.5*(Math.abs(slideA)+Math.abs(slideB));
  Object.assign(out,{tensionA,tensionB,effectiveTension,sinAngle,crossingAngle:Math.asin(sinAngle),
    angleInfluence,normalForce,relativeVx,relativeVy,vSlide,slideA,slideB});
  return out;
}
