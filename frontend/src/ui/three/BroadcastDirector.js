import * as THREE from 'three';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));

export function computeWindFollowFrame(camera,basePos,kitesMap,wind={}){
  const kites=[];
  if(kitesMap&&typeof kitesMap.values==='function'){
    for(const kite of kitesMap.values()){
      if(Number.isFinite(Number(kite?.x))&&Number.isFinite(Number(kite?.y)))kites.push(kite);
    }
  }
  if(!kites.length){
    return {lookAt:new THREE.Vector3(0,0,0),position:basePos.clone(),count:0};
  }
  const ref=kites[0];
  const width=Math.max(1,Number(ref.screenWidth)||1080);
  const height=Math.max(1,Number(ref.screenHeight)||1920);
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(const kite of kites){
    const x=Number(kite.x)||0,y=Number(kite.y)||0;
    minX=Math.min(minX,x);maxX=Math.max(maxX,x);
    minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  }
  const cx=(minX+maxX)*.5,cy=(minY+maxY)*.5;
  const vFov=THREE.MathUtils.degToRad(camera?.fov||50);
  const aspect=Math.max(.25,Number(camera?.aspect)||width/height);
  const baseDistance=Math.max(320,Number(basePos?.z)||720);
  const refHeight=2*Math.tan(vFov*.5)*baseDistance;
  const refWidth=refHeight*aspect;
  const nx=cx/width-.5,ny=-(cy/height-.5);

  const wx=Number(wind?.x)||0,wy=-(Number(wind?.y)||0);
  const wLen=Math.hypot(wx,wy)||1;
  const speed=Math.hypot(wx,wy);
  const leadScale=clamp(.035+speed*.012,.035,.075);
  const leadX=(wx/wLen)*refWidth*leadScale;
  const leadY=(wy/wLen)*refHeight*leadScale*.75;
  const lookAt=new THREE.Vector3(
    nx*refWidth+leadX,
    ny*refHeight+leadY,
    clamp((Number(wind?.z)||0)*28,-36,36)
  );

  // The rooftop stays at z=480. Bound wind tracking by its foreground span,
  // otherwise centering distant kites pitches the players below the viewport.
  const foregroundHeight=2*Math.tan(vFov*.5)*Math.max(10,baseDistance-480);
  const foregroundWidth=foregroundHeight*aspect;
  lookAt.x=clamp(lookAt.x,-foregroundWidth*.025,foregroundWidth*.025);
  lookAt.y=clamp(lookAt.y,(Number(basePos.y)||0)-foregroundHeight*.015,
    (Number(basePos.y)||0)+foregroundHeight*.015);
  lookAt.z=0;

  const spanX=(maxX-minX)/width;
  const spanY=(maxY-minY)/height;
  const fitScale=clamp(Math.max(1,spanX/.72,spanY/.68),1,1.035);
  const position=new THREE.Vector3(lookAt.x,Number(basePos?.y)||0,baseDistance*fitScale);
  return {lookAt,position,count:kites.length,bounds:{minX,maxX,minY,maxY}};
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
    const frame=computeWindFollowFrame(this.camera,this.basePos,kitesMap,wind||{});
    this.targetLookAt.copy(frame.lookAt);
    this.targetPos.copy(frame.position);
    this.currentMode='wind-follow';
    const posRate=frame.count>20?1.45:1.15;
    const lookRate=frame.count>20?1.65:1.3;
    this.camera.position.lerp(this.targetPos,Math.min(1,safeDt*posRate));
    this.currentLookAt.lerp(this.targetLookAt,Math.min(1,safeDt*lookRate));
    this.camera.lookAt(this.currentLookAt);
  }

  resize(width,height){
    if(!this.camera)return;
    const aspect=Math.max(.2,Number(width)/Math.max(1,Number(height)));
    this.camera.aspect=aspect;
    // ThreeSkyScene owns camera distance and uses it to lay out the rooftop.
    // A second aspect-based distance here would shrink that fixed foreground.
    this.camera.updateProjectionMatrix();
  }
}
