const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const sysUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/LineContactSystem.js')).href;
const ropeUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/RopePhysics.js')).href;

function node(x,y,vx=0,vy=0){return {x,y,z:0,prevX:x,prevY:y,prevZ:0,vx,vy,vz:0,invMass:1,wear:0};}
function mockRope(nodes){return {nodes,material:{diameter:1,friction:.65,abrasiveness:1,abrasionResistance:1,cutResistance:1},tension:.8,
  getNaturalTension(){return this.tension;},getAABB(){const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y);return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};}};}
function kite(id,rope){return {userId:id,rope,lineType:'algodao',lineTension:.8,maxLineHP:100,lineHP:100,isAscending:false,spawnProtection:0,x:0,y:0,baseX:0,baseY:100};}
function crossingPair(){return [kite('a',mockRope([node(-20,0,8,0),node(20,0,8,0)])),kite('b',mockRope([node(0,-20,0,0),node(0,20,0,0)]))];}

test('descoberta roda a 30 Hz e contato rastreado revalida em todo fixed step',async()=>{
  const {LineContactSystem}=await import(`${sysUrl}?t=${Date.now()}`);
  const system=new LineContactSystem({discoveryHz:30,maxDiscoveryChecksPerScan:96});
  const pair=crossingPair();
  const r1=system.step(pair,1/60,0,{allowWear:false});
  assert.equal(r1.metrics.discoveryRan,true); assert.ok(r1.metrics.coldNarrowChecks>=1); assert.equal(system.contacts.size,1);
  const r2=system.step(pair,1/60,1000/60,{allowWear:false});
  assert.equal(r2.metrics.discoveryRan,false); assert.ok(r2.metrics.revalidationChecks>=1); assert.equal(system.contacts.size,1);
  const r3=system.step(pair,1/60,2000/60,{allowWear:false});
  assert.equal(r3.metrics.discoveryRan,true);
});

test('stress denso mantém cold narrow <=96, tracked<=12 e solved<=3',async()=>{
  const {LineContactSystem}=await import(`${sysUrl}?t=${Date.now()}`);
  const system=new LineContactSystem({maxDiscoveryChecksPerScan:96,maxTrackedContacts:12,maxSolvedContacts:3});
  const list=[];
  for(let i=0;i<20;i++){const a=i*Math.PI/20; list.push(kite(`k${i}`,mockRope([node(-80*Math.cos(a),-80*Math.sin(a),5,0),node(80*Math.cos(a),80*Math.sin(a),5,0)])));}
  const result=system.step(list,1/60,0,{allowWear:false});
  assert.ok(result.metrics.coldNarrowChecks<=96); assert.ok(result.metrics.trackedContacts<=12); assert.ok(result.metrics.solvedContacts<=3);
});

test('multi-contato respeita cap por corda e coupling fica enfileirado sem mutar geometria',async()=>{
  const {LineContactSystem}=await import(`${sysUrl}?t=${Date.now()}`);
  const system=new LineContactSystem({maxSolvedContacts:3,maxContactsPerRope:1});
  const a=kite('a',mockRope([node(-30,0,10,0),node(30,0,10,0)]));
  const b=kite('b',mockRope([node(0,-30,0,0),node(0,30,0,0)]));
  const c=kite('c',mockRope([node(-20,-30,0,0),node(20,30,0,0)]));
  const before=a.rope.nodes.map(n=>[n.x,n.y]);
  const result=system.step([a,b,c],1/60,0,{allowWear:false});
  const ropeCounts=new Map();
  for(const contact of result.fxContacts){for(const id of [contact.lineAId,contact.lineBId]) ropeCounts.set(id,(ropeCounts.get(id)||0)+1);}
  assert.ok([...ropeCounts.values()].every(n=>n<=1));
  assert.ok(result.couplingJobs.length>=1);
  assert.deepEqual(a.rope.nodes.map(n=>[n.x,n.y]),before,'LineContactSystem não aplica coupling durante narrow phase');
});

test('allowWear=false detecta contatos sem desgaste/cortes; true permite ruptura',async()=>{
  const [{LineContactSystem},{RopePhysics}]=await Promise.all([import(`${sysUrl}?t=${Date.now()}`),import(ropeUrl)]);
  const mk=(id,horizontal)=>{const r=new RopePhysics({nodeCount:6,lineType:'algodao'}); r.resetPositions(horizontal?{x:-50,y:0,z:0}:{x:0,y:-50,z:0},horizontal?{x:50,y:0,z:0}:{x:0,y:50,z:0}); r.tension=1; for(const n of r.nodes){n.vx=horizontal?120:0;n.vy=0;} r.segmentWear.fill(.99); return kite(id,r);};
  const a=mk('a',true),b=mk('b',false);
  const cfg={abrasionK:1,minSlideSpeed:0,minContactTime:0,engagementRampSec:.01,maxWearPerTick:.05,maxSolvedContacts:3};
  const system=new LineContactSystem(cfg);
  const beforeA=[...a.rope.segmentWear],beforeB=[...b.rope.segmentWear];
  const dry=system.step([a,b],1/60,0,{allowWear:false});
  assert.ok(dry.fxContacts.length>0); assert.equal(dry.cuts.length,0); assert.deepEqual([...a.rope.segmentWear],beforeA); assert.deepEqual([...b.rope.segmentWear],beforeB);
  const wet=system.step([a,b],1/60,1000/60,{allowWear:true});
  assert.ok(wet.metrics.abrasionUpdates>0); assert.ok(wet.cuts.length>0||a.rope.getWeakestSegmentIntegrity()<.01||b.rope.getWeakestSegmentIntegrity()<.01);
});

test('reset limpa contatos sem trocar a Map pública usada pelo GameApp',async()=>{
  const {LineContactSystem}=await import(`${sysUrl}?t=${Date.now()}`);
  const system=new LineContactSystem(); const publicMap=system.contacts;
  system.step(crossingPair(),1/60,0,{allowWear:false});
  assert.equal(publicMap.size,1);
  system.reset();
  assert.strictEqual(system.contacts,publicMap);
  assert.equal(publicMap.size,0);
});
