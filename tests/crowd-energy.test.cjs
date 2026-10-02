const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const mod=path.resolve(__dirname,'../frontend/src/engine/physics/CrowdEnergy.js');
const load=()=>import(pathToFileURL(mod).href+`?t=${Date.now()}-${Math.random()}`);

test('CrowdEnergy satura em 1 e decai suavemente',async()=>{
  const {CrowdEnergy}=await load();
  const c=new CrowdEnergy();
  for(let i=0;i<500;i++)c.accept({userId:`u${i}`,text:`bora ${i} 🔥`},1000+i*10);
  assert.ok(c.value<=1&&c.value>.8);
  const before=c.value;
  for(let i=0;i<120;i++)c.step(1/60);
  assert.ok(c.value<before&&c.value>=0);
});

test('spam repetido do mesmo usuário é coalescido e storage permanece limitado',async()=>{
  const {CrowdEnergy}=await load();
  const c=new CrowdEnergy({maxRecent:64});
  const first=c.accept({userId:'spam',text:'vai vai vai'},1000);
  let last=first;
  for(let i=1;i<100;i++)last=c.accept({userId:'spam',text:'vai vai vai'},1000+i*5);
  assert.ok(last-first<.2,'spam não pode escalar energia linearmente');
  for(let i=0;i<200;i++)c.accept({userId:`u${i}`,text:'comentário diferente'},5000+i);
  assert.ok(c.recentSize<=64);
  assert.ok(c.value<=1);
});
