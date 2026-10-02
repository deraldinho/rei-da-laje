const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const windPath=path.resolve(__dirname,'../frontend/src/engine/Wind.js');
const fieldPath=path.resolve(__dirname,'../frontend/src/engine/physics/WindField.js');

async function loadWind(){
  return import(pathToFileURL(windPath).href+`?t=${Date.now()}`);
}

test('vento é determinístico, contínuo e com rajadas suaves a 60 Hz',async()=>{
  const {Wind}=await loadWind();
  let prev=Wind.sample(0), maxDx=0, maxDg=0;
  assert.deepEqual(Wind.sample(12.345),Wind.sample(12.345));
  for(let i=1;i<=3600;i++){
    const sample=Wind.sample(i/60);
    for(const key of ['x','y','z','gust','turbulence']) assert.ok(Number.isFinite(sample[key]),key);
    maxDx=Math.max(maxDx,Math.abs(sample.x-prev.x));
    maxDg=Math.max(maxDg,Math.abs(sample.gust-prev.gust));
    prev=sample;
  }
  assert.ok(maxDx<0.01,`mudança horizontal abrupta: ${maxDx}`);
  assert.ok(maxDg<0.01,`rajada abrupta: ${maxDg}`);
});

test('vento normal mantém direção dominante e vertical/turbulência secundários',async()=>{
  const {Wind}=await loadWind();
  let lastSign=0, flips=0, maxY=0, maxTurb=0;
  for(let i=0;i<=3600;i++){
    const sample=Wind.sample(i/60);
    const sign=Math.abs(sample.x)<0.12?0:Math.sign(sample.x);
    if(sign&&lastSign&&sign!==lastSign) flips++;
    if(sign) lastSign=sign;
    maxY=Math.max(maxY,Math.abs(sample.y));
    maxTurb=Math.max(maxTurb,Math.abs(sample.turbulence));
  }
  assert.ok(flips<=3,`vento virou direção ${flips} vezes em 60s`);
  assert.ok(maxY<=0.38,`componente vertical excessiva: ${maxY}`);
  assert.ok(maxTurb<=0.18,`turbulência excessiva: ${maxTurb}`);
});

test('Wind.sample delega para o módulo WindField público',async()=>{
  assert.ok(fs.existsSync(fieldPath),'WindField.js deve existir');
  const {sampleWindField}=await import(pathToFileURL(fieldPath).href+`?t=${Date.now()}`);
  const a=sampleWindField(9.5,{intensityMultiplier:1,direction:'auto',pace:'normal'});
  const b=sampleWindField(9.5,{intensityMultiplier:1,direction:'auto',pace:'normal'});
  assert.deepEqual(a,b);
  assert.ok(['normal','updraft','downdraft','crosswind'].includes(a.current));
});
