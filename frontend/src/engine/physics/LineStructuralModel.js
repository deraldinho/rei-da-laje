const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

function weakestSegment(rope){
  const wear=rope?.segmentWear;
  if(!wear?.length)return 0;
  let best=0,max=-1;
  for(let i=0;i<wear.length;i++)if((Number(wear[i])||0)>max){max=Number(wear[i])||0;best=i;}
  return best;
}

function segmentMidpoint(rope,index){
  const a=rope?.nodes?.[index],b=rope?.nodes?.[index+1];
  if(!a||!b)return {x:0,y:0,z:0};
  return {x:(Number(a.x)||0)+(Number(b.x)-Number(a.x)||0)*.5,
    y:(Number(a.y)||0)+(Number(b.y)-Number(a.y)||0)*.5,
    z:(Number(a.z)||0)+(Number(b.z)-Number(a.z)||0)*.5};
}

export function evaluateStructuralLoad(rope,material,dt=1/60){
  if(!rope)return {loadRatio:0,fatigueDelta:0,overloaded:false,broke:false};
  const seconds=clamp(dt,.001,.1),limit=Math.max(.001,Number(material?.maxTension)||1);
  const load=Math.max(0,Number(rope.structuralLoad)||0),loadRatio=load/limit;
  const overloaded=loadRatio>1;
  rope._structuralOverloadTime=overloaded?Math.max(0,Number(rope._structuralOverloadTime)||0)+seconds:0;
  if(!Number.isFinite(rope.structuralFatigue))rope.structuralFatigue=0;
  let fatigueDelta=0;
  if(overloaded&&rope._structuralOverloadTime>.12){
    fatigueDelta=Math.max(0,loadRatio-1)*seconds/.35;
    rope.structuralFatigue=clamp(rope.structuralFatigue+fatigueDelta,0,1);
  }
  const broke=rope.structuralFatigue>=1-1e-9;
  let segmentIndex=null,segmentT=.5,point=null;
  if(broke){
    segmentIndex=weakestSegment(rope);point=segmentMidpoint(rope,segmentIndex);
    rope.structuralFailure={broke:true,cause:'tension',segmentIndex,segmentT,point,
      loadRatio,load,fatigue:rope.structuralFatigue};
  }
  return {loadRatio,fatigueDelta,overloaded,broke,segmentIndex,segmentT,point,
    overloadTime:rope._structuralOverloadTime,fatigue:rope.structuralFatigue};
}
