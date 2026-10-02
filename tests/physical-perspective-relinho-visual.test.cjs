const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src');
const load=f=>import(pathToFileURL(path.join(root,f)).href+`?t=${Date.now()}-${Math.random()}`);

test('distância física maior projeta pipa mais fundo no frustum',async()=>{
  const {projectKitePerspectiveDepth}=await load('ui/three/KitePerspective.js');
  const near={x:0,y:1200,z:40,baseX:0,baseY:1760,baseZ:0,rope:{totalLineLength:1800,_directDistance:560}};
  const far={...near,y:420,z:160,rope:{totalLineLength:1800,_directDistance:1350}};
  const cameraZ=830;
  const zn=projectKitePerspectiveDepth(near,cameraZ);
  const zf=projectKitePerspectiveDepth(far,cameraZ);
  assert.ok(zn>zf+180,`perspectiva não separou distância: near=${zn} far=${zf}`);
  assert.ok(cameraZ-zn<cameraZ-zf,'pipa perto deve ficar mais próxima da câmera');
});

test('taxa de abrasão identifica quem serra quem sem regra artificial',async()=>{
  const {classifyRelinhoDominance}=await load('engine/physics/RelinhoVisualState.js');
  const aVictim=classifyRelinhoDominance({abrasionRateA:.12,abrasionRateB:.02});
  assert.equal(aVictim.mode,'B_ATTACKS_A');
  const bVictim=classifyRelinhoDominance({abrasionRateA:.01,abrasionRateB:.11});
  assert.equal(bVictim.mode,'A_ATTACKS_B');
  const mutual=classifyRelinhoDominance({abrasionRateA:.08,abrasionRateB:.075});
  assert.equal(mutual.mode,'MUTUAL');
});
test('linha 3D renderiza a barriga Z dos nós XPBD',async()=>{
  globalThis.THREE=await import('three');
  const {ThreeLines}=await load('ui/three/ThreeLines.js');
  const lines=new ThreeLines();
  const ropeNodes=[
    {x:0,y:1000,z:0},{x:50,y:600,z:160},{x:100,y:200,z:0}
  ];
  const kite={userId:'zbow',lineType:'algodao',x:100,y:200,z:0,baseX:0,baseY:1000,baseZ:0,
    lineSlack:.2,lineTension:.55,line:{visualBaseX:0,visualBaseY:1000},rope:{getNodes:()=>ropeNodes}};
  const hand={x:0,y:-200,z:480},tip={x:100,y:160,z:120};
  const l3d=lines.syncLine('zbow',kite,hand,tip,{x:0,y:0,z:1},1,0);
  const p=Math.floor(l3d.userData.numPoints/2);
  const renderedZ=l3d.userData.positions[p*3+2];
  const t=p/(l3d.userData.numPoints-1);
  const straightZ=hand.z+(tip.z-hand.z)*t;
  assert.ok(Math.abs(renderedZ-straightZ)>8,`renderer ignorou barriga Z: rendered=${renderedZ} straight=${straightZ}`);
  lines.dispose?.();
  delete globalThis.THREE;
});

test('runtime conecta perspectiva física e papel visual do relinho',()=>{
  const fs=require('node:fs');
  const scene=fs.readFileSync(path.join(root,'ui/ThreeSkyScene.js'),'utf8');
  const app=fs.readFileSync(path.join(root,'engine/App.js'),'utf8');
  const lines=fs.readFileSync(path.join(root,'ui/three/ThreeLines.js'),'utf8');
  assert.match(scene,/projectKitePerspectiveDepth\(kite/);
  assert.match(app,/stampRelinhoVisualState\(contact/);
  assert.match(lines,/kite\.relinhoVisual/);
});
