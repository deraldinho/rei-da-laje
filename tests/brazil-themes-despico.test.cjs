const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const load=async rel=>{const s=fs.readFileSync(path.join(__dirname,rel),'utf8');return import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));};
test('Brasil possui os 27 temas estaduais com identidade visual própria',async()=>{
 const {BRAZIL_THEMES,BRAZIL_THEME_CODES,brazilTheme}=await load('../frontend/src/ui/BrazilThemes.js');
 assert.equal(BRAZIL_THEME_CODES.length,27);assert.equal(new Set(BRAZIL_THEME_CODES).size,27);
 for(const code of BRAZIL_THEME_CODES){const t=brazilTheme(code);assert.ok(t.name&&t.region&&t.feature);assert.equal(t.sky.length,2);}
 assert.equal(brazilTheme('MG').feature,'serras');assert.equal(brazilTheme('RJ').feature,'morro');
});
test('despico solta a pipa para o lado do vento mesmo sem alvo',async()=>{
 const {applyManeuverMovement,maneuverStats}=await load('../frontend/src/engine/Maneuvers.js');
 for(const windX of [-1.4,1.4]){const maneuver=maneuverStats('despicar',1,1);maneuver.remaining=maneuver.duration-.5;
  const kite={x:500,y:400,screenWidth:1080,screenHeight:1920,isAscending:false,spawnProtection:0,maneuver};const before=kite.x;
  assert.equal(applyManeuverMovement(kite,[kite],1,{x:windX,y:0}),true);
  assert.equal(Math.sign(kite.x-before),Math.sign(windX));assert.ok(Math.abs(kite.x-before)>1);
 }
});

test('rotacao troca exatamente uma UF a cada dez minutos',async()=>{
 const {BRAZIL_THEME_CODES,STATE_ROTATION_MS,rotationThemeCode}=await load('../frontend/src/ui/BrazilThemes.js');
 assert.equal(STATE_ROTATION_MS,600000);
 assert.equal(rotationThemeCode('RJ',599999),'RJ');
 assert.equal(rotationThemeCode('RJ',600000),BRAZIL_THEME_CODES[(BRAZIL_THEME_CODES.indexOf('RJ')+1)%27]);
 assert.equal(rotationThemeCode('RJ',600000*27),'RJ');
});
