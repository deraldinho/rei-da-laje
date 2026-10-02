const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const zero=()=>({fx:0,fy:0,fz:0});

function rankOf(kite,list){
  const rank=Number(kite?.rooftopPlayer?.layoutIndex);
  if(Number.isFinite(rank))return Math.max(0,Math.floor(rank));
  return Math.max(0,list.indexOf(kite));
}

function bounded(fx,fy,fz){
  fz=clamp(fz,-8,8);let mag=Math.hypot(fx,fy,fz);
  if(mag>25){const scale=25/mag;fx*=scale;fy*=scale;fz*=scale;}
  return {fx:Number.isFinite(fx)?fx:0,fy:Number.isFinite(fy)?fy:0,fz:Number.isFinite(fz)?fz:0};
}

function explicitControl(kite){
  return Boolean(kite?.intentController?.currentAction||kite?.chatAction?.remaining>0||kite?.maneuver?.remaining>0);
}

export function computeLiveAssist(kite,kites,wind,dt=1/60){
  const list=Array.isArray(kites)?kites:[];
  if(!kite||list.length<9||kite.isInCombat||explicitControl(kite))return zero();
  const width=Math.max(320,Number(kite.screenWidth)||1080),height=Math.max(480,Number(kite.screenHeight)||1920);
  const rank=rankOf(kite,list),count=list.length,time=Math.max(0,Number(kite.liveAssistTime)||0);
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,sumX=0,sumY=0;
  for(const other of list){const x=Number(other?.x)||0,y=Number(other?.y)||0;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);sumX+=x;sumY+=y;}
  const centerX=sumX/count,centerY=sumY/count;
  let fx=0,fy=0,fz=0;
  const spanX=maxX-minX,spanY=maxY-minY;
  if(spanX<width*.68){
    const side=Math.abs(kite.x-centerX)>2?Math.sign(kite.x-centerX):Math.sign((Number(kite.baseX)||kite.x)-centerX)||1;
    fx+=side*clamp((width*.68-spanX)/width*42,0,10);
  }
  if(spanY<height*.115){
    const side=Math.abs(kite.y-centerY)>2?Math.sign(kite.y-centerY):((rank&1)?1:-1);
    fy+=side*clamp((height*.115-spanY)/height*50,0,7);
  }

  const pairCount=Math.max(1,Math.floor(count/2));
  const activePair=Math.floor(time/4)%pairCount;
  const pairIndex=Math.floor(rank/2);
  const partnerRank=(rank&1)?rank-1:Math.min(count-1,rank+1);
  const partner=list.find(other=>other!==kite&&rankOf(other,list)===partnerRank);
  const encounterActive=pairIndex===activePair&&partner&&!partner.isInCombat&&!explicitControl(partner);
  const anchorDx=partner?(Number(partner.baseX)||partner.x)-(Number(kite.baseX)||kite.x):0;
  const bodyDx=partner?(Number(partner.x)||0)-(Number(kite.x)||0):0;
  const crossed=partner&&anchorDx*bodyDx<=0;

  const spacing=count>=30?78:88;
  for(const other of list){
    if(other===kite)continue;
    const dx=(Number(kite.x)||0)-(Number(other.x)||0),dy=(Number(kite.y)||0)-(Number(other.y)||0);
    const dist=Math.hypot(dx,dy)||.001;
    const localRadius=encounterActive&&other===partner&&!crossed?34:spacing;
    if(dist>=localRadius)continue;
    const strength=(localRadius-dist)/localRadius*(count>=30?15:13);
    fx+=dx/dist*strength;fy+=dy/dist*strength*.82;
    if(dist<36)fz+=((Number(kite.z)||0)>=(Number(other.z)||0)?1:-1)*2.5;
  }
  if(encounterActive&&!crossed){
    const direction=Math.sign(anchorDx)||((rank&1)?-1:1);
    fx+=direction*14;
    fy+=clamp(((Number(partner.y)||0)-(Number(kite.y)||0))*.018,-3,3);
    fz+=clamp(((Number(partner.z)||0)-(Number(kite.z)||0))*.16,-6,6);
  }
  return bounded(fx,fy,fz);
}
