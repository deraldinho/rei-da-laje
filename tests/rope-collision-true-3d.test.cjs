const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src/engine/physics');
const load=file=>import(pathToFileURL(path.join(root,file)).href+`?t=${Date.now()}-${Math.random()}`);

test('contato exige distância mínima euclidiana 3D, não apenas XY + gate de Z',async()=>{
  const [{RopePhysics},{RopeCollision}]=await Promise.all([load('RopePhysics.js'),load('RopeCollision.js')]);
  const a=new RopePhysics({nodeCount:12,lineType:'algodao'}),b=new RopePhysics({nodeCount:12,lineType:'algodao'});
  a.resetPositions({x:100,y:900,z:100},{x:800,y:300,z:100});
  b.resetPositions({x:800,y:900,z:120},{x:100,y:300,z:120});
  const falseTouch=RopeCollision.checkRopeCollision(a,b,4.5,{maxZDistance:85,minSinAngle:.15});
  assert.equal(falseTouch.hit,false,'X/Y cruzam, mas distância 3D ~20 excede raio de contato');
  assert.ok(falseTouch.minDistance>9,`distância 3D=${falseTouch.minDistance}`);

  b.resetPositions({x:800,y:900,z:107},{x:100,y:300,z:107});
  const trueTouch=RopeCollision.checkRopeCollision(a,b,4.5,{maxZDistance:85,minSinAngle:.15});
  assert.equal(trueTouch.hit,true,'distância 3D ~7 está dentro do raio físico de contato');
  assert.ok(trueTouch.distance<=trueTouch.contactRadius,`d3=${trueTouch.distance} radius=${trueTouch.contactRadius}`);
});
