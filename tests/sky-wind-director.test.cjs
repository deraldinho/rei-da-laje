const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const root=path.resolve(__dirname,'../frontend/src/engine');
const directorPath=path.join(root,'physics/SkyWindDirector.js');
const dynamicsPath=path.join(root,'physics/KiteDynamics.js');
const windPath=path.join(root,'Wind.js');
const load=file=>import(pathToFileURL(file).href+`?t=${Date.now()}-${Math.random()}`);

test('SkyWindDirector é determinístico, suave e muda o campo global sem alvo',async()=>{
  assert.ok(fs.existsSync(directorPath),'SkyWindDirector.js deve existir');
  const {SkyWindDirector}=await load(directorPath);
  const d=new SkyWindDirector({seed:17});
  const base={x:1.1,y:.08,z:.04,gust:1,turbulence:.03,current:'normal'};
  assert.deepEqual(d.sample(12.5,base,0),d.sample(12.5,base,0));
  let prev=d.sample(0,base,0),maxStep=0,lastSign=Math.sign(prev.x),flips=0;
  for(let i=1;i<=7200;i++){
    const s=d.sample(i/60,base,0);
    maxStep=Math.max(maxStep,Math.hypot(s.x-prev.x,s.y-prev.y,s.z-prev.z));
    const sign=Math.abs(s.x)<.08?0:Math.sign(s.x);
    if(sign&&lastSign&&sign!==lastSign)flips++;
    if(sign)lastSign=sign;
    prev=s;
  }
  assert.ok(maxStep<.02,`salto de vento ${maxStep}`);
  assert.ok(flips>=2,`campo não reorganizou direção: ${flips}`);
});

test('CrowdEnergy só aumenta atividade dentro de limites seguros',async()=>{
  const {SkyWindDirector}=await load(directorPath);
  const d=new SkyWindDirector({seed:3});
  const base={x:1,y:.05,z:.02,gust:.9,turbulence:.04,current:'normal'};
  const calm=d.sample(21,base,0),hot=d.sample(21,base,1);
  assert.ok(hot.gust>=calm.gust&&hot.gust<=calm.gust*1.2);
  assert.ok(Math.abs(hot.turbulence)<=.22);
  assert.ok(Math.hypot(hot.x,hot.z)<=1.65,'crowd não pode explodir velocidade');
});
test('produção não usa mais assistência orientada por pares',()=>{
  const source=fs.readFileSync(dynamicsPath,'utf8');
  assert.doesNotMatch(source,/LiveCombatDirector/);
  assert.doesNotMatch(source,/computeLiveAssist/);
  assert.doesNotMatch(source,/partnerRank|encounterActive|activePair/);
});

test('Wind.sample reutiliza WindField e passa pelo SkyWindDirector',async()=>{
  const source=fs.readFileSync(windPath,'utf8');
  assert.match(source,/SkyWindDirector/);
  const {Wind}=await load(windPath);
  const a=Wind.sample(44.25),b=Wind.sample(44.25);
  assert.deepEqual(a,b);
  assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y)&&Number.isFinite(a.z));
  assert.ok(typeof a.phase==='string');
});
