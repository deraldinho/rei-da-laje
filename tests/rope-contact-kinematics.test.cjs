const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const moduleUrl = pathToFileURL(path.resolve(__dirname, '../frontend/src/engine/physics/RopeCollision.js')).href;

function node(x,y,vx=0,vy=0){ return {x,y,z:0,vx,vy,vz:0}; }
function rope(nodes){
  return {
    nodes,
    material:{diameter:1},
    getAABB(){
      const xs=nodes.map(n=>n.x), ys=nodes.map(n=>n.y);
      return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
    }
  };
}

test('contato cruzado expõe tangentes, velocidades locais e slide projetado', async()=>{
  const { RopeCollision } = await import(`${moduleUrl}?t=${Date.now()}`);
  const a=rope([node(-10,0,2,0),node(10,0,2,0)]);
  const b=rope([node(0,-10,0,0),node(0,10,0,0)]);
  const hit=RopeCollision.checkRopeCollision(a,b,1,{minSinAngle:0.1});
  assert.equal(hit.hit,true);
  assert.ok(Math.abs(hit.tangentAx-1)<1e-9 && Math.abs(hit.tangentAy)<1e-9);
  assert.ok(Math.abs(hit.tangentBx)<1e-9 && Math.abs(hit.tangentBy-1)<1e-9);
  assert.equal(hit.relativeVx,2); assert.equal(hit.relativeVy,0);
  assert.equal(hit.slideA,2); assert.equal(hit.slideB,0);
  assert.equal(hit.slidingSpeed,1);
});

test('pontos locais movendo juntos mantêm velocidade relativa e vSlide exatamente zero', async()=>{
  const { RopeCollision } = await import(`${moduleUrl}?t=${Date.now()}`);
  const a=rope([node(-10,0,3,-2),node(10,0,3,-2)]);
  const b=rope([node(0,-10,3,-2),node(0,10,3,-2)]);
  const hit=RopeCollision.checkRopeCollision(a,b,1,{minSinAngle:0.1});
  assert.equal(hit.hit,true);
  assert.equal(hit.relativeVx,0); assert.equal(hit.relativeVy,0);
  assert.equal(hit.relativeSpeed,0);
  assert.equal(hit.slideA,0); assert.equal(hit.slideB,0);
  assert.equal(hit.slidingSpeed,0);
});

test('caller pode reutilizar o mesmo objeto out em chamadas sucessivas', async()=>{
  const { RopeCollision } = await import(`${moduleUrl}?t=${Date.now()}`);
  const a=rope([node(-10,0,1,0),node(10,0,1,0)]);
  const b=rope([node(0,-10,0,0),node(0,10,0,0)]);
  const out={ c1:{}, c2:{} };
  const first=RopeCollision.checkRopeCollision(a,b,1,{minSinAngle:0.1},out);
  const firstC1=first.c1;
  const second=RopeCollision.checkRopeCollision(a,b,1,{minSinAngle:0.1},out);
  assert.strictEqual(first,out);
  assert.strictEqual(second,out);
  assert.strictEqual(second.c1,firstC1);
  assert.equal(second.hit,true);
});

test('caller reutiliza o mesmo out também em early-out sem contato', async()=>{
  const { RopeCollision } = await import(`${moduleUrl}?t=${Date.now()}`);
  const a=rope([node(-100,0),node(-80,0)]);
  const b=rope([node(80,0),node(100,0)]);
  const out={c1:{},c2:{}};
  const result=RopeCollision.checkRopeCollision(a,b,1,{},out);
  assert.strictEqual(result,out);
  assert.equal(result.hit,false);
});
