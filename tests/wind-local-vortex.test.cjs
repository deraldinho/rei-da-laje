const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'../frontend/src/engine');
const load=async rel=>import(pathToFileURL(path.join(root,rel)).href+'?t='+Date.now()+Math.random());

test('Tornado gera campo local 3D sem mutar coordenadas',async()=>{
  const {Wind}=await load('Wind.js');
  const source={userId:'a',x:500,y:400,z:120,specials:{tornado:5}};
  const kite={userId:'b',x:610,y:430,z:150,vx:0,vy:0,vz:0,specials:{tornado:0}};
  const before={x:kite.x,y:kite.y,z:kite.z,vx:kite.vx,vy:kite.vy,vz:kite.vz};
  const base={x:.6,y:-.05,z:.1,gust:1,turbulence:.1,current:'crosswind'};
  const local=Wind.withLocalVortices(base,kite,[source,kite]);
  assert.deepEqual({x:kite.x,y:kite.y,z:kite.z,vx:kite.vx,vy:kite.vy,vz:kite.vz},before);
  assert.ok(Number.isFinite(local.x)&&Number.isFinite(local.y)&&Number.isFinite(local.z));
  assert.notDeepEqual({x:local.x,y:local.y,z:local.z},{x:base.x,y:base.y,z:base.z});
});

test('runtime não usa atrator cinemático nem escreve posição em Wind',()=>{
  const wind=fs.readFileSync(path.join(root,'Wind.js'),'utf8');
  const app=fs.readFileSync(path.join(root,'App.js'),'utf8');
  assert.doesNotMatch(app,/Wind\.attract\s*\(/);
  assert.doesNotMatch(wind,/\bk\.x\s*\+=|\bk\.y\s*\+=|\bkite\.x\s*=|\bkite\.y\s*=/);
});

test('campo de vórtice é espacial, limitado e não seleciona alvo',async()=>{
  const {Wind}=await load('Wind.js');
  const owners=[{userId:'a',x:400,y:400,z:100,specials:{tornado:5}}];
  const near={userId:'n',x:470,y:430,z:120,specials:{tornado:0}};
  const far={userId:'f',x:1300,y:1200,z:500,specials:{tornado:0}};
  const base={x:.5,y:0,z:.1,gust:1,turbulence:.1};
  const a=Wind.withLocalVortices(base,near,[...owners,near]);
  const b=Wind.withLocalVortices(base,far,[...owners,far]);
  const nearDelta=Math.hypot(a.x-base.x,a.y-base.y,a.z-base.z);
  const farDelta=Math.hypot(b.x-base.x,b.y-base.y,b.z-base.z);
  assert.ok(nearDelta>farDelta);
  assert.ok(nearDelta<1.25,'vórtice precisa ser limitado');
});
