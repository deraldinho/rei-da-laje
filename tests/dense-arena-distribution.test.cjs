const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const width=1080,height=1920;
const engineRoot=path.resolve(__dirname,'../frontend/src/engine');
const dynamicsPath=path.join(engineRoot,'physics/KiteDynamics.js');

async function load(){
  return Promise.all([
    import(pathToFileURL(dynamicsPath).href+`?t=${Date.now()}-dyn`),
    import(pathToFileURL(path.join(engineRoot,'physics/RopePhysics.js')).href+`?t=${Date.now()}-rope`),
    import(pathToFileURL(path.join(engineRoot,'Wind.js')).href+`?t=${Date.now()}-wind`)
  ]);
}

function makeKite(RopePhysics,i,total=40){
  const baseX=width*(.10+.80*i/Math.max(1,total-1));
  const phase=(i*.73)%(Math.PI*2);
  const y=height*(.20+(((i*17)%total)/Math.max(1,total-1))*.14);
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});
  const k={userId:`p${i}`,x:baseX,y,z:0,baseX,baseY:height*.92,baseZ:0,vx:0,vy:0,vz:0,mass:.85,
    rotation:0,screenWidth:width,screenHeight:height,windPhase:phase,lineTension:.75,lineSlack:0,
    likeBoostRemaining:0,spawnProtection:0,isAscending:false,rooftopPlayer:{layoutIndex:i,layoutTotal:total},rope};
  rope.resetPositions({x:baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z});
  return k;
}

test('KiteDynamics não usa mais alvos de corredor como força normal de voo',()=>{
  const source=fs.readFileSync(dynamicsPath,'utf8');
  const step=source.slice(source.indexOf('static step('));
  assert.doesNotMatch(step,/sparseCruiseTarget\s*\(/);
  assert.doesNotMatch(step,/denseCruiseTarget\s*\(/);
  assert.doesNotMatch(step,/naturalSwayF[xy]/);
});

test('40 pipas permanecem distribuídas por forças físicas sem grade rígida',async()=>{
  const [{KiteDynamics},{RopePhysics},{Wind}]=await load();
  const kites=Array.from({length:40},(_,i)=>makeKite(RopePhysics,i));
  const snapshots=[];
  for(let frame=0;frame<1800;frame++){
    KiteDynamics._stepFrame=frame;
    const wind=Wind.sample(frame/60);
    for(const k of kites){
      KiteDynamics.step(k,1/60,wind,40,kites);
      k.rope.step(1/60,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},wind,{});
    }
    if(frame===599||frame===1799) snapshots.push(kites.map(k=>({x:k.x,y:k.y,z:k.z})));
  }
  for(const points of snapshots){
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y); let close=0;
    for(let i=0;i<points.length;i++) for(let j=i+1;j<points.length;j++)
      if(Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y)<55) close++;
    assert.ok(Math.max(...xs)-Math.min(...xs)>width*.65,'arena horizontal colapsou');
    assert.ok(Math.max(...ys)-Math.min(...ys)>height*.03,'arena perdeu variação vertical');
    const zs=points.map(p=>p.z);
    assert.ok(Math.max(...zs)-Math.min(...zs)>35,'arena perdeu profundidade 3D');
    assert.ok(close<=40,`aglomerado visual excessivo: ${close} pares`);
  }
  const yBands=new Set(kites.map(k=>Math.round(k.y/24)));
  const zBands=new Set(kites.map(k=>Math.round(k.z/18)));
  assert.ok(yBands.size>=4,`variação vertical insuficiente: ${yBands.size} bandas`);
  assert.ok(zBands.size>=4,`profundidade insuficiente: ${zBands.size} bandas`);
});
