const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src/engine/physics');
const load=file=>import(pathToFileURL(path.join(root,file)).href+`?t=${Date.now()}-${Math.random()}`);

test('LiveInputBuffer reutiliza fila curta para gestos de qualquer comentário',async()=>{
  const [{LiveInputBuffer},{PlayerIntentController}]=await Promise.all([load('LiveInputBuffer.js'),load('PlayerIntentController.js')]);
  const kite={userId:'u',x:500,y:600,z:80,lineTension:.6,lineSlack:.1,attitude:{heading:0,pitch:0,roll:0}};
  const buffer=new LiveInputBuffer(kite),controller=new PlayerIntentController(kite);
  for(let i=0;i<12;i++)buffer.addComment(i%3===0?'1':`bora galera ${i} 🔥`,'u',{wind:{x:.7,y:0,z:.1},engagement:.6});
  assert.ok(buffer.pendingCommands.length>0&&buffer.pendingCommands.length<=5);
  assert.ok(buffer.pendingCommands.every(item=>item.gesture?.source==='comment'));
  buffer.step(1/60,controller,{wind:{x:.7,y:0,z:.1}});
  assert.equal(controller.currentAction,'comment_gesture');
});
