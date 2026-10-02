const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const load=rel=>import(pathToFileURL(path.resolve(__dirname,'..',rel)).href+`?t=${Date.now()}-${Math.random()}`);

function mockKite(){
  const mesh=modelVisible=>({visible:true,userData:{modelVisible}});
  return {userData:{
    centerStick:{visible:true},crossStick:{visible:true},cabresto:{visible:true},
    fitilhos:[{mesh:mesh(true)},{mesh:mesh(true)},{mesh:mesh(false)}]
  }};
}

test('LOD 1 remove fitilhos mas preserva estrutura principal da pipa',async()=>{
  const {applyKiteVisualLod}=await load('frontend/src/ui/three/KiteVisualLod.js');
  const kite=mockKite();applyKiteVisualLod(kite,1,false);
  assert.equal(kite.userData.centerStick.visible,true);
  assert.equal(kite.userData.crossStick.visible,true);
  assert.equal(kite.userData.cabresto.visible,true);
  assert.deepEqual(kite.userData.fitilhos.map(x=>x.mesh.visible),[false,false,false]);
});

test('LOD 2 remove detalhes estruturais e destaque restaura modelo completo',async()=>{
  const {applyKiteVisualLod}=await load('frontend/src/ui/three/KiteVisualLod.js');
  const kite=mockKite();applyKiteVisualLod(kite,2,false);
  assert.equal(kite.userData.centerStick.visible,false);
  assert.equal(kite.userData.crossStick.visible,false);
  assert.equal(kite.userData.cabresto.visible,false);
  applyKiteVisualLod(kite,2,true);
  assert.equal(kite.userData.centerStick.visible,true);
  assert.deepEqual(kite.userData.fitilhos.map(x=>x.mesh.visible),[true,true,false]);
});
