const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const load = file => import(pathToFileURL(path.join(__dirname, '../frontend/src/engine', file)).href);
test('ritmo de encontros em arenas verticais e horizontais',async()=>{
 const {Wind}=await load('Wind.js'),{Physics}=await load('Physics.js');
 const results=[];
 for(const [width,height] of [[390,844],[1080,1920],[1920,1080]]) for(const count of [2,6,20]) {
  let totalContact=0,totalCut=0;
  for(let seed=1;seed<=12;seed++){
   let rng=seed*7919;const random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/4294967296);
   const kites=Array.from({length:count},()=>({
    x:width*(.1+random()*.8),y:height*(.12+random()*.45),
    baseX:width*(.15+random()*.7),baseY:height+20,
    screenWidth:width,screenHeight:height,windPhase:random()*Math.PI*2,windInfluence:.8+random()*.6,
    likeBoostRemaining:0,lineHP:100,maxLineHP:100,shieldCount:0,lineType:'algodao',lastHit:0,
    calculateCombatPower(){return 1;},takeDamage(n){this.lineHP-=n;this.lastHit=time;return this.lineHP<=0;}
   }));
   let contact=60,cut=60,time=0;
   for(let frame=0;frame<1800&&cut===60;frame++){
    time=frame/30;
    kites.forEach(k=>{Wind.move(k,2,time,count);if(time-k.lastHit>2)k.lineHP=Math.min(100,k.lineHP+.6);});
    for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){
     const a=kites[i],b=kites[j];
     const radius=Wind.contactRadius?.(width,height)??120;
     if(Math.hypot(a.x-b.x,a.y-b.y)>radius)continue;
     const hit=Physics.checkLineIntersection(a.baseX,a.baseY,a.x,a.y,b.baseX,b.baseY,b.x,b.y);
     if(hit.hit){contact=Math.min(contact,time);if(!Physics.resolveRelinhoCombat(a,b,hit,2).tied)cut=time;}
    }
   }
   totalContact+=contact;totalCut+=cut;
  }
  results.push({width,height,count,contact:+(totalContact/12).toFixed(2),cut:+(totalCut/12).toFixed(2)});
 }
 console.log(JSON.stringify(results));
 assert.ok(results.every(r=>r.contact<14),'Encontros médios devem ocorrer em menos de 14s após subida');
 assert.ok(results.filter(r=>r.count===2).every(r=>r.cut<40),'Cortes médios em duelos devem ocorrer em menos de 40s');
});
