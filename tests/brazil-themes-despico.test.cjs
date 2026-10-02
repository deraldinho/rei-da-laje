const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const load=rel=>import(pathToFileURL(path.join(__dirname,rel)).href+`?t=${Date.now()}-${Math.random()}`);

test('Brasil possui os 27 temas estaduais com identidade visual própria',async()=>{
 const {BRAZIL_THEMES,BRAZIL_THEME_CODES,brazilTheme}=await load('../frontend/src/ui/BrazilThemes.js');
 assert.equal(BRAZIL_THEME_CODES.length,27);assert.equal(new Set(BRAZIL_THEME_CODES).size,27);
 for(const code of BRAZIL_THEME_CODES){const t=brazilTheme(code);assert.ok(t.name&&t.region&&t.feature);assert.equal(t.sky.length,2);}
 assert.equal(brazilTheme('MG').feature,'serras');assert.equal(brazilTheme('RJ').feature,'morro');
});

test('despico solta linha e aplica torque no lado do vento sem alvo',async()=>{
 const [{applyManeuverMovement,maneuverStats},{PlayerIntentController}]=await Promise.all([
  load('../frontend/src/engine/Maneuvers.js'),load('../frontend/src/engine/physics/PlayerIntentController.js')]);
 for(const windX of [-1.4,1.4]){
  const maneuver=maneuverStats('despicar',1,1);maneuver.remaining=maneuver.duration-.5;
  const kite={x:500,y:400,screenWidth:1080,screenHeight:1920,isAscending:false,spawnProtection:0,maneuver};
  kite.intentController=new PlayerIntentController(kite);
  const beforeX=kite.x;
  assert.equal(applyManeuverMovement(kite,[kite],1,{x:windX,y:0}),true);
  const intent=kite.intentController.update(1/60,{x:windX,y:0},[kite]);
  assert.equal(kite.x,beforeX,'manobra não pode teleportar');
  assert.ok(intent.spoolCommand>0,'despico deve liberar linha');
  assert.equal(Math.sign(intent.debicoTorque),Math.sign(windX));
 }
});

test('rotacao troca exatamente uma UF a cada dez minutos',async()=>{
 const {BRAZIL_THEME_CODES,STATE_ROTATION_MS,rotationThemeCode}=await load('../frontend/src/ui/BrazilThemes.js');
 assert.equal(STATE_ROTATION_MS,600000);
 assert.equal(rotationThemeCode('RJ',599999),'RJ');
 assert.equal(rotationThemeCode('RJ',600000),BRAZIL_THEME_CODES[(BRAZIL_THEME_CODES.indexOf('RJ')+1)%27]);
 assert.equal(rotationThemeCode('RJ',600000*27),'RJ');
});
