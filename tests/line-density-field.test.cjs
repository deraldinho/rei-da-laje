const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const mod=path.resolve(__dirname,'../frontend/src/engine/physics/LineDensityField.js');
const load=()=>import(pathToFileURL(mod).href+`?t=${Date.now()}-${Math.random()}`);
function kite(id,nodes){return {userId:id,screenWidth:1000,screenHeight:1000,isAscending:false,spawnProtection:0,rope:{getNodes:()=>nodes}};}

test('célula com mais segmentos retorna densidade maior',async()=>{
  const {LineDensityField}=await load();const f=new LineDensityField({width:1000,height:1000,depth:300,cellsX:8,cellsY:8,cellsZ:4});
  f.update([kite('a',[{x:100,y:200,z:40},{x:500,y:200,z:40}]),kite('b',[{x:120,y:210,z:45},{x:520,y:210,z:45}])],1000);
  assert.ok(f.sample(300,205,42)>f.sample(800,800,250));
});

test('densidade respeita profundidade Z e corredor denso pontua mais',async()=>{
  const {LineDensityField}=await load();const f=new LineDensityField({width:1000,height:1000,depth:300,cellsX:10,cellsY:10,cellsZ:6});
  const dense=[kite('a',[{x:250,y:450,z:40},{x:750,y:450,z:40}]),kite('b',[{x:250,y:470,z:45},{x:750,y:470,z:45}])];
  f.update(dense,1000);
  assert.ok(f.sample(500,460,42)>f.sample(500,460,240));
  const hit=f.scoreCorridor({x:100,y:460,z:42},{x:1,y:0,z:0},800);
  const miss=f.scoreCorridor({x:100,y:760,z:240},{x:1,y:0,z:0},800);
  assert.ok(hit>miss,`hit=${hit} miss=${miss}`);
});

test('storage é fixo/reutilizado e campo vazio/stale é seguro',async()=>{
  const {LineDensityField}=await load();const f=new LineDensityField({cellsX:6,cellsY:5,cellsZ:3,updateIntervalMs:120});
  const storage=f.cells,capacity=storage.length;
  assert.equal(capacity,90);assert.equal(f.sample(10,10,10),0);
  assert.equal(f.update([],1000),true);
  assert.equal(f.cells,storage);assert.equal(f.cells.length,capacity);
  assert.equal(f.update([],1050),false,'cadência baixa deve reutilizar snapshot anterior');
  assert.equal(f.scoreCorridor({x:0,y:0,z:0},{x:1,y:0,z:0},500),0);
});
