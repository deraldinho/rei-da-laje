const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const load=file=>import(pathToFileURL(path.resolve(__dirname,'../frontend/src/engine',file)).href);

async function simulate(renderFps){
  const [{PhysicsClock},{RopePhysics},{LineContactSystem}]=await Promise.all([
    load('physics/PhysicsClock.js'),load('physics/RopePhysics.js'),load('physics/LineContactSystem.js')]);
  const make=(id,hand,kite,velocity)=>{
    const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});
    rope.resetPositions(hand,kite); rope.tension=.82;
    for(const n of rope.nodes){n.vx=velocity.x;n.vy=velocity.y;}
    return {userId:id,x:kite.x,y:kite.y,baseX:hand.x,baseY:hand.y,lineType:'algodao',lineTension:.82,
      lineHP:100,maxLineHP:100,shieldCount:0,spawnProtection:0,isAscending:false,rope};
  };
  const a=make('A',{x:100,y:700,z:0},{x:700,y:100,z:0},{x:90,y:-90});
  const b=make('B',{x:700,y:700,z:0},{x:100,y:100,z:0},{x:-90,y:-90});
  const system=new LineContactSystem(); const clock=new PhysicsClock(1/60,4);
  let fixedTick=0,cutTick=null;
  for(let frame=0;frame<renderFps*14 && cutTick===null;frame++){
    clock.update(1/renderFps,(dt)=>{
      if(cutTick!==null) return;
      const result=system.step([a,b],dt,fixedTick*(1000/60),{allowWear:true});
      fixedTick++;
      if(result.cuts.length) cutTick=fixedTick;
    });
  }
  const wearA=Math.max(...a.rope.segmentWear), wearB=Math.max(...b.rope.segmentWear);
  return {renderFps,fixedTick,cutTick,wearA,wearB,tracked:system.manager.contacts.size};
}

test('abrasão e tick de corte são equivalentes em render 30/60/120 FPS',async()=>{
  const results=[];
  for(const fps of [30,60,120]) results.push(await simulate(fps));
  assert.ok(results.every(r=>r.cutTick!==null),JSON.stringify(results));
  const base=results[0];
  for(const r of results.slice(1)){
    assert.ok(Math.abs(r.cutTick-base.cutTick)<=1,`cut tick divergiu: ${JSON.stringify(results)}`);
    const relA=Math.abs(r.wearA-base.wearA)/Math.max(1e-9,base.wearA);
    const relB=Math.abs(r.wearB-base.wearB)/Math.max(1e-9,base.wearB);
    assert.ok(relA<=.02 && relB<=.02,`wear divergiu: ${JSON.stringify(results)}`);
  }
});
