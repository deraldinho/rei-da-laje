const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src/engine/physics');const load=f=>import(pathToFileURL(path.join(root,f)).href+`?t=${Date.now()}-${Math.random()}`);

test('LiveInputBuffer aceita like share follow gift como pulsos físicos limitados',async()=>{
 const {LiveInputBuffer}=await load('LiveInputBuffer.js'); const kite={userId:'u',lineTension:.6,lineSlack:.1,x:1,y:2,z:3}; const b=new LiveInputBuffer(kite);
 for(const type of ['like','share','follow','gift']){const g=b.addInteraction(type,type==='like'?30:1,{wind:{x:1,y:.1,z:.2}});assert.ok(g,`${type} sem gesto`);assert.ok(Math.abs(g.spoolCommand)<=1);assert.ok(Math.abs(g.debicoTorque)<=1.2);assert.ok(g.duration<=2);}
 assert.ok(b.pendingCommands.length<=5);
});

test('rajada de likes é coalescida e não cria uma ação por tap',async()=>{
 const {LiveInputBuffer}=await load('LiveInputBuffer.js'); const b=new LiveInputBuffer({userId:'u',lineTension:.6,lineSlack:.1});
 for(let i=0;i<50;i++)b.addInteraction('like',1,{nowMs:1000+i});
 assert.ok(b.pendingCommands.length<=2,`fila de likes explodiu: ${b.pendingCommands.length}`);
});

test('App consome competition:interaction e like não dispara manobra especial grátis',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../frontend/src/engine/App.js'),'utf8');
 assert.match(src,/competition:interaction/);assert.match(src,/addInteraction/);
 const start=src.indexOf("this._socketSubscriptions.on('likes:burst'");const block=src.slice(start,start+900);
 assert.ok(start>=0);assert.doesNotMatch(block,/maneuverStats\('despicar'/);assert.doesNotMatch(block,/this\.kites\.forEach/);
});