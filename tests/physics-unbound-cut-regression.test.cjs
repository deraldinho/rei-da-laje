const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const physicsUrl=pathToFileURL(path.resolve(__dirname,'..','frontend/src/engine/Physics.js')).href;
const ropeUrl=pathToFileURL(path.resolve(__dirname,'..','frontend/src/engine/physics/RopePhysics.js')).href;

test('resolveRelinhoCombat funciona quando passado como callback sem this usando ruptura estrutural',async()=>{
  const [{Physics},{RopePhysics}]=await Promise.all([import(`${physicsUrl}?t=${Date.now()}`),import(`${ropeUrl}?t=${Date.now()}`)]);
  const make=(id)=>{const rope=new RopePhysics({nodeCount:6,lineType:'algodao'}); rope.tension=1; return {userId:id,lineType:'algodao',rope,lineHP:100,maxLineHP:100,lineTension:1,shieldCount:0,
    x:id==='a'?300:700,y:300,baseX:id==='a'?250:750,baseY:1700,updateHPBar(){},triggerShieldAbsorb(){},takeDamage(){throw new Error('não usar HP legado');}};};
  const a=make('a'),b=make('b'); b.rope.segmentWear[3]=.999;
  const resolver=Physics.resolveRelinhoCombat;
  const intersection={x:500,y:800,kiteA:a,kiteB:b,segmentIndexA:2,segmentIndexB:3,s:.3,t:.7,sinAngle:1,slidingSpeed:40,slideA:40,slideB:-40,relativeVx:40,relativeVy:0};
  const contact={phase:'GRINDING',contactTime:.5,...intersection};
  const result=resolver(a,b,intersection,1,contact);
  assert.equal(result.tied,false); assert.equal(result.winner,a); assert.equal(result.loser,b);
});
