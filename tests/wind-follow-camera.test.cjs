const test=require('node:test');
const assert=require('node:assert/strict');

test('câmera enquadra o grupo e antecipa na direção do vento',async()=>{
  const THREE=await import('three');
  const {BroadcastDirector}=await import('../frontend/src/ui/three/BroadcastDirector.js?wind='+Date.now());
  const camera=new THREE.PerspectiveCamera(50,1080/1920,1,3600);
  const base=new THREE.Vector3(0,10,830);camera.position.copy(base);
  const director=new BroadcastDirector(camera,base);
  const kites=new Map([['a',{}],['b',{}],['c',{}],['d',{}]]);
  const k3d=new Map([
    ['a',{position:new THREE.Vector3(-180,-80,250)}],['b',{position:new THREE.Vector3(180,120,220)}],
    ['c',{position:new THREE.Vector3(-120,80,-120)}],['d',{position:new THREE.Vector3(150,-60,-180)}]
  ]);
  director.update(1/60,kites,k3d,{x:1.2,y:-.25,z:.15,gust:1});
  assert.equal(director.currentMode,'wind-follow');
  assert.ok(director.targetLookAt.x>0,'vento para +X deve antecipar enquadramento para +X');
  assert.ok(director.targetLookAt.y>20,'vento para cima na tela deve antecipar +Y no mundo 3D');
  assert.ok(director.targetPos.z>=base.z,'câmera não deve fechar o quadro e perder pipas');
});

test('eventos não substituem enquadramento global das pipas',async()=>{
  const THREE=await import('three');
  const {BroadcastDirector}=await import('../frontend/src/ui/three/BroadcastDirector.js?events='+Date.now());
  const camera=new THREE.PerspectiveCamera(50,1080/1920,1,3600);const base=new THREE.Vector3(0,10,830);
  const director=new BroadcastDirector(camera,base);director.triggerCutFocus(900,700,100);
  const kites=new Map([['a',{}],['b',{}]]);const k3d=new Map([
    ['a',{position:new THREE.Vector3(-160,-40,100)}],['b',{position:new THREE.Vector3(160,40,80)}]
  ]);
  director.update(1/60,kites,k3d,{x:-1,y:0,z:0,gust:1});
  assert.equal(director.currentMode,'wind-follow');
  assert.ok(Math.abs(director.targetLookAt.x)<200,'corte distante não pode arrancar câmera do grupo');
});
