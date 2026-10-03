const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const moduleUrl=pathToFileURL(path.join(root,'frontend/src/engine/physics/PhysicsScale.js')).href;

test('escala física acompanha automaticamente qualquer viewport e preserva proporção',async()=>{
 const {physicsWorldScale}=await import(`${moduleUrl}?t=${Date.now()}`);
 assert.equal(physicsWorldScale(1080,1920),1);
 const portrait=physicsWorldScale(1432,2428);
 assert.ok(portrait>1.27&&portrait<1.31,`scale=${portrait}`);
 assert.ok(Math.abs(physicsWorldScale(1920,1080)-1)<1e-9,'rotação não deve mudar a escala física');
 assert.ok(physicsWorldScale(720,1280)<1,'viewport menor precisa reduzir o mundo proporcionalmente');
});

test('Kite dimensiona carretel no nascimento e preserva fração liberada ao redimensionar',()=>{
 const source=fs.readFileSync(path.join(root,'frontend/src/entities/Kite.js'),'utf8');
 assert.match(source,/this\.physicsScale\s*=\s*physicsWorldScale\(screenWidth,\s*screenHeight\)/);
 assert.match(source,/totalLineLength:\s*1800\s*\*\s*this\.physicsScale/);
 assert.match(source,/minSpoolLength:\s*80\s*\*\s*this\.physicsScale/);
 assert.match(source,/releasedRatio/);
 assert.match(source,/physicsWorldScale\(width,\s*height\)/);
});

test('KiteDynamics escala a velocidade física do carretel com o viewport',()=>{
 const source=fs.readFileSync(path.join(root,'frontend/src/engine/physics/KiteDynamics.js'),'utf8');
 assert.match(source,/pullSpeed:\s*220\s*\*\s*worldScale/);
 assert.match(source,/releaseSpeed:\s*280\s*\*\s*worldScale/);
});

test('contato e abrasão usam a mesma escala física do viewport',()=>{
 const contact=fs.readFileSync(path.join(root,'frontend/src/engine/physics/LineContactSystem.js'),'utf8');
 const physics=fs.readFileSync(path.join(root,'frontend/src/engine/physics/LineContactPhysics.js'),'utf8');
 assert.match(contact,/contactScaleForPair/);
 assert.match(contact,/8\s*\*\s*contactScaleForPair/);
 assert.match(contact,/16\s*\*\s*this\._broadContactScale/);
 assert.match(physics,/contactScaleForPair/);
 assert.match(physics,/vSlideRaw\s*\/\s*worldScale/);
 assert.match(physics,/slideARaw\s*\/\s*worldScale/);
 assert.match(physics,/slideBRaw\s*\/\s*worldScale/);
});

test('forças de voo e da corda também escalam com o mundo físico',()=>{
 const dynamics=fs.readFileSync(path.join(root,'frontend/src/engine/physics/KiteDynamics.js'),'utf8');
 const rope=fs.readFileSync(path.join(root,'frontend/src/engine/physics/RopePhysics.js'),'utf8');
 assert.match(dynamics,/effectiveTension\*38\*worldScale/);
 assert.match(dynamics,/aero\.fx\*1\.05\*worldScale/);
 assert.match(dynamics,/gravity=30\*kite\.mass\*worldScale/);
 assert.match(dynamics,/if\(mag>14\*worldScale\)/);
 assert.match(rope,/this\.worldScale\s*=\s*Math\.max/);
 assert.match(rope,/const grav = 140 \* this\.material\.linearDensity \* 100 \* this\.worldScale/);
 assert.match(rope,/wind\.x \* 28 \* gust \* this\.worldScale/);
});