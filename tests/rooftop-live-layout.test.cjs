const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('laje vertical maior e Ã¢ncora coerente em 2K sem mudar arena horizontal', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../frontend/src/ui/RooftopLayout.js'), 'utf8');
  const { rooftopHeight, rooftopAnchorY, rooftopPlayerLayout, rooftopHandAnchor } = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  assert.ok(Math.abs(rooftopHeight(1440, 2560) - 237.6) < 0.001);
  assert.ok(Math.abs(rooftopHeight(1080, 1920) - 181.5) < 0.001);
  assert.equal(rooftopHeight(1920, 1080), 58);
  assert.equal(rooftopAnchorY(1920, 1080), 1018);
  assert.ok(Math.abs(rooftopAnchorY(1440, 2560) - 2298.4) < 0.001);
  assert.ok(Math.abs(rooftopAnchorY(1080, 1920) - 1714.5) < 0.001);
  assert.ok(rooftopAnchorY(1440, 2560) < 2560-rooftopHeight(1440,2560));
});

test('40 bonequinhos ocupam duas fileiras sem sobrepor cabeÃ§as em 1440x2560',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../frontend/src/ui/RooftopLayout.js'),'utf8');
  const {rooftopPlayerLayout}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const slots=Array.from({length:40},(_,i)=>rooftopPlayerLayout(i,40,1440,2560));
  assert.deepEqual([...new Set(slots.map(s=>s.row))],[0,1]);
  assert.ok(slots.every(s=>s.rows===2 && s.showNickname===false));
  for(const row of [0,1]){
    const list=slots.filter(s=>s.row===row).sort((a,b)=>a.x-b.x);
    for(let i=1;i<list.length;i++){
      const gap=list[i].x-list[i-1].x;
      const headWidth=34*Math.max(list[i].scale,list[i-1].scale);
      assert.ok(gap>headWidth,'row '+row+': gap '+gap+' <= head '+headWidth);
    }
  }
});

test('atÃ© 20 bonequinhos usam uma fileira e mantÃªm nickname visÃ­vel',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../frontend/src/ui/RooftopLayout.js'),'utf8');
  const {rooftopPlayerLayout}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const slots=Array.from({length:20},(_,i)=>rooftopPlayerLayout(i,20,1440,2560));
  assert.equal(new Set(slots.map(s=>s.row)).size,1);
  assert.ok(slots.every(s=>s.showNickname));
});


test('cenÃ¡rio de morro preserva bastante cÃ©u e enquadra os morros nas laterais',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../frontend/src/ui/BackdropLayout.js'),'utf8');
  const {backdropLayout,backdropHousePalette}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const portrait=backdropLayout(1080,1920);
  assert.ok(portrait.horizonY > 1920*0.52 && portrait.horizonY < 1920*0.58);
  assert.ok(portrait.leftTopY !== portrait.rightTopY);
  assert.ok(portrait.leftFootY !== portrait.rightFootY);
  assert.ok(portrait.leftHillWidth < 1080*0.5 && portrait.rightHillWidth < 1080*0.5);
  assert.ok(portrait.leftFootY-portrait.leftTopY > 1920*0.20);
  assert.ok(portrait.rightFootY-portrait.rightTopY > 1920*0.20);
  const landscape=backdropLayout(1920,1080);
  assert.ok(landscape.horizonY > 1080*0.58 && landscape.horizonY < 1080*0.64);
  assert.ok(backdropHousePalette().length >= 8);
});



test('metropole não desenha torres no primeiro plano da laje',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../frontend/src/ui/SkyScene.js'),'utf8');
  assert.equal(source.includes("if(f==='metropole')for"),false);
  assert.ok(source.includes('Metrópole já aparece nas camadas distantes'));
});


test('linha nasce exatamente na mão direita do bonequinho',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../frontend/src/ui/RooftopLayout.js'),'utf8');
  const {rooftopHandAnchor}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const hand=rooftopHandAnchor(500,1700,1.5,1.5,0);
  assert.equal(hand.x,519.5);
  assert.equal(hand.y,1641.5);
  const rotated=rooftopHandAnchor(500,1700,1,1,Math.PI/2);
  assert.ok(Math.abs(rotated.x-539)<0.0001);
  assert.ok(Math.abs(rotated.y-1713)<0.0001);
});

test('App sincroniza âncora lógica e visual da linha com a mão a cada frame',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../frontend/src/engine/App.js'),'utf8');
  assert.ok(source.includes('syncLineToPlayerHand(kite)'));
  assert.ok(source.includes('kite.line.baseX=physical.x'));
  assert.ok(source.includes('kite.line.baseY=physical.y'));
  assert.ok(source.includes('kite.line.visualBaseX'));
  assert.ok(source.includes('getPhysicalLineAnchor'));
});
