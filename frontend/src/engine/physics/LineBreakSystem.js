import { getLineMaterial } from './LineMaterial.js';

const materialOf=kite=>kite?.rope?.material||getLineMaterial(kite?.lineType||'algodao');

function projectHp(kite){
  if(!kite?.rope) return 1;
  const integrity=Math.max(0,Math.min(1,kite.rope.getWeakestSegmentIntegrity()));
  const maxHp=Math.max(1,Number(kite.maxLineHP)||100);
  const structural=maxHp*integrity;
  const current=Number.isFinite(kite.lineHP)?kite.lineHP:maxHp;
  kite.lineHP=Math.max(0,Math.min(current,structural));
  kite._hpBarDirty=true;
  return integrity;
}

function tipRatio(kite,contact){
  if(!kite||![kite.x,kite.y,kite.baseX,kite.baseY,contact?.x,contact?.y].every(Number.isFinite)) return NaN;
  const total=Math.hypot(kite.x-kite.baseX,kite.y-kite.baseY);
  return total>1e-6?Math.hypot(kite.x-contact.x,kite.y-contact.y)/total:NaN;
}

function makeBreakResult(contact,winner,loser,loserIsA){
  return {
    winner, loser, tied:false,
    cutX:Number(contact.x)||0, cutY:Number(contact.y)||0, cutZ:Number(contact.z)||0,
    segmentIndex:loserIsA?contact.segmentIndexA:contact.segmentIndexB,
    segmentT:loserIsA?contact.s:contact.t,
    breakSegmentIndex:loserIsA?contact.segmentIndexA:contact.segmentIndexB,
    breakSegmentT:loserIsA?contact.s:contact.t
  };
}


function makeStructuralBreakResult(failure,winner,loser){
  const point=failure?.point||{};
  if(loser){loser.lineHP=0;loser._hpBarDirty=true;}
  return {winner,loser,tied:false,cause:'tension',cutX:Number(point.x)||0,cutY:Number(point.y)||0,
    cutZ:Number(point.z)||0,segmentIndex:failure.segmentIndex,segmentT:failure.segmentT,
    breakSegmentIndex:failure.segmentIndex,breakSegmentT:failure.segmentT};
}

export function applyLineWearAndEvaluateBreak(contact,kiteA,kiteB,config={}){
  if(!contact||!kiteA||!kiteB) return null;
  const matA=materialOf(kiteA), matB=materialOf(kiteB);
  const structuralA=kiteA.rope?.structuralFailure?.broke?kiteA.rope.structuralFailure:null;
  const structuralB=kiteB.rope?.structuralFailure?.broke?kiteB.rope.structuralFailure:null;
  if(structuralA||structuralB){
    if(structuralA&&!structuralB)return makeStructuralBreakResult(structuralA,kiteB,kiteA);
    if(structuralB&&!structuralA)return makeStructuralBreakResult(structuralB,kiteA,kiteB);
    return String(kiteA.userId||'').localeCompare(String(kiteB.userId||''))<=0
      ?makeStructuralBreakResult(structuralB,kiteA,kiteB):makeStructuralBreakResult(structuralA,kiteB,kiteA);
  }
  const cap=Math.max(0,Number(config.maxWearPerTick)||0.012);
  const apply=(kite,segment,energy,mat)=>{
    if(!kite.rope?.applyAbrasionEnergy) return {broke:false,delta:0,integrity:1};
    return kite.rope.applyAbrasionEnergy(segment,energy,mat.cutResistance||1,cap);
  };
  const a=apply(kiteA,contact.segmentIndexA,contact.wearDeltaA,matA);
  const b=apply(kiteB,contact.segmentIndexB,contact.wearDeltaB,matB);
  projectHp(kiteA); projectHp(kiteB);
  if(!a.broke&&!b.broke) return null;
  if(a.broke&&!b.broke) return makeBreakResult(contact,kiteB,kiteA,true);
  if(b.broke&&!a.broke) return makeBreakResult(contact,kiteA,kiteB,false);

  const normalizedRateA=Math.max(0,Number(contact.abrasionRateA)||0)/Math.max(.001,Number(matA.cutResistance)||1);
  const normalizedRateB=Math.max(0,Number(contact.abrasionRateB)||0)/Math.max(.001,Number(matB.cutResistance)||1);
  if(Math.abs(normalizedRateA-normalizedRateB)>1e-9){
    return normalizedRateA>normalizedRateB
      ? makeBreakResult(contact,kiteB,kiteA,true)
      : makeBreakResult(contact,kiteA,kiteB,false);
  }
  const ratioA=tipRatio(kiteA,contact), ratioB=tipRatio(kiteB,contact);
  if(Number.isFinite(ratioA)&&Number.isFinite(ratioB)&&Math.abs(ratioA-ratioB)>1e-5){
    return ratioA<ratioB?makeBreakResult(contact,kiteA,kiteB,false):makeBreakResult(contact,kiteB,kiteA,true);
  }
  return String(kiteA.userId||'').localeCompare(String(kiteB.userId||''))<=0
    ? makeBreakResult(contact,kiteA,kiteB,false)
    : makeBreakResult(contact,kiteB,kiteA,true);
}
