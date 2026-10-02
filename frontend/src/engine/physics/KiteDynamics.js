import { SpoolController } from './SpoolController.js';
import { stepKiteAttitude } from './KiteAttitude.js';
import { computeKiteAerodynamics } from './KiteAerodynamics.js';

const SPARSE_CROSSING_SPEED = 0.72;
const DENSE_CROSSING_SPEED = 0.34;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

// Legacy targeting helpers remain exported during the migration so old replay/tests can
// inspect their historical paths. KiteDynamics.step no longer uses them as flight rails.
export function sparseCruiseTarget(kite,population=2,globalTime=0,width=1080,height=1920){
  const count=Math.max(2,Math.min(8,Math.floor(Number(population)||2)));
  const layoutIndex=Number(kite?.rooftopPlayer?.layoutIndex);
  const hasLayoutIndex=Number.isFinite(layoutIndex);
  const rank=hasLayoutIndex?((Math.floor(layoutIndex)%count)+count)%count:0;
  const fallbackPhase=Number.isFinite(kite?.windPhase)?kite.windPhase:0;
  const phase=hasLayoutIndex?(rank*Math.PI*2)/count:fallbackPhase;
  const t=Number.isFinite(globalTime)?globalTime:0;
  const w=Math.max(320,Number(width)||1080),h=Math.max(480,Number(height)||1920);
  return {x:w*(.5+Math.cos(t*SPARSE_CROSSING_SPEED+phase)*.34),
    y:h*(.28+Math.sin(t*.43+phase*.35)*.075)};
}

export function denseCruiseTarget(kite,population=40,globalTime=0,width=1080,height=1920){
  const count=Math.max(9,Math.min(40,Math.floor(Number(population)||40)));
  const layoutIndex=Number(kite?.rooftopPlayer?.layoutIndex);
  const rank=Number.isFinite(layoutIndex)?((Math.floor(layoutIndex)%count)+count)%count:0;
  const rows=count>=28?4:count>=18?3:2;
  const cols=Math.max(2,Math.ceil(count/rows));
  const row=rank%rows,col=Math.min(cols-1,Math.floor(rank/rows));
  const w=Math.max(320,Number(width)||1080),h=Math.max(480,Number(height)||1920);
  const t=Number.isFinite(globalTime)?globalTime:0;
  const phase=row*(Math.PI/2)+col*.61;
  const baseX=w*(.12+(col/Math.max(1,cols-1))*.76);
  const baseY=h*(.20+(row/Math.max(1,rows-1))*.14);
  return {x:clamp(baseX+Math.sin(t*DENSE_CROSSING_SPEED+phase)*w*.045,w*.10,w*.90),
    y:clamp(baseY+Math.cos(t*.28+phase*.6)*h*.012,h*.18,h*.38)};
}

function individuality(kite){
  const rank=Number(kite?.rooftopPlayer?.layoutIndex)||0;
  const phase=Number(kite?.windPhase)||0;
  return .5+.5*Math.sin(phase*1.71+rank*.53);
}

function localWindForKite(kite,wind,time){
  const base=wind||{};
  const phase=Number(kite?.windPhase)||0;
  const rank=Number(kite?.rooftopPlayer?.layoutIndex)||0;
  const t=Number(time)||0;
  const a=Math.sin(t*.13+phase+rank*.17);
  const b=Math.cos(t*.09+phase*1.37-rank*.11);
  const c=Math.sin(t*.047+phase*.63+rank*.31);
  const depth=clamp(((Number(kite?.z)||28)-28)/224,0,1)-.5;
  return {...base,
    x:(Number(base.x)||0)*(.86+.28*(.5+.5*b))+a*.14+c*.06,
    y:(Number(base.y)||0)+a*.38+c*.12+depth*.05,
    z:(Number(base.z)||0)+b*.30+c*.14,
    gust:Math.max(.5,(Number(base.gust)||1)*(1+a*.07+c*.03))};
}

function ensureDepth(kite){
  if(kite._physicsDepthInitialized) return;
  const rank=Number(kite?.rooftopPlayer?.layoutIndex);
  const phase=Number(kite?.windPhase)||0;
  const seed=Number.isFinite(rank)?((rank*.61803398875+.217)%1+1)%1:(.5+.5*Math.sin(phase*1.37));
  if(!Number.isFinite(kite.z)||Math.abs(kite.z)<1e-6) kite.z=45+seed*175;
  kite.vz=Number.isFinite(kite.vz)?kite.vz:0;
  kite._physicsDepthInitialized=true;
}

function edgeForce(value,min,max,softWidth,strength){
  const soft=Math.max(1,softWidth);
  if(value<min+soft) return (min+soft-value)*strength;
  if(value>max-soft) return -(value-(max-soft))*strength;
  return 0;
}

function computeBodySeparation(kite,allKites,population){
  if(!Array.isArray(allKites)||allKites.length<2)return {fx:0,fy:0,fz:0};
  const spacing=population>=30?58:population>=15?60:64;
  let fx=0,fy=0,fz=0;
  for(const other of allKites){
    if(!other||other===kite)continue;
    let dx=(Number(kite.x)||0)-(Number(other.x)||0);
    let dy=(Number(kite.y)||0)-(Number(other.y)||0);
    const dz=(Number(kite.z)||0)-(Number(other.z)||0);
    let planar=Math.hypot(dx,dy);
    if(planar>=spacing)continue;
    if(planar<.001){
      const sign=String(kite.userId||'').localeCompare(String(other.userId||''))<=0?-1:1;
      const angle=(Math.sin((Number(kite?.rooftopPlayer?.layoutIndex)||0)*2.31)*.5+.5)*Math.PI*.9+.2;
      dx=Math.cos(angle)*sign;dy=Math.sin(angle)*sign;planar=1;
    }
    const strength=(spacing-planar)/spacing*(population>=30?16:12.5);
    fx+=dx/planar*strength;
    fy+=dy/planar*strength;
    if(planar<40&&Math.abs(dz)<38)fz+=(dz===0?1:Math.sign(dz))*(1-Math.abs(dz)/38)*strength*.60;
  }
  const mag=Math.hypot(fx,fy,fz);
  if(mag>14){const s=14/mag;fx*=s;fy*=s;fz*=s;}
  return {fx,fy,fz};
}

function clampAxis(kite,key,velocityKey,min,max){
  if(kite[key]<min){kite[key]=min;if(kite[velocityKey]<0)kite[velocityKey]*=-.18;}
  else if(kite[key]>max){kite[key]=max;if(kite[velocityKey]>0)kite[velocityKey]*=-.18;}
}

export class KiteDynamics {
  static _globalTime=0;
  static _stepFrame=0;
  static _lastFrame=-1;

  static step(kite,fixedDt=1/60,wind=null,population=2,allKites=null){
    if(!kite||!Number.isFinite(kite.x)||!Number.isFinite(kite.y))return;
    const dt=Math.max(.001,Math.min(.05,Number(fixedDt)||1/60));
    const currentFrame=KiteDynamics._stepFrame;
    if(currentFrame!==KiteDynamics._lastFrame){
      KiteDynamics._globalTime+=dt;
      KiteDynamics._lastFrame=currentFrame;
    }

    ensureDepth(kite);
    if(!Number.isFinite(kite.vx))kite.vx=0;
    if(!Number.isFinite(kite.vy))kite.vy=0;
    if(!Number.isFinite(kite.vz))kite.vz=0;
    if(!Number.isFinite(kite.mass)||kite.mass<=0)kite.mass=.85;
    if(!Number.isFinite(kite.aeroArea))kite.aeroArea=.78+individuality(kite)*.42;

    if(kite.inputBuffer)kite.inputBuffer.step(dt,kite.intentController);
    if(kite.maneuverQueue)kite.maneuverQueue.step(dt,kite.intentController);

    let intent=null;
    if(kite.intentController)intent=kite.intentController.update(dt,wind,population);
    const reelVelocity=Number(intent?.reelVelocity)||0;
    const spoolCommand=Number.isFinite(intent?.spoolCommand)
      ?clamp(intent.spoolCommand,-1,1):clamp(reelVelocity/6.2,-1,1);
    const legacySteer=Number(intent?.steerIntent)||0;
    const debicoTorque=Number.isFinite(intent?.debicoTorque)?intent.debicoTorque:legacySteer*.55;
    const legacyLift=Number(intent?.liftIntent)||0;
    const trimPitch=Number.isFinite(intent?.trimPitch)?intent.trimPitch:-legacyLift*.32;

    const rope=kite.rope;
    if(rope&&!kite.spoolController)kite.spoolController=new SpoolController(rope);
    kite.spoolController?.step(dt,spoolCommand);

    const handPos={x:Number(kite.baseX)||0,y:Number(kite.baseY)||0,z:Number(kite.baseZ)||0};
    const kitePos={x:kite.x,y:kite.y,z:kite.z};
    const ropeState=rope?.getMechanicalState?.(handPos,kitePos)||{
      tension:Number(rope?.tension)||Number(kite.lineTension)||.58,
      slackRatio:Math.max(0,Number(kite.lineSlack)||0)
    };
    const tensionAssist=clamp(Number(intent?.tensionAssist)||0,-.4,.4);
    const effectiveTension=clamp((Number(ropeState.tension)||.58)+tensionAssist*.12,.08,1);

    const localWind=localWindForKite(kite,wind,KiteDynamics._globalTime);
    kite._localPhysicsWind=localWind;
    const attitude=stepKiteAttitude(kite,dt,{
      wind:localWind,tension:effectiveTension,
      debicoTorque:debicoTorque+(Number(kite._aeroHeadingTorque)||0)*.18,
      trimPitch:trimPitch+(Number(kite._aeroPitchTorque)||0)*.06
    });
    const aero=computeKiteAerodynamics(kite,localWind,{
      ...ropeState,tension:effectiveTension
    },{trimPitch});
    kite._aeroHeadingTorque=aero.headingTorque;
    kite._aeroPitchTorque=aero.pitchTorque;

    let tensionFx=0,tensionFy=0,tensionFz=0;
    if(rope?.isInitialized&&Array.isArray(rope.nodes)&&rope.nodes.length>=2){
      const top=rope.nodes[rope.nodes.length-1],prev=rope.nodes[rope.nodes.length-2];
      const dx=prev.x-top.x,dy=prev.y-top.y,dz=(prev.z||0)-(top.z||0);
      const dist=Math.hypot(dx,dy,dz)||1;
      const slackScale=clamp(1-(Number(ropeState.slackRatio)||0)*1.35,.12,1);
      const magnitude=effectiveTension*38*slackScale;
      tensionFx=dx/dist*magnitude;
      tensionFy=dy/dist*magnitude;
      tensionFz=dz/dist*magnitude;
    }

    const cp=Math.cos(attitude?.pitch||0);
    const forwardX=Math.sin(attitude?.heading||0)*cp;
    const forwardY=Math.sin(attitude?.pitch||0);
    const forwardZ=Math.cos(attitude?.heading||0)*cp;
    const pull=Math.max(0,-spoolCommand)*(18+effectiveTension*16);

    const width=Number.isFinite(kite.screenWidth)?kite.screenWidth:1080;
    const height=Number.isFinite(kite.screenHeight)?kite.screenHeight:1920;
    const minX=width*.08,maxX=width*.92,minY=height*.12,maxY=height*.44,minZ=28,maxZ=252;
    const boundaryFx=edgeForce(kite.x,minX,maxX,width*.08,.16);
    const boundaryFy=edgeForce(kite.y,minY,maxY,height*.06,.13);
    const boundaryFz=edgeForce(kite.z,minZ,maxZ,38,.18);
    const bodySeparation=computeBodySeparation(kite,allKites,population);
    // Correção de acoplamento do tether: a corda discretizada em 12 nós perde parte
    // da reação do cabo no último segmento; o chord devolve essa componente ao corpo.
    const chordFx=(handPos.x-kite.x)*effectiveTension*.07;
    const chordFz=(handPos.z-kite.z)*effectiveTension*.03;

    const aeroScale=3.15*((kite.likeBoostRemaining||0)>0?1.08:1);
    const gravity=30*kite.mass;
    const totalFx=aero.fx*1.05+tensionFx+chordFx+forwardX*pull-kite.vx*.62+boundaryFx+bodySeparation.fx;
    const totalFy=gravity+aero.fy*aeroScale+tensionFy+forwardY*pull-kite.vy*.56+boundaryFy+bodySeparation.fy;
    const totalFz=aero.fz*2.35+tensionFz+chordFz+forwardZ*pull*.72-kite.vz*.58+boundaryFz+bodySeparation.fz;

    const ax=totalFx/kite.mass,ay=totalFy/kite.mass,az=totalFz/kite.mass;
    kite.vx+=ax*dt;
    kite.vy+=ay*dt;
    kite.vz+=az*dt;

    const damping=Math.pow(.955,dt*60);
    kite.vx*=damping;
    kite.vy*=damping;
    kite.vz*=damping;

    kite.x+=kite.vx*dt*60;
    kite.y+=kite.vy*dt*60;
    kite.z+=kite.vz*dt*60;

    clampAxis(kite,'x','vx',minX,maxX);
    clampAxis(kite,'y','vy',minY,maxY);
    clampAxis(kite,'z','vz',minZ,maxZ);

    kite.rotation=clamp(Number(attitude?.roll)||0,-.65,.65);
    kite.contactSpeed=Math.hypot(kite.vx,kite.vy,kite.vz);
    kite.lineTension=effectiveTension;
    kite.lineSlack=Math.max(0,Number(ropeState.slackRatio)||0);
  }
}
