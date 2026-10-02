import { getLineMaterial } from './LineMaterial.js';

const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const materialOf=kite=>kite?.rope?.material||getLineMaterial(kite?.lineType||'algodao');

function defenseMultiplier(kite){
  const maneuver=clamp(kite?.maneuver?.defense??1,.5,1);
  const window=kite?.defenseWindowRemaining>0?.72:1;
  const combo=clamp(kite?.chatCombo?.defense??1,.7,1);
  const special=kite?.isInvulnerable?.52:1;
  return maneuver*window*combo*special;
}

function directionFactor(slide){
  if(slide>1e-6) return 1.08;
  if(slide<-1e-6) return .92;
  return 1;
}

export function integrateLineAbrasion(contact,kiteA,kiteB,dtSeconds,config={}){
  if(!contact) return contact;
  const dt=Math.max(0,Math.min(.25,Number(dtSeconds)||0));
  const vSlide=Math.max(0,Number(contact.vSlide)||0);
  const minSlide=Math.max(0,Number(config.minSlideSpeed)||0);
  const effectiveSlide=Math.max(0,vSlide-minSlide);
  const matA=materialOf(kiteA), matB=materialOf(kiteB);
  const friction=clamp((Number(matA.friction||0)+Number(matB.friction||0))*.5,0,2);
  const frictionMultiplier=Math.max(0,Number(config.frictionMultiplier)||0);
  const normalForce=Math.max(0,Number(contact.normalForce)||0);
  const minContact=Math.max(0,Number(config.minContactTime)||0);
  const rampSec=Math.max(1e-6,Number(config.engagementRampSec)||.2);
  const contactTime=Math.max(0,Number(contact.contactTime)||0);
  const ramp=contactTime<=minContact?0:clamp((contactTime-minContact)/rampSec,0,1);
  const physicalRate=Math.max(0,Number(config.abrasionK)||0)*normalForce*effectiveSlide;
  const contactFloor=Math.max(0,Number(config.contactDamageFloor)||0);
  const baseRate=(physicalRate+contactFloor)*frictionMultiplier*friction*ramp;

  // slideA usa vA-vB projetado em A. Para B, o movimento próprio relativo
  // é vB-vA, portanto o sinal físico equivalente é -slideB. Isso torna a
  // exposição direcional invariável à ordem A/B sem remover assimetria real.
  const ownSlideA=Number(contact.slideA)||0;
  const ownSlideB=-(Number(contact.slideB)||0);
  const absA=Math.abs(ownSlideA), absB=Math.abs(ownSlideB);
  const totalSlide=absA+absB;
  const driveA=totalSlide>1e-9?absA/totalSlide:.5;
  const driveB=totalSlide>1e-9?absB/totalSlide:.5;
  const tA=Math.max(0,Number(contact.tensionA)||0), tB=Math.max(0,Number(contact.tensionB)||0);
  const totalTension=tA+tB;
  const shareA=totalTension>1e-9?tA/totalTension:.5, shareB=totalTension>1e-9?tB/totalTension:.5;
  const attackA=(.72+.56*driveA)*directionFactor(ownSlideA)*(.85+.3*shareA);
  const attackB=(.72+.56*driveB)*directionFactor(ownSlideB)*(.85+.3*shareB);

  const ratioOnA=Math.max(.05,Number(matB.abrasiveness)||1)/Math.max(.05,Number(matA.abrasionResistance)||1);
  const ratioOnB=Math.max(.05,Number(matA.abrasiveness)||1)/Math.max(.05,Number(matB.abrasionResistance)||1);
  const rateA=baseRate*ratioOnA*attackB*defenseMultiplier(kiteA);
  const rateB=baseRate*ratioOnB*attackA*defenseMultiplier(kiteB);
  const deltaA=rateA*dt, deltaB=rateB*dt;
  contact.abrasionRateA=rateA; contact.abrasionRateB=rateB;
  contact.wearDeltaA=deltaA; contact.wearDeltaB=deltaB;
  contact.abrasionA=Math.max(0,Number(contact.abrasionA)||0)+deltaA;
  contact.abrasionB=Math.max(0,Number(contact.abrasionB)||0)+deltaB;
  const managerIntegrated=Number.isFinite(contact._distanceStep)&&contact._distanceStep===contact._lastTouchedStep;
  if(!managerIntegrated) contact.slidingDistance=Math.max(0,Number(contact.slidingDistance)||0)+vSlide*dt;
  return contact;
}
