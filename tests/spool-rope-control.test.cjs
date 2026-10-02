const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const ropeUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/RopePhysics.js')).href;
const spoolPath=path.resolve(__dirname,'../frontend/src/engine/physics/SpoolController.js');
const hand={x:200,y:1000,z:0}, kite={x:200,y:200,z:0};

async function newRope(){
  const {RopePhysics}=await import(ropeUrl+`?t=${Date.now()}`);
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});
  rope.resetPositions(hand,kite);
  return rope;
}

test('comprimento liberado é autoridade e determina folga/tensão',async()=>{
  const rope=await newRope();
  assert.equal(typeof rope.adjustSpoolLength,'function');
  assert.equal(typeof rope.getSlackRatio,'function');
  assert.equal(typeof rope.getMechanicalState,'function');
  const initial=rope.spoolLength;
  rope.adjustSpoolLength(180);
  for(let i=0;i<30;i++) rope.step(1/60,hand,kite,{x:1,y:0},{lineSlack:0,lineTension:.9});
  const loose=rope.getMechanicalState(hand,kite);
  assert.ok(rope.spoolLength>initial+120,'step não pode recolher automaticamente linha liberada');
  assert.ok(loose.slackRatio>.12);
  const looseTension=loose.tension;
  rope.adjustSpoolLength(-220);
  for(let i=0;i<30;i++) rope.step(1/60,hand,kite,{x:1,y:0},{lineSlack:.9,lineTension:.1});
  const pulled=rope.getMechanicalState(hand,kite);
  assert.ok(pulled.spoolLength<loose.spoolLength);
  assert.ok(pulled.tension>looseTension);
});

test('SpoolController limita comandos extremos sem comprimento/tensão inválidos',async()=>{
  assert.ok(fs.existsSync(spoolPath),'SpoolController.js deve existir');
  const rope=await newRope();
  const {SpoolController}=await import(pathToFileURL(spoolPath).href+`?t=${Date.now()}`);
  const spool=new SpoolController(rope,{pullSpeed:240,releaseSpeed:300});
  for(let i=0;i<600;i++){
    spool.step(1/60,99);
    rope.step(1/60,hand,kite,{x:1,y:0},{});
  }
  const released=rope.spoolLength;
  assert.ok(released>800);
  for(let i=0;i<1200;i++){
    spool.step(1/60,-99);
    rope.step(1/60,hand,kite,{x:1,y:0},{});
  }
  const state=rope.getMechanicalState(hand,kite);
  assert.ok(Number.isFinite(state.spoolLength)&&state.spoolLength>=rope.minSpoolLength,'comprimento mínimo deve ser seguro');
  assert.ok(Math.abs(state.releasedLength+state.woundLength-state.totalLineLength)<1e-9,'carretel deve conservar o comprimento total');
  assert.ok(Number.isFinite(state.tension)&&state.tension>=.08&&state.tension<=1);
  assert.ok(rope.nodes.every(n=>[n.x,n.y,n.z,n.vx,n.vy,n.vz].every(Number.isFinite)));
});
