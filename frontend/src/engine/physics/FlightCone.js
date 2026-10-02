// Convex flight volume rooted at each hand, opening toward the horizon.
// Forces turn the kite inward before the edge; the velocity guard only prevents
// a large impulse from skipping that band in one integration step. No teleport.
export function flightConePlanes(kite){
  const w=Math.max(320,Number(kite.screenWidth)||1080);
  const h=Math.max(480,Number(kite.screenHeight)||1920);
  const bx=Number(kite.baseX)||w*.5,by=Number(kite.baseY)||h*.9,bz=Number(kite.baseZ)||0;
  const reach=Math.max(80,Number(kite.rope?.releasedLength)||Math.hypot(kite.x-bx,kite.y-by,(kite.z||0)-bz));
  const cached=kite._flightCone;
  if(cached&&cached.w===w&&cached.h===h&&cached.bx===bx&&cached.by===by&&cached.bz===bz&&cached.reach===reach)return cached.planes;
  const top=Math.min(by-30,Math.max(h*.16,by-reach*.94));
  const bottom=by-Math.min(h*.22,reach*.35);
  const rise=Math.max(30,by-h*.16);
  const leftSlope=(w*.12-bx)/rise,rightSlope=(w*.88-bx)/rise;
  const planes=[
    [0,-1,0,-top], [0,1,0,bottom],
    [-1,-leftSlope,0,-bx-leftSlope*by],
    [1,rightSlope,0,bx+rightSlope*by],
    [0,0,-1,-bz], [0,.65,1,bz+.65*by],
    [-1,0,0,-w*.09], [1,0,0,w*.91]
  ];
  const normalized=planes.map(([x,y,z,d])=>{const n=Math.hypot(x,y,z);return {x:x/n,y:y/n,z:z/n,d:d/n,margin:Math.min(w*.06,h*.055,reach*.12)};});
  kite._flightCone={w,h,bx,by,bz,reach,planes:normalized};
  return normalized;
}

export function steerInsideFlightCone(kite,force,planes){
  for(const p of planes){
    const distance=p.d-p.x*kite.x-p.y*kite.y-p.z*kite.z;
    if(distance>=p.margin)continue;
    const weight=Math.min(1,Math.max(0,1-distance/p.margin));
    const outwardForce=Math.max(0,force.x*p.x+force.y*p.y+force.z*p.z);
    const outwardSpeed=Math.max(0,kite.vx*p.x+kite.vy*p.y+kite.vz*p.z);
    const recovery=(outwardForce+30+(p.margin-distance)*1.4+outwardSpeed*5)*weight*weight;
    force.x-=p.x*recovery;force.y-=p.y*recovery;force.z-=p.z*recovery;
  }
  return force;
}

export function limitFlightConeVelocity(kite,planes,dt){
  for(let iteration=0;iteration<4;iteration++)for(const p of planes){
    const distance=p.d-p.x*kite.x-p.y*kite.y-p.z*kite.z;
    const allowed=Math.max(0,distance)/(dt*60);
    const excess=kite.vx*p.x+kite.vy*p.y+kite.vz*p.z-allowed;
    if(excess>0){kite.vx-=p.x*excess;kite.vy-=p.y*excess;kite.vz-=p.z*excess;}
  }
}
