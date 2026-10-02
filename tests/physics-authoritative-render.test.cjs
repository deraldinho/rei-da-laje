const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const kitePath=path.join(root,'frontend/src/entities/Kite.js');
const scenePath=path.join(root,'frontend/src/ui/ThreeSkyScene.js');
const threeKitesPath=path.join(root,'frontend/src/ui/three/ThreeKites.js');

test('decolagem usa KiteDynamics desde o primeiro frame e não interpola até target',()=>{
  const source=fs.readFileSync(kitePath,'utf8');
  const update=source.slice(source.indexOf('  update(delta,'),source.indexOf('  /**\n   * Sincroniza o render',source.indexOf('  update(delta,')));
  assert.doesNotMatch(update,/this\.y\s*\+=\s*\(this\.targetY/);
  assert.doesNotMatch(update,/this\.x\s*\+=\s*\(this\.targetX/);
  assert.match(update,/KiteDynamics\.step\(this,/);
});

test('renderer 3D copia posição física sem trajetória visual paralela',()=>{
  const source=fs.readFileSync(scenePath,'utf8');
  const start=source.indexOf('const depthOffset = Number.isFinite(kite.z)');
  const end=source.indexOf('// Barra de HP',start);
  const block=source.slice(start,end);
  assert.doesNotMatch(block,/takeoffProg|currentWorldPos\.lerp|MathUtils\.lerp\(/);
  assert.match(block,/k3d\.position\.copy\(k3d\.userData\.targetWorldPos\)/);
});

test('renderer não inventa pitch roll yaw por nome de manobra',()=>{
  const source=fs.readFileSync(scenePath,'utf8');
  const start=source.indexOf('const physRot = Number.isFinite(kite.rotation)');
  const end=source.indexOf('// Barra de HP',start);
  const block=source.slice(start,end);
  assert.doesNotMatch(block,/kite\.maneuver|m\s*===\s*['"]retao|m\s*===\s*['"]despicar|targetPitch\s*[+-]=/);
});

test('helper ThreeKites também usa z físico e sem drift senoidal de posição',()=>{
  const source=fs.readFileSync(threeKitesPath,'utf8');
  const start=source.indexOf('  syncKite(uidStr');
  const end=source.indexOf('  /**\n   * Simula a rabiola',start);
  const block=source.slice(start,end);
  assert.doesNotMatch(block,/depthOffset\s*=\s*\(idx\s*%|windDriftX|windDriftY|windDriftZ|easeOut/);
  assert.match(block,/Number\.isFinite\(kite\.z\)/);
});

test('spawn layout inicializa uma única vez durante proteção',async()=>{
  const {pathToFileURL}=require('node:url');
  const mod=await import(pathToFileURL(path.join(root,'frontend/src/engine/SpawnLayout.js')).href+'?t='+Date.now());
  const kite={isAscending:true,spawnProtection:3,spawnLayoutEligible:true,baseX:100,baseY:1800,baseZ:0,z:120,
    line:{visualBaseX:110,visualBaseY:1750},rope:{resetPositions(){}},x:900,y:900,targetX:900,targetY:400,vx:12,vy:-4};
  assert.equal(mod.stabilizeSpawnKite(kite,0,40,1080,1920),true);
  const first={x:kite.x,y:kite.y}; kite.x+=17;kite.y+=9;
  assert.equal(mod.stabilizeSpawnKite(kite,1,40,1080,1920),false);
  assert.deepEqual({x:kite.x,y:kite.y},{x:first.x+17,y:first.y+9});
});

test('tamanho aparente vem da perspectiva e não de escala artificial por z',()=>{
  const source=fs.readFileSync(scenePath,'utf8');
  const start=source.indexOf('const depthOffset = Number.isFinite(kite.z)');
  const end=source.indexOf('// Barra de HP',start);
  const block=source.slice(start,end);
  assert.doesNotMatch(block,/k3d\.position\.z\s*\/\s*600|dynamicScale\s*=.*position\.z/);
  assert.match(block,/k3d\.scale\.set\(this\.customKiteScale, this\.customKiteScale, this\.customKiteScale\)/);
});