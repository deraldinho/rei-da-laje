const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const load=file=>import(pathToFileURL(path.join(__dirname,'../frontend/src/engine',file)).href);

function makeKite(RopePhysics,id,index,count,w,h){
  const baseX=w*(.12+.76*(index/Math.max(1,count-1)));
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});
  const k={userId:id,x:baseX,y:h*.28,baseX,baseY:h*.92,baseZ:0,z:0,vx:0,vy:0,mass:.85,rotation:0,
    screenWidth:w,screenHeight:h,windPhase:index*.73,windInfluence:1,likeBoostRemaining:0,
    lineType:'algodao',lineHP:100,maxLineHP:100,shieldCount:0,lineSlack:0,lineTension:.75,
    spawnProtection:0,isAscending:false,rooftopPlayer:{layoutIndex:index},rope};
  rope.resetPositions({x:baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:0});
  return k;
}

test('base física permanece estável sem depender de trilhos de encontro',async()=>{
  const [{Wind},{KiteDynamics},{RopePhysics},{LineContactSystem}]=await Promise.all([
    load('Wind.js'),load('physics/KiteDynamics.js'),load('physics/RopePhysics.js'),load('physics/LineContactSystem.js')]);
  const results=[];
  for(const [w,h] of [[390,844],[1080,1920],[1920,1080]]) for(const count of [2,3,4,5,8]){
    KiteDynamics._globalTime=0; KiteDynamics._lastFrame=-1; KiteDynamics._stepFrame=0;
    const kites=Array.from({length:count},(_,i)=>makeKite(RopePhysics,`p${i}`,i,count,w,h));
    const system=new LineContactSystem();
    let contact=null,cut=null,maxTracked=0,maxSolved=0;
    for(let frame=0;frame<2400&&cut===null;frame++){
      KiteDynamics._stepFrame=frame;
      const wind=Wind.sample(frame/60);
      for(const k of kites){
        KiteDynamics.step(k,1/60,wind,count);
        k.rope.step(1/60,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:0},wind,{lineSlack:0,lineTension:.75});
      }
      const r=system.step(kites,1/60,frame*(1000/60),{allowWear:true});
      if(contact===null&&r.metrics.activeContacts>0) contact=frame/60;
      if(r.cuts.length) cut=frame/60;
      maxTracked=Math.max(maxTracked,r.metrics.trackedContacts||0);
      maxSolved=Math.max(maxSolved,r.metrics.solvedContacts||0);
    }
    results.push({w,h,count,contact,cut,maxTracked,maxSolved});
  }
  assert.ok(results.every(r=>r.maxTracked<=12&&r.maxSolved<=3),'limites de contato não podem regredir');
});

test('vento global mantém 15/20/40 pipas abertas e cria contato físico em até 15s sem alvo',async()=>{
  const [{Wind},{KiteDynamics},{RopePhysics},{LineContactSystem}]=await Promise.all([
    load('Wind.js'),load('physics/KiteDynamics.js'),load('physics/RopePhysics.js'),load('physics/LineContactSystem.js')]);
  const w=1080,h=1920;
  for(const count of [15,20,40]){
    KiteDynamics._globalTime=0;KiteDynamics._lastFrame=-1;KiteDynamics._stepFrame=0;
    const kites=Array.from({length:count},(_,i)=>{
      const k=makeKite(RopePhysics,`live${i}`,i,count,w,h);
      k.y=h*(.20+(((i*7)%count)/Math.max(1,count-1))*.14);k.z=60+(i%5)*24;
      k.rope.resetPositions({x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z});return k;
    });
    const system=new LineContactSystem();let firstContact=null;
    for(let frame=0;frame<900;frame++){
      KiteDynamics._stepFrame=frame;const wind=Wind.sample(frame/60);
      for(const k of kites){KiteDynamics.step(k,1/60,wind,count,kites);k.rope.step(1/60,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:k.z},k._localPhysicsWind||wind,{});}
      const r=system.step(kites,1/60,frame*1000/60,{allowWear:false});
      if(firstContact===null&&r.metrics.activeContacts>0)firstContact=frame/60;
    }
    const xs=kites.map(k=>k.x),ys=kites.map(k=>k.y),zs=kites.map(k=>k.z);let close3d=0;
    for(let i=0;i<count;i++)for(let j=i+1;j<count;j++)if(Math.hypot(kites[i].x-kites[j].x,kites[i].y-kites[j].y,kites[i].z-kites[j].z)<55)close3d++;
    assert.ok(Math.max(...xs)-Math.min(...xs)>w*.65,`${count}: span X`);
    assert.ok(Math.max(...ys)-Math.min(...ys)>h*.025,`${count}: variação Y`);
    assert.ok(Math.max(...zs)-Math.min(...zs)>35,`${count}: profundidade Z`);
    assert.ok(close3d<=count,`${count}: ${close3d} pares fisicamente próximos`);
    assert.ok(firstContact!==null&&firstContact<15,`${count}: sem contato em 15s (${firstContact})`);
  }
});
