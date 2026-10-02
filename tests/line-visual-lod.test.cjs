const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const load=rel=>import(pathToFileURL(path.resolve(__dirname,'..',rel)).href+`?t=${Date.now()}-${Math.random()}`);

test('qualidade baixa remove glow ocioso e restaura em combate',async()=>{
  globalThis.THREE=await import('three');
  const {ThreeLines}=await load('frontend/src/ui/three/ThreeLines.js');
  const lines=new ThreeLines();
  lines.setIdleLineOpacityScale(.22);
  const kite={userId:'lod',lineType:'algodao',x:100,y:200,z:0,baseX:0,baseY:1000,baseZ:0,
    lineSlack:.2,lineTension:.55,line:{visualBaseX:0,visualBaseY:1000},rope:{getNodes:()=>[{x:0,y:1000,z:0},{x:100,y:200,z:0}]}};
  const l3d=lines.syncLine('lod',kite,{x:0,y:-200,z:480},{x:100,y:160,z:120},{x:1,y:0,z:0},1,0);
  assert.equal(l3d.userData.glowLine.visible,false,'glow ocioso ainda consome draw call');
  kite.isInCombat=true;
  lines.syncLine('lod',kite,{x:0,y:-200,z:480},{x:100,y:160,z:120},{x:1,y:0,z:0},1,0);
  assert.equal(l3d.userData.glowLine.visible,true,'combate precisa restaurar o glow');
  lines.dispose?.();delete globalThis.THREE;
});
