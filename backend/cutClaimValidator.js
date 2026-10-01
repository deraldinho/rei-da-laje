function intersection(a,b){
  const x1=a.baseX,y1=a.baseY,x2=a.x,y2=a.y,x3=b.baseX,y3=b.baseY,x4=b.x,y4=b.y;
  if(![x1,y1,x2,y2,x3,y3,x4,y4].every(Number.isFinite))return null;
  const den=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
  if(Math.abs(den)<1e-6)return null;
  const t=((x1-x3)*(y3-y4)-(y1-y3)*(x3-x4))/den;
  const u=-((x1-x2)*(y1-y3)-(y1-y2)*(x1-x3))/den;
  if(t<0||t>1||u<0||u>1)return null;
  return {x:x1+t*(x2-x1),y:y1+t*(y2-y1)};
}

/** Distância mínima de ponto P ao segmento AB */
function pointToSegmentDist(px,py,ax,ay,bx,by){
  const dx=bx-ax,dy=by-ay,len2=dx*dx+dy*dy;
  if(len2<1e-9)return Math.hypot(px-ax,py-ay);
  const t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/len2));
  return Math.hypot(px-(ax+t*dx),py-(ay+t*dy));
}

function pointToPolylineDist(px,py,nodes){
  if(!Array.isArray(nodes)||nodes.length<2)return Infinity;
  let best=Infinity;
  for(let i=0;i<nodes.length-1;i++){
    const a=nodes[i],b=nodes[i+1];
    if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite))continue;
    best=Math.min(best,pointToSegmentDist(px,py,a.x,a.y,b.x,b.y));
  }
  return best;
}

function validateCutClaim(data,rules,states,now=Date.now()){
  const winnerId=String(data?.winnerId||''),loserId=String(data?.loserId||'');
  if(!winnerId||!loserId||winnerId===loserId)return {ok:false,reason:'INVALID_IDS'};
  if(!rules.activePlayers.has(winnerId)||!rules.activePlayers.has(loserId))return {ok:false,reason:'NOT_ACTIVE'};
  const a=states.get(winnerId),b=states.get(loserId);
  if(!a||!b)return {ok:false,reason:'NO_STATE'};
  if(now-(a.updatedAt||0)>2500||now-(b.updatedAt||0)>2500)return {ok:false,reason:'STALE_STATE'};
  const claimedX=Number(data.cutX),claimedY=Number(data.cutY);
  if(!Number.isFinite(claimedX)||!Number.isFinite(claimedY))return {ok:false,reason:'INVALID_POINT'};

  const screenH = Math.max(1080, Number(a.screenHeight || b.screenHeight) || 1920);
  const screenW = Math.max(720, Number(a.screenWidth || b.screenWidth) || 1080);

  // 1. Caminho autoritativo atual: checkpoint inclui os nós XPBD das duas linhas.
  // O ponto reivindicado deve estar realmente próximo das DUAS polilinhas físicas.
  if(Array.isArray(a.ropeNodes)&&a.ropeNodes.length>=2&&Array.isArray(b.ropeNodes)&&b.ropeNodes.length>=2){
    const ropeSlack=Math.max(24,Math.min(72,screenW*0.045));
    const distA=pointToPolylineDist(claimedX,claimedY,a.ropeNodes);
    const distB=pointToPolylineDist(claimedX,claimedY,b.ropeNodes);
    if(distA<=ropeSlack&&distB<=ropeSlack){
      return {ok:true,winnerId,loserId,cutX:claimedX,cutY:claimedY};
    }
    return {ok:false,reason:'PHYSICAL_POINT_MISMATCH'};
  }

  // 2. Compatibilidade legada sem ropeNodes: exige proximidade razoável das duas
  // retas mão→pipa; remove a antiga tolerância de centenas de pixels que aceitava
  // linhas paralelas separadas por ~500px.
  const inter=intersection(a,b);
  const interTolerance=Math.max(70,Math.min(160,screenH*0.055));
  if(inter&&Math.hypot(claimedX-inter.x,claimedY-inter.y)<=interTolerance){
    return {ok:true,winnerId,loserId,cutX:claimedX,cutY:claimedY};
  }

  const segmentSlack=Math.max(48,Math.min(110,screenW*0.065));
  const distA=pointToSegmentDist(claimedX,claimedY,a.baseX,a.baseY,a.x,a.y);
  const distB=pointToSegmentDist(claimedX,claimedY,b.baseX,b.baseY,b.x,b.y);
  if(distA<=segmentSlack&&distB<=segmentSlack){
    return {ok:true,winnerId,loserId,cutX:claimedX,cutY:claimedY};
  }

  if(inter) return {ok:false,reason:'POINT_MISMATCH'};
  return {ok:false,reason:'NO_INTERSECTION'};
}

module.exports={validateCutClaim,intersection};
