import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RopePhysics } from '../frontend/src/engine/physics/RopePhysics.js';
import { LineContactSystem } from '../frontend/src/engine/physics/LineContactSystem.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidenceDir=path.join(root,'tests','evidence');
await mkdir(evidenceDir,{recursive:true});
const counts=[2,10,20,40];
const DT=1/60;
const MB=1024*1024;

function makeKite(id,hand,kite,velocity,{durable=false}={}){
  const rope=new RopePhysics({nodeCount:12,lineType:'algodao'});
  rope.resetPositions({...hand,z:0},{...kite,z:0});
  rope.tension=.82;
  if(durable) rope.material={...rope.material,cutResistance:1e9};
  for(const n of rope.nodes){n.vx=velocity.x;n.vy=velocity.y;}
  return {userId:id,x:kite.x,y:kite.y,baseX:hand.x,baseY:hand.y,lineType:'algodao',lineTension:.82,
    lineHP:100,maxLineHP:100,shieldCount:0,spawnProtection:0,isAscending:false,rope};
}
function distributed(count){
  return Array.from({length:count},(_,i)=>{
    const x=100+i*260;
    return makeKite(`d${i}`,{x,y:800},{x:x+20,y:120},{x:45,y:-20},{durable:true});
  });
}

function dense(count,{durable=true}={}){
  const cx=600,cy=450,r=330;
  return Array.from({length:count},(_,i)=>{
    const angle=(i*Math.PI)/count;
    const ux=Math.cos(angle),uy=Math.sin(angle);
    const hand={x:cx-ux*r,y:cy-uy*r};
    const kite={x:cx+ux*r,y:cy+uy*r};
    const dir=i%2===0?1:-1;
    return makeKite(`x${i}`,hand,kite,{x:ux*95*dir,y:uy*95*dir},{durable});
  });
}

function percentile(values,p){
  const s=[...values].sort((a,b)=>a-b);
  return s[Math.min(s.length-1,Math.max(0,Math.ceil(s.length*p)-1))]||0;
}
function stats(values){
  const total=values.reduce((a,b)=>a+b,0);
  return {avgMs:total/Math.max(1,values.length),maxMs:Math.max(0,...values),p95Ms:percentile(values,.95),p99Ms:percentile(values,.99)};
}
function runScenario(count,mode){
  const kites=mode==='dense'?dense(count):distributed(count);
  const system=new LineContactSystem();
  const warmupTicks=120, measureTicks=480;
  for(let tick=0;tick<warmupTicks;tick++) system.step(kites,DT,tick*(1000/60),{allowWear:true});
  global.gc?.();
  const heapBefore=process.memoryUsage().heapUsed;
  const durations=[];
  let maxCandidates=0,maxCold=0,maxNarrow=0,maxTracked=0,maxSolved=0;
  let maxActive=0,abrasionUpdates=0,cuts=0,duplicateCuts=0;
  const cutPairs=new Set();
  for(let i=0;i<measureTicks;i++){
    const tick=warmupTicks+i;
    const t0=performance.now();
    const result=system.step(kites,DT,tick*(1000/60),{allowWear:true});
    durations.push(performance.now()-t0);
    const m=result.metrics;
    maxCandidates=Math.max(maxCandidates,m.candidatePairs||0);
    maxCold=Math.max(maxCold,m.coldNarrowChecks||0);
    maxNarrow=Math.max(maxNarrow,m.narrowChecks||0);
    maxTracked=Math.max(maxTracked,m.trackedContacts||0);
    maxSolved=Math.max(maxSolved,m.solvedContacts||0);
    maxActive=Math.max(maxActive,m.activeContacts||0);
    abrasionUpdates+=m.abrasionUpdates||0;
    cuts+=result.cuts.length;
    for(const cut of result.cuts){ if(cutPairs.has(cut.pairKey)) duplicateCuts++; else cutPairs.add(cut.pairKey); }
  }
  global.gc?.();
  const heapAfter=process.memoryUsage().heapUsed;
  const mm=system.manager.metrics();
  return {count,mode,ticks:measureTicks,timing:stats(durations),maxCandidates,maxColdNarrowChecks:maxCold,
    maxNarrowChecks:maxNarrow,maxTrackedContacts:maxTracked,maxActiveContacts:maxActive,maxSolvedContacts:maxSolved,
    abrasionUpdates,cuts,duplicateCuts,createdContacts:mm.createdContacts,reusedContacts:mm.reusedContacts,poolSize:mm.poolSize,
    heapDeltaBytes:heapAfter-heapBefore,heapDeltaMB:(heapAfter-heapBefore)/MB};
}
function runCutProbe(){
  const kites=dense(2,{durable:false});
  const system=new LineContactSystem();
  const pending=new Set();
  const seenPairs=new Set();
  let firstCutTick=null,duplicates=0,totalCuts=0,maxTracked=0,maxSolved=0;
  for(let tick=0;tick<1200;tick++){
    const result=system.step(kites,DT,tick*(1000/60),{allowWear:true,pendingCutIds:pending});
    maxTracked=Math.max(maxTracked,result.metrics.trackedContacts||0);
    maxSolved=Math.max(maxSolved,result.metrics.solvedContacts||0);
    for(const cut of result.cuts){
      totalCuts++;
      if(firstCutTick===null) firstCutTick=tick;
      if(seenPairs.has(cut.pairKey)) duplicates++; else seenPairs.add(cut.pairKey);
      if(cut.loser?.userId) pending.add(String(cut.loser.userId));
    }
    if(firstCutTick!==null && tick>firstCutTick+30) break;
  }
  return {firstCutTick,firstCutSec:firstCutTick===null?null:firstCutTick/60,totalCuts,duplicates,maxTracked,maxSolved};
}

const scenarios=[];
for(const count of counts){ scenarios.push(runScenario(count,'distributed')); scenarios.push(runScenario(count,'dense')); }
const cutProbe=runCutProbe();

for(const row of scenarios){
  assert.ok(row.maxTrackedContacts<=12,`${row.mode}/${row.count}: tracked=${row.maxTrackedContacts}`);
  assert.ok(row.maxSolvedContacts<=3,`${row.mode}/${row.count}: solved=${row.maxSolvedContacts}`);
  assert.ok(row.maxColdNarrowChecks<=96,`${row.mode}/${row.count}: cold=${row.maxColdNarrowChecks}`);
  assert.ok(row.createdContacts<=row.poolSize,`${row.mode}/${row.count}: pool allocation cresceu`);
  assert.equal(row.duplicateCuts,0,`${row.mode}/${row.count}: corte duplicado`);
  assert.ok(row.heapDeltaMB<=16,`${row.mode}/${row.count}: heap delta ${row.heapDeltaMB.toFixed(2)} MB`);
}
const dist40=scenarios.find(r=>r.count===40&&r.mode==='distributed');
const dense40=scenarios.find(r=>r.count===40&&r.mode==='dense');
assert.ok(dist40.timing.avgMs<=2.0,`40 distributed avg ${dist40.timing.avgMs.toFixed(3)}ms`);
assert.ok(dist40.timing.maxMs<=8.0,`40 distributed max ${dist40.timing.maxMs.toFixed(3)}ms`);
assert.ok(dense40.timing.avgMs<=4.0,`40 dense avg ${dense40.timing.avgMs.toFixed(3)}ms`);
assert.ok(dense40.maxColdNarrowChecks<=96);
assert.ok(cutProbe.firstCutTick!==null,'probe físico de 2 linhas precisa cortar');
assert.equal(cutProbe.duplicates,0,'mesmo par não pode cortar duas vezes enquanto claim está pendente');
assert.ok(cutProbe.maxTracked<=12&&cutProbe.maxSolved<=3);

const report={
  generatedAt:new Date().toISOString(),
  node:process.version,
  fixedDt:DT,
  scenarios,
  cutProbe,
  gates:{
    trackedContactsMax:12,solvedContactsMax:3,coldNarrowChecksMax:96,heapDeltaMBMax:16,
    distributed40AvgMsMax:2,distributed40MaxMsMax:8,dense40AvgMsMax:4
  }
};
await writeFile(path.join(evidenceDir,'relinho-abrasion-benchmark.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
