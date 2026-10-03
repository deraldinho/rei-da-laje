// Shared game calibration: one wind-vector unit at gust=1 is 35 km/h.
// +Z is forward from the characters into the flight volume; screen +Y is down.
export const MIN_WIND_KMH=30;
export const WIND_KMH_PER_UNIT=35;
const finite=v=>Number.isFinite(Number(v))?Number(v):0;

export function windSpeedKmh(wind={}){
  return Math.hypot(finite(wind.x),finite(wind.y),finite(wind.z))*WIND_KMH_PER_UNIT*Math.max(.1,finite(wind.gust)||1);
}

export function enforceForwardWind(wind={}){
  const gust=Math.max(.55,Math.min(1.45,finite(wind.gust)||1));
  const z=Math.max(.1,finite(wind.z));
  const x=Math.max(-z*.65,Math.min(z*.65,finite(wind.x)));
  const y=Math.max(-z*.22,Math.min(z*.22,finite(wind.y)));
  const speed=Math.hypot(x,y,z)*WIND_KMH_PER_UNIT*gust;
  const scale=Math.max(MIN_WIND_KMH,Math.min(85,speed))/speed;
  return {...wind,x:x*scale,y:y*scale,z:z*scale,gust,flightCone:true};
}
