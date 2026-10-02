const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const modUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/ui/three/ThreeCharacters.js')).href;

test('carretilha só gira quando comprimento liberado muda',async()=>{
  globalThis.THREE=await import('three');
  const {syncCarretilhaFromRope}=await import(modUrl+`?t=${Date.now()}`);
  const reel=new THREE.Group();
  const rope={spoolLength:1000,totalLineLength:1800,get releasedLength(){return this.spoolLength;}};
  const kite={rope};
  const first=syncCarretilhaFromRope(reel,kite);
  const r0=reel.rotation.x;
  const idle=syncCarretilhaFromRope(reel,kite);
  assert.equal(reel.rotation.x,r0,'carretilha girou sem linha entrar/sair');
  kite.rope.spoolLength=900;
  const pull=syncCarretilhaFromRope(reel,kite);
  assert.ok(pull.deltaLength<0&&reel.rotation.x>r0,'recolher linha deve girar em sentido de puxada');
  const r1=reel.rotation.x;
  kite.rope.spoolLength=1050;
  const release=syncCarretilhaFromRope(reel,kite);
  assert.ok(release.deltaLength>0&&reel.rotation.x<r1,'soltar linha deve inverter o giro');
  assert.equal(first.deltaLength,0);assert.equal(idle.deltaLength,0);
  delete globalThis.THREE;
});
