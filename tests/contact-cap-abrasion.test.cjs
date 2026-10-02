const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const root=path.resolve(__dirname,'../frontend/src/engine/physics');
const load=name=>import(pathToFileURL(path.join(root,name)).href+`?t=${Date.now()}-${Math.random()}`);

function node(x,y,vx=0,vy=0){return {x,y,z:0,prevX:x,prevY:y,prevZ:0,vx,vy,vz:0,invMass:1,wear:0};}
function rope(nodes){return {nodes,tension:.9,material:{diameter:1,friction:.8,abrasiveness:1,abrasionResistance:1,cutResistance:1},
  getNaturalTension(){return this.tension;},
  getAABB(){const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};},
  applyAbrasionEnergy(){return {broke:false,delta:.001,wear:.001,integrity:.999};},
  getWeakestSegmentIntegrity(){return 1;}};}
function kite(id,r){return {userId:id,rope:r,lineType:'algodao',lineTension:.9,lineHP:100,maxLineHP:100,isAscending:false,spawnProtection:0,x:0,y:0,baseX:0,baseY:100};}
function twelvePairs(){
  const list=[];
  for(let i=0;i<12;i++){
    const x=i*180;
    list.push(kite(`h${i}`,rope([node(x-40,0,120,0),node(x+40,0,120,0)])));
    list.push(kite(`v${i}`,rope([node(x,-40,0,0),node(x,40,0,0)])));
  }
  return list;
}

test('12 contatos ativos acumulam abrasão barata sem aumentar solver pesado',async()=>{
  const {LineContactSystem}=await load('LineContactSystem.js');
  const system=new LineContactSystem({maxTrackedContacts:12,maxSolvedContacts:3,maxContactsPerRope:3,
    minSlideSpeed:0,minContactTime:0,engagementRampSec:.01,abrasionK:.2,contactDamageFloor:.004});
  const kites=twelvePairs();
  let result=null;
  for(let frame=0;frame<8;frame++) result=system.step(kites,1/60,frame*1000/60,{allowWear:true});
  assert.equal(result.metrics.activeContacts,12);
  assert.equal(result.metrics.solvedContacts,3);
  assert.equal(result.metrics.abrasionUpdates,12,'budget do solver não pode limitar desgaste físico');
});
test('13o contato não reinicia a rampa dos 12 contatos que já estão engatados',async()=>{
  const {LineContactManager}=await load('LineContactManager.js');
  const m=new LineContactManager({maxTrackedContacts:12,maxSolvedContacts:3,maxContactsPerRope:3,
    minContactTime:.08,engagementRampSec:.20});
  const hit={hit:true,x:0,y:0,z:0,segmentIndexA:0,segmentIndexB:0,s:.5,t:.5,distance:.2,contactRadius:4,
    sinAngle:1,relativeVx:4,relativeVy:0,slidingSpeed:4,slideA:4,slideB:4};
  const physics={vSlide:4,normalForce:1,tensionA:.8,tensionB:.8,effectiveTension:.8,sinAngle:1,crossingAngle:Math.PI/2,relativeVx:4,relativeVy:0};
  const kk=id=>({userId:id});
  for(let frame=0;frame<18;frame++){
    m.beginStep(frame*1000/60,1/60);
    for(let i=0;i<12;i++) m.touch(`a${i}|b${i}`,kk(`a${i}`),kk(`b${i}`),hit,physics);
    m.touch('newA|newB',kk('newA'),kk('newB'),hit,physics);
    m.endStep(); m.selectForSolve();
  }
  const times=[...m.contacts.values()].filter(c=>c.pairKey!=='newA|newB').map(c=>c.contactTime);
  assert.ok(times.length>=11);
  assert.ok(Math.min(...times)>.20,`rampa foi reiniciada sob saturação: ${Math.min(...times)}`);
});
test('12 relinhos simultâneos conseguem produzir corte sem elevar maxSolved acima de 3',async()=>{
  const [{LineContactSystem},{RopePhysics}]=await Promise.all([load('LineContactSystem.js'),load('RopePhysics.js')]);
  const list=[];
  for(let i=0;i<12;i++){
    const x=i*180;
    const a=new RopePhysics({nodeCount:6,lineType:'algodao'}),b=new RopePhysics({nodeCount:6,lineType:'algodao'});
    a.resetPositions({x:x-40,y:0,z:0},{x:x+40,y:0,z:0});
    b.resetPositions({x,y:-40,z:0},{x,y:40,z:0});
    a.tension=b.tension=1;a.segmentWear.fill(.99);b.segmentWear.fill(.99);
    for(const n of a.nodes){n.vx=120;n.vy=0;} for(const n of b.nodes){n.vx=0;n.vy=0;}
    list.push(kite(`ra${i}`,a),kite(`rb${i}`,b));
  }
  const system=new LineContactSystem({maxTrackedContacts:12,maxSolvedContacts:3,maxContactsPerRope:3,
    minSlideSpeed:0,minContactTime:0,engagementRampSec:.01,abrasionK:1,maxWearPerTick:.05});
  const result=system.step(list,1/60,0,{allowWear:true});
  assert.equal(result.metrics.activeContacts,12);
  assert.equal(result.metrics.solvedContacts,3);
  assert.equal(result.metrics.abrasionUpdates,12);
  assert.ok(result.cuts.length>=1,'saturação de 12 contatos não pode congelar ruptura');
});
