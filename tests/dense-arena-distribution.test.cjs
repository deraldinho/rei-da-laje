const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const dynamicsUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/KiteDynamics.js')).href;
const width=1080,height=1920;
const kite=(rank,total)=>({rooftopPlayer:{layoutIndex:rank,layoutTotal:total},targetX:width*(.1+.8*rank/Math.max(1,total-1)),targetY:height*.23,windPhase:rank*.73});

test('40 pipas recebem corredores densos em múltiplas faixas sem colapsar em um ponto',async()=>{
  const {denseCruiseTarget}=await import(`${dynamicsUrl}?t=${Date.now()}`);
  const points=Array.from({length:40},(_,rank)=>denseCruiseTarget(kite(rank,40),40,5,width,height));
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  assert.ok(Math.max(...xs)-Math.min(...xs)>width*.68,'arena deve ocupar a maior parte da largura');
  assert.ok(Math.max(...ys)-Math.min(...ys)>height*.10,'40 pipas precisam de múltiplas faixas verticais');
  const unique=new Set(points.map(p=>`${p.x.toFixed(2)}|${p.y.toFixed(2)}`));
  assert.equal(unique.size,40,'cada pipa deve ter corredor próprio');
});

test('corredores densos continuam dentro da zona segura do céu durante a oscilação',async()=>{
  const {denseCruiseTarget}=await import(`${dynamicsUrl}?t=${Date.now()}-bounds`);
  for(const time of [0,5,15,30]) for(let rank=0;rank<40;rank++){
    const p=denseCruiseTarget(kite(rank,40),40,time,width,height);
    assert.ok(p.x>=width*.1&&p.x<=width*.9); assert.ok(p.y>=height*.18&&p.y<=height*.38);
  }
});


test('40 pipas resistem ao vento por 10s sem voltar a formar o bolo visual',async()=>{
  const engineRoot=path.resolve(__dirname,'../frontend/src/engine');
  const [{KiteDynamics},{RopePhysics},{Wind}]=await Promise.all([
    import(pathToFileURL(path.join(engineRoot,'physics/KiteDynamics.js')).href+`?t=${Date.now()}-dyn`),
    import(pathToFileURL(path.join(engineRoot,'physics/RopePhysics.js')).href+`?t=${Date.now()}-rope`),
    import(pathToFileURL(path.join(engineRoot,'Wind.js')).href+`?t=${Date.now()}-wind`)]);
  const kites=Array.from({length:40},(_,i)=>{const baseX=width*(.10+.80*i/39),rope=new RopePhysics({nodeCount:12,lineType:'algodao'});const k={...kite(i,40),userId:`p${i}`,x:baseX,y:height*.23,baseX,baseY:height*.92,baseZ:0,z:0,vx:0,vy:0,mass:.85,rotation:0,screenWidth:width,screenHeight:height,lineTension:.75,lineSlack:0,likeBoostRemaining:0,rope};rope.resetPositions({x:baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:0});return k;});
  for(let frame=0;frame<600;frame++){KiteDynamics._stepFrame=frame;const wind=Wind.sample(frame/60);for(const k of kites){KiteDynamics.step(k,1/60,wind,40);k.rope.step(1/60,{x:k.baseX,y:k.baseY,z:0},{x:k.x,y:k.y,z:0},wind,{lineSlack:0,lineTension:.75});}}
  const xs=kites.map(k=>k.x),ys=kites.map(k=>k.y);let close=0;
  for(let i=0;i<40;i++)for(let j=i+1;j<40;j++)if(Math.hypot(kites[i].x-kites[j].x,kites[i].y-kites[j].y)<55)close++;
  assert.ok(Math.max(...xs)-Math.min(...xs)>width*.68,'vento não pode comprimir a arena horizontalmente');
  assert.ok(Math.max(...ys)-Math.min(...ys)>height*.12,'faixas verticais devem sobreviver ao vento');
  assert.ok(close<=12,`aglomerado visual voltou: ${close} pares muito próximos`);
});
