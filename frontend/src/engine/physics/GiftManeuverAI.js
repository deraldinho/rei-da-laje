const clamp=(v,a,b)=>Math.max(a,Math.min(b,Number(v)||0));
const TURNS=Object.freeze([-1,-.55,0,.55,1]);

function profileFor(name){
  const n=String(name||'retao').toLowerCase();
  if(n==='perseguir')return 'dense_flow';
  if(n==='mergulho'||n==='mergulho_parafuso')return 'descending';
  if(n==='lacada')return 'arc';
  if(n.startsWith('aparar'))return 'intercept';
  if(n==='retao')return 'cross_density';
  return 'physical';
}
function verticalBias(profile){
  if(profile==='descending')return .32;
  if(profile==='arc')return .10;
  return 0;
}
function safeScore(field,origin,dir,reach){
  try{return Math.max(0,Number(field?.scoreCorridor?.(origin,dir,reach))||0);}catch{return 0;}
}
export function planGiftManeuver(kite,maneuver={},wind={},densityField=null){
  const profile=profileFor(maneuver.name),origin={x:Number(kite?.x)||0,y:Number(kite?.y)||0,z:Number(kite?.z)||0};
  const baseHeading=Number(kite?.attitude?.heading??kite?.heading)||0;
  const reach=clamp(maneuver.reach??240,80,420),vertical=verticalBias(profile);
  const wx=Number(wind?.x)||0,wz=Number(wind?.z)||0,windMag=Math.hypot(wx,wz)||1;
  let best=null;
  for(const steerDir of TURNS){
    const heading=baseHeading+steerDir*.92;
    let dx=Math.sin(heading),dy=vertical,dz=Math.cos(heading);
    const mag=Math.hypot(dx,dy,dz)||1;dx/=mag;dy/=mag;dz/=mag;
    const corridor=safeScore(densityField,origin,{x:dx,y:dy,z:dz},reach);
    const windDot=(dx*wx+dz*wz)/windMag;
    const score=corridor+Math.max(-.35,windDot)*.55;
    if(!best||score>best.score)best={steerDir,heading,corridor,score};
  }
  const chosen=best||{steerDir:Math.sign(wx)||0,heading:baseHeading,corridor:0,score:0};
  const speed=clamp(maneuver.speed??1.2,.5,2);
  return {steerDir:clamp(chosen.steerDir,-1,1),intensity:clamp(speed*1.08+Math.min(.22,chosen.corridor*.015),.6,2),
    duration:clamp(maneuver.remaining??maneuver.duration??1.2,.4,2.4),profile,
    heading:Number(chosen.heading)||0,corridorScore:Number(chosen.corridor)||0};
}
