const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src/engine/physics');
const load=file=>import(pathToFileURL(path.join(root,file)).href+`?t=${Date.now()}-${Math.random()}`);

const REQUIRED=['diameter','linearDensity','stiffness','damping','friction','abrasiveness','abrasionResistance','cutResistance','maxTension'];

test('todos os materiais virtuais têm propriedades mecânicas positivas e aliases seguros',async()=>{
  const {LINE_MATERIALS,getLineMaterial}=await load('LineMaterial.js');
  for(const [name,material] of Object.entries(LINE_MATERIALS)){
    for(const key of REQUIRED) assert.ok(Number.isFinite(material[key])&&material[key]>0,`${name}.${key}`);
  }
  for(const alias of ['algodão','linha 10','lâmpada','lampada','acrílico','pedra','cristal','chilena']){
    const material=getLineMaterial(alias);assert.ok(material&&material.type);for(const key of REQUIRED)assert.ok(material[key]>0);
  }
});

test('subtiers de cerol herdam geometria e crescem em atrito/abrasividade/força',async()=>{
  const {getLineMaterial}=await load('LineMaterial.js'); const base=getLineMaterial('cerol');
  const tiers=['lampada','acrilico','pedra','cristal','chilena'].map(getLineMaterial);
  for(const m of tiers.slice(0,4)){
    assert.equal(m.diameter,base.diameter);assert.equal(m.linearDensity,base.linearDensity);
    assert.equal(m.stiffness,base.stiffness);assert.equal(m.damping,base.damping);
  }
  for(let i=1;i<tiers.length;i++){assert.ok(tiers[i].friction>tiers[i-1].friction);assert.ok(tiers[i].maxTension>tiers[i-1].maxTension);}
});
test('sobrecarga curta menor que 0.12s não rompe linha intacta',async()=>{
  const {evaluateStructuralLoad}=await load('LineStructuralModel.js');
  const rope={structuralLoad:80,structuralFatigue:0,_structuralOverloadTime:0,
    segmentWear:new Float32Array([0,.1,.35,.2]),nodes:Array.from({length:5},(_,i)=>({x:i*10,y:0,z:0}))};
  const material={maxTension:40}; let result=null;
  for(let i=0;i<7;i++) result=evaluateStructuralLoad(rope,material,1/60);
  assert.equal(result.broke,false);assert.equal(rope.structuralFatigue,0);
  assert.ok(rope._structuralOverloadTime<.12);
});

test('após a graça fadiga segue a fórmula e rompe no segmento mais fraco',async()=>{
  const {evaluateStructuralLoad}=await load('LineStructuralModel.js');
  const rope={structuralLoad:80,structuralFatigue:0,_structuralOverloadTime:0,
    segmentWear:new Float32Array([.05,.4,.1,.2]),nodes:Array.from({length:5},(_,i)=>({x:i*10,y:i,z:0}))};
  const material={maxTension:40};
  for(let i=0;i<8;i++) evaluateStructuralLoad(rope,material,1/60);
  const before=rope.structuralFatigue;const r=evaluateStructuralLoad(rope,material,1/60);
  assert.ok(Math.abs((rope.structuralFatigue-before)-(1/60/.35))<1e-9);
  let last=r;for(let i=0;i<40&&!last.broke;i++) last=evaluateStructuralLoad(rope,material,1/60);
  assert.equal(last.broke,true);assert.equal(last.segmentIndex,1);assert.equal(last.segmentT,.5);
  assert.equal(rope.structuralFailure.cause,'tension');
});

test('mesma carga física produz menor loadRatio em material mais resistente',async()=>{
  const {evaluateStructuralLoad}=await load('LineStructuralModel.js');
  const ropeA={structuralLoad:40,structuralFatigue:0,_structuralOverloadTime:0,segmentWear:new Float32Array(2)};
  const ropeB={structuralLoad:40,structuralFatigue:0,_structuralOverloadTime:0,segmentWear:new Float32Array(2)};
  const weak=evaluateStructuralLoad(ropeA,{maxTension:35},1/60);
  const strong=evaluateStructuralLoad(ropeB,{maxTension:70},1/60);
  assert.ok(weak.loadRatio>strong.loadRatio);assert.ok(weak.loadRatio>1);assert.ok(strong.loadRatio<1);
});
test('RopePhysics calcula carga independente do limite de ruptura do material',async()=>{
  const {RopePhysics}=await load('RopePhysics.js');
  const weak=new RopePhysics({nodeCount:12,lineType:'algodao'}),strong=new RopePhysics({nodeCount:12,lineType:'kevlar'});
  for(const rope of [weak,strong]){rope.resetPositions({x:0,y:700,z:0},{x:0,y:100,z:0});rope.adjustSpoolLength(-65);rope.step(1/60,{x:0,y:700,z:0},{x:0,y:100,z:0},{x:0,y:0},{});}
  const weakRatio=weak.structuralLoad/weak.material.maxTension,strongRatio=strong.structuralLoad/strong.material.maxTension;
  assert.ok(weakRatio>strongRatio*1.5,`weak=${weakRatio} strong=${strongRatio}`);
  assert.ok(strong.structuralLoad<weak.structuralLoad*1.4,'carga não pode escalar com maxTension');
});
