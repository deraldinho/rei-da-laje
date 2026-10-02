import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

export function computeWindFollowFrame(camera,basePos,kites3D,wind={}){
  const positions=[];
  if(kites3D&&typeof kites3D.values==='function'){
    for(const item of kites3D.values())if(item?.position)positions.push(item.position);
  }
  if(!positions.length){
    return {lookAt:new THREE.Vector3(0,0,0),position:basePos.clone(),count:0};
  }
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for(const p of positions){
    minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);
    minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);
    minZ=Math.min(minZ,p.z);maxZ=Math.max(maxZ,p.z);
  }
  const cx=(minX+maxX)*.5,cy=(minY+maxY)*.5,cz=(minZ+maxZ)*.5;
  const wx=Number(wind?.x)||0,wy=-(Number(wind?.y)||0),wz=Number(wind?.z)||0;
  const wXZLen=Math.hypot(wx,wz)||1;
  const wLen=Math.hypot(wx,wy,wz)||1;
  const speed=Math.hypot(wx,wy,wz);
  const lead=clamp(32+speed*24,32,92);
  const lookAt=new THREE.Vector3(
    cx+(wx/wLen)*lead,
    cy+(wy/Math.max(0.25,Math.abs(wy)||wXZLen*.18))*lead*0.55,
    cz+(wz/wLen)*lead*.25
  );
  const vFov=THREE.MathUtils.degToRad(camera?.fov||50);
  const aspect=Math.max(.25,Number(camera?.aspect)||1);
  const tanHalf=Math.max(.1,Math.tan(vFov*.5));
  const halfW=(maxX-minX)*.5+70;
  const halfH=(maxY-minY)*.5+95;
  const needY=halfH/tanHalf;
  const needX=halfW/(tanHalf*aspect);
  const depthSpan=(maxZ-minZ)*.5;
  const requiredDistance=Math.max(360,needX,needY)+depthSpan+80;
  const targetZ=Math.max(Number(basePos?.z)||720,lookAt.z+requiredDistance);
  const position=new THREE.Vector3(lookAt.x,lookAt.y,targetZ);
  return {lookAt,position,count:positions.length,bounds:{minX,maxX,minY,maxY,minZ,maxZ}};
}

export class BroadcastDirector{
  constructor(camera,basePosition=new THREE.Vector3(0,0,720)){
    this.camera=camera;
    this.basePos=basePosition.clone();
    this.targetPos=basePosition.clone();
    this.currentLookAt=new THREE.Vector3(0,0,0);
    this.targetLookAt=new THREE.Vector3(0,0,0);
    this.eventFocusPos=new THREE.Vector3(0,0,0);
    this.eventTimer=0;
    this.lastEventType=null;
    this.currentMode='wind-follow';
    this.enabled=true;
  }
  triggerCutFocus(x,y,z){
    if(!this.enabled)return;
    this.eventFocusPos.set(Number(x)||0,Number(y)||0,Number(z)||0);
    this.eventTimer=1.5;
    this.lastEventType='cut';
  }

  triggerAparoFocus(x,y,z){
    if(!this.enabled)return;
    this.eventFocusPos.set(Number(x)||0,Number(y)||0,Number(z)||0);
    this.eventTimer=1.2;
    this.lastEventType='aparo';
  }

  update(dt=.016,kitesMap=null,kites3D=null,wind=null){
    if(!this.camera||!this.enabled)return;
    const safeDt=clamp(dt,.001,.05);
    if(this.eventTimer>0)this.eventTimer=Math.max(0,this.eventTimer-safeDt);
    const frame=computeWindFollowFrame(this.camera,this.basePos,kites3D,wind||{});
    this.targetLookAt.copy(frame.lookAt);
    this.targetPos.copy(frame.position);
    this.currentMode='wind-follow';
    const posRate=frame.count>20?1.35:1.1;
    const lookRate=frame.count>20?1.55:1.25;
    this.camera.position.lerp(this.targetPos,Math.min(1,safeDt*posRate));
    this.currentLookAt.lerp(this.targetLookAt,Math.min(1,safeDt*lookRate));
    this.camera.lookAt(this.currentLookAt);
  }
  resize(width,height){
    if(!this.camera)return;
    const aspect=Math.max(.2,Number(width)/Math.max(1,Number(height)));
    this.camera.aspect=aspect;
    this.basePos.z=aspect<1?720/Math.max(.55,aspect*1.35):720;
    this.camera.updateProjectionMatrix();
  }
}
