const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const attitudePath=path.resolve(__dirname,'../frontend/src/engine/physics/KiteAttitude.js');
const aeroPath=path.resolve(__dirname,'../frontend/src/engine/physics/KiteAerodynamics.js');

async function modules(){
  assert.ok(fs.existsSync(attitudePath),'KiteAttitude.js deve existir');
  assert.ok(fs.existsSync(aeroPath),'KiteAerodynamics.js deve existir');
  return Promise.all([
    import(pathToFileURL(attitudePath).href+`?t=${Date.now()}`),
    import(pathToFileURL(aeroPath).href+`?t=${Date.now()}`)
  ]);
}

function kite(){return {x:0,y:0,z:0,vx:0,vy:0,vz:0,mass:.85,rotation:0};}

test('30s de voo estável mantém atitude limitada sem desbico espontâneo',async()=>{
  const [{ensureKiteAttitude,stepKiteAttitude},{computeKiteAerodynamics}]=await modules();
  const k=kite(), wind={x:1.05,y:.08,z:.04,gust:1.0};
  ensureKiteAttitude(k);
  let maxPitch=0,maxHeadingRate=0;
  for(let i=0;i<1800;i++){
    const a=stepKiteAttitude(k,1/60,{wind,tension:.86,debicoTorque:0,trimPitch:0});
    const f=computeKiteAerodynamics(k,wind,{tension:.86,slackRatio:.02},{});
    maxPitch=Math.max(maxPitch,Math.abs(a.pitch));
    maxHeadingRate=Math.max(maxHeadingRate,Math.abs(a.headingRate));
    assert.ok([a.heading,a.pitch,a.roll,a.headingRate,a.pitchRate,f.fx,f.fy,f.fz].every(Number.isFinite));
  }
  assert.ok(maxPitch<.45,`pitch instável: ${maxPitch}`);
  assert.ok(maxHeadingRate<.7,`giro espontâneo: ${maxHeadingRate}`);
});

test('desbico gira mais com linha frouxa e tensão alta amortece o giro',async()=>{
  const [{ensureKiteAttitude,stepKiteAttitude}]=await modules();
  const wind={x:1,y:0,z:0,gust:1};
  const loose=kite(), tight=kite();
  ensureKiteAttitude(loose); ensureKiteAttitude(tight);
  for(let i=0;i<60;i++){
    stepKiteAttitude(loose,1/60,{wind,tension:.18,debicoTorque:.9,trimPitch:.15});
    stepKiteAttitude(tight,1/60,{wind,tension:.92,debicoTorque:.9,trimPitch:.15});
  }
  assert.ok(Math.abs(loose.attitude.heading)>Math.abs(tight.attitude.heading)*1.5,
    `folga deveria liberar giro: loose=${loose.attitude.heading} tight=${tight.attitude.heading}`);
  const rateBefore=Math.abs(tight.attitude.headingRate);
  for(let i=0;i<120;i++) stepKiteAttitude(tight,1/60,{wind,tension:.95,debicoTorque:0,trimPitch:0});
  assert.ok(Math.abs(tight.attitude.headingRate)<rateBefore);
  assert.ok(Math.abs(tight.attitude.pitch)<.35);
});

test('força usa vento aparente e cresce com velocidade relativa',async()=>{
  const [{ensureKiteAttitude},{computeKiteAerodynamics}]=await modules();
  const wind={x:1,y:0,z:0,gust:1};
  const withWind=kite(), againstWind=kite();
  ensureKiteAttitude(withWind); ensureKiteAttitude(againstWind);
  withWind.vx=30; againstWind.vx=-30;
  const low=computeKiteAerodynamics(withWind,wind,{tension:.7,slackRatio:.05},{});
  const high=computeKiteAerodynamics(againstWind,wind,{tension:.7,slackRatio:.05},{});
  const lowMag=Math.hypot(low.fx,low.fy,low.fz), highMag=Math.hypot(high.fx,high.fy,high.fz);
  assert.ok([lowMag,highMag,low.headingTorque,high.pitchTorque].every(Number.isFinite));
  assert.ok(high.apparentSpeed>low.apparentSpeed);
  assert.ok(highMag>lowMag*1.2,`vento relativo maior deveria gerar força maior: ${lowMag} -> ${highMag}`);
});
