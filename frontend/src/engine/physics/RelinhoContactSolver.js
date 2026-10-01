import { getLineMaterial } from './LineMaterial.js';
import { DEFAULT_RELINHO_PHYSICS_CONFIG } from './RelinhoPhysicsConfig.js';
import { computeLineContactPhysics } from './LineContactPhysics.js';
import { integrateLineAbrasion } from './LineAbrasionModel.js';
import { applyLineWearAndEvaluateBreak } from './LineBreakSystem.js';

function legacyHit(contactPoint={},contactInfo={}){
  return {
    hit:true,
    x:Number.isFinite(contactInfo.x)?contactInfo.x:(Number(contactPoint.x)||0),
    y:Number.isFinite(contactInfo.y)?contactInfo.y:(Number(contactPoint.y)||0),
    z:Number.isFinite(contactInfo.z)?contactInfo.z:(Number(contactPoint.z)||0),
    segmentIndexA:Number(contactInfo.segmentIndexA??contactPoint.segmentIndexA)||0,
    segmentIndexB:Number(contactInfo.segmentIndexB??contactPoint.segmentIndexB)||0,
    s:Number.isFinite(contactInfo.s)?contactInfo.s:(Number.isFinite(contactPoint.s)?contactPoint.s:.5),
    t:Number.isFinite(contactInfo.t)?contactInfo.t:(Number.isFinite(contactPoint.t)?contactPoint.t:.5),
    sinAngle:Number.isFinite(contactInfo.sinAngle)?contactInfo.sinAngle:(Number.isFinite(contactPoint.sinAngle)?contactPoint.sinAngle:1),
    slidingSpeed:Number.isFinite(contactInfo.slidingSpeed)?contactInfo.slidingSpeed:(Number.isFinite(contactInfo.vSlide)?contactInfo.vSlide:0),
    slideA:Number.isFinite(contactInfo.slideA)?contactInfo.slideA:(Number(contactInfo.slidingSpeed)||0),
    slideB:Number.isFinite(contactInfo.slideB)?contactInfo.slideB:-(Number(contactInfo.slidingSpeed)||0),
    relativeVx:Number(contactInfo.relativeVx??contactPoint.relativeVx)||0,
    relativeVy:Number(contactInfo.relativeVy??contactPoint.relativeVy)||0,
    distance:Number(contactInfo.distance??contactPoint.distance)||0,
    contactRadius:Number(contactInfo.contactRadius??contactPoint.contactRadius)||1
  };
}

export class RelinhoContactSolver {
  static calculateFrictionalWork(kiteA,kiteB,contactPoint,contactInfo={}){
    const hit=legacyHit(contactPoint,contactInfo);
    const metrics=computeLineContactPhysics(kiteA,kiteB,hit,DEFAULT_RELINHO_PHYSICS_CONFIG,{});
    const state={...hit,...metrics,contactTime:Number.isFinite(contactInfo.contactTime)?contactInfo.contactTime:.5,
      slidingDistance:0,abrasionA:0,abrasionB:0,abrasionRateA:0,abrasionRateB:0};
    integrateLineAbrasion(state,kiteA,kiteB,1/60,DEFAULT_RELINHO_PHYSICS_CONFIG);
    const matA=kiteA?.rope?.material||getLineMaterial(kiteA?.lineType||'algodao');
    const matB=kiteB?.rope?.material||getLineMaterial(kiteB?.lineType||'algodao');
    return {
      friction:Math.max(0,((Number(matA.friction)||0)+(Number(matB.friction)||0))*.5),
      sinAngle:metrics.sinAngle,slidingSpeed:metrics.vSlide,
      damageRateA:state.abrasionRateA,damageRateB:state.abrasionRateB,
      abrasionRateA:state.abrasionRateA,abrasionRateB:state.abrasionRateB
    };
  }

  static resolveCombatStep(kiteA,kiteB,intersectionPoint,delta=1,contact=null,finalizeCutFn=null){
    if(contact?.phase&&contact.phase!=='GRINDING'){
      return {tied:true,sparksOnly:true,contactPhase:contact.phase,friction:contact.friction||0};
    }
    const step=Math.max(0,Math.min(3,Number(delta)||0));
    const dtSeconds=step/60;
    const state=contact||{};
    const hit=legacyHit(intersectionPoint,state);
    const metrics=computeLineContactPhysics(kiteA,kiteB,hit,DEFAULT_RELINHO_PHYSICS_CONFIG,{});
    Object.assign(state,hit,metrics);
    if(!Number.isFinite(state.contactTime)) state.contactTime=.5;
    if(!Number.isFinite(state.slidingDistance)) state.slidingDistance=0;
    if(!Number.isFinite(state.abrasionA)) state.abrasionA=0;
    if(!Number.isFinite(state.abrasionB)) state.abrasionB=0;
    integrateLineAbrasion(state,kiteA,kiteB,dtSeconds,DEFAULT_RELINHO_PHYSICS_CONFIG);
    const breakResult=applyLineWearAndEvaluateBreak(state,kiteA,kiteB,DEFAULT_RELINHO_PHYSICS_CONFIG);
    if(breakResult){
      const point={...intersectionPoint,...hit,kiteA,kiteB,
        segmentIndexA:hit.segmentIndexA,segmentIndexB:hit.segmentIndexB,s:hit.s,t:hit.t};
      const finalize=typeof finalizeCutFn==='function'?finalizeCutFn:(winner,loser,pt)=>({
        tied:false,winner,loser,cutX:pt.x,cutY:pt.y
      });
      return finalize(breakResult.winner,breakResult.loser,point);
    }
    return {tied:true,sparksOnly:true,winner:null,loser:null,cutX:hit.x,cutY:hit.y,
      damageA:state.wearDeltaA||0,damageB:state.wearDeltaB||0,
      abrasionRateA:state.abrasionRateA||0,abrasionRateB:state.abrasionRateB||0};
  }
}
