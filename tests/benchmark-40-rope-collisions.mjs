import { performance } from 'node:perf_hooks';
import { RopePhysics } from '../frontend/src/engine/physics/RopePhysics.js';
import { RopeCollision } from '../frontend/src/engine/physics/RopeCollision.js';

function makeRopes(count, crossing) {
  const ropes=[];
  for(let i=0;i<count;i++){
    const r=new RopePhysics({nodeCount:12,lineType:'chile'});
    if(crossing){
      const a=(i/count)*Math.PI*2;
      const x1=540+Math.cos(a)*500, y1=960+Math.sin(a)*850;
      const x2=540-Math.cos(a)*420, y2=960-Math.sin(a)*700;
      r.resetPositions({x:x1,y:y1,z:0},{x:x2,y:y2,z:0});
    } else {
      const col=i%8,row=Math.floor(i/8),x=80+col*130,y=250+row*280;
      r.resetPositions({x,y:y+180,z:0},{x:x+60,y:y,z:0});
    }
    ropes.push(r);
  }
  return ropes;
}
function scan(ropes,iters=1){let hits=0,checks=0;const t0=performance.now();for(let n=0;n<iters;n++)for(let i=0;i<ropes.length;i++)for(let j=i+1;j<ropes.length;j++){checks++;if(RopeCollision.checkRopeCollision(ropes[i],ropes[j],8)?.hit)hits++;}return {ms:performance.now()-t0,checks,hits};}
for(const crossing of [false,true]){
 const ropes=makeRopes(40,crossing); scan(ropes,2);
 const r=scan(ropes,120);
 console.log(JSON.stringify({scenario:crossing?'all-crossing-worst-case':'distributed',pairsPerStep:780,steps:120,totalMs:+r.ms.toFixed(2),msPerStep:+(r.ms/120).toFixed(3),pairChecksPerSec:Math.round(r.checks/(r.ms/1000)),hits:r.hits}));
}
