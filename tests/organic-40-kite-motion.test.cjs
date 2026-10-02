const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src/engine');
const load=f=>import(pathToFileURL(path.join(root,f)).href+`?organic=${Date.now()}-${Math.random()}`);
const width=1080,height=1920,count=40;

function inversionCount(kites){let n=0;for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)if((kites[i].baseX-kites[j].baseX)*(kites[i].x-kites[j].x)<0)n++;return n;}

function makeKite(RopePhysics,spawnTargetForRank,i){
  const baseX=width*(.10+.80*i/(count-1)),sp=spawnTargetForRank(i,count,width,height);
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});
  const kite={userId:`organic${i}`,x:sp.x,y:sp.y,z:0,baseX,baseY:height*.92,baseZ:0,vx:0,vy:0,vz:0,mass:.85,
    rotation:0,screenWidth:width,screenHeight:height,windPhase:(i*.73)%(Math.PI*2),lineTension:.75,lineSlack:0,
    likeBoostRemaining:0,spawnProtection:0,isAscending:false,rooftopPlayer:{layoutIndex:i,layoutTotal:count},rope};
  rope.resetPositions({x:baseX,y:kite.baseY,z:0},{x:kite.x,y:kite.y,z:0});return kite;
}

test('spawn de 40 pipas não nasce como uma régua horizontal uniforme',async()=>{
  const {spawnTargetForRank}=await load('SpawnLayout.js');
  const points=Array.from({length:count},(_,i)=>spawnTargetForRank(i,count,width,height));
  const yBands=new Set(points.map(p=>Math.round(p.y/32)));
  const gaps=points.slice(1).map((p,i)=>p.x-points[i].x);
  const spread=Math.max(...gaps)-Math.min(...gaps);
  assert.ok(yBands.size>=5,`spawn ainda forma faixa horizontal: ${yBands.size} bandas`);
  assert.ok(spread>4,`espaçamento X ainda é mecânico/uniforme: spread=${spread}`);
});
test('40 pipas quebram ordenação e ocupam volume 3D sem virar um vetor',async()=>{
  const [{KiteDynamics},{RopePhysics},{Wind},{spawnTargetForRank}]=await Promise.all([
    load('physics/KiteDynamics.js'),load('physics/RopePhysics.js'),load('Wind.js'),load('SpawnLayout.js')]);
  KiteDynamics._globalTime=0;KiteDynamics._lastFrame=-1;KiteDynamics._stepFrame=0;
  const kites=Array.from({length:count},(_,i)=>makeKite(RopePhysics,spawnTargetForRank,i));
  let maxInversions=0,maxYSpan=0,maxZSpan=0;
  for(let frame=0;frame<1800;frame++){
    KiteDynamics._stepFrame=frame;const wind=Wind.sample(frame/60);
    for(const kite of kites){
      KiteDynamics.step(kite,1/60,wind,count,kites);
      kite.rope.step(1/60,{x:kite.baseX,y:kite.baseY,z:0},{x:kite.x,y:kite.y,z:kite.z},kite._localPhysicsWind||wind,{});
    }
    if(frame%30===0){
      const ys=kites.map(k=>k.y),zs=kites.map(k=>k.z);
      maxInversions=Math.max(maxInversions,inversionCount(kites));
      maxYSpan=Math.max(maxYSpan,Math.max(...ys)-Math.min(...ys));
      maxZSpan=Math.max(maxZSpan,Math.max(...zs)-Math.min(...zs));
    }
  }
  assert.ok(maxInversions>=45,`linhas preservam ordem demais: ${maxInversions} cruzamentos potenciais`);
  assert.ok(maxYSpan>=height*.09,`volume vertical insuficiente: ${maxYSpan}`);
  assert.ok(maxZSpan>=70,`profundidade 3D insuficiente: ${maxZSpan}`);
});