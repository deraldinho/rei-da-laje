const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('curtida aciona despico somente na pipa do autor',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../frontend/src/engine/App.js'),'utf8');
 const start=src.indexOf("this._socketSubscriptions.on('likes:burst'");
 const block=src.slice(start,start+600);
 assert.ok(start>=0);
 assert.match(block,/this\.kites\.get\(String\(data\?\.userId/);
 assert.match(block,/maneuverStats\('despicar'/);
 assert.doesNotMatch(block,/this\.kites\.forEach/);
});
test('evento TikTok de like preserva identidade e quantidade para o despico',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../backend/tiktokService.js'),'utf8');
 const start=src.indexOf("this.connection.on('like'");
 const block=src.slice(start,start+900);
 assert.match(block,/userId:/);assert.match(block,/likeCount/);assert.match(block,/despike: true/);
});

test('despique possui ciclo físico de folga torque e retensionamento',async()=>{
 const {PlayerIntentController}=await import('../frontend/src/engine/physics/PlayerIntentController.js');
 const k={x:400,attitude:{headingRate:0}}; const c=new PlayerIntentController(k);
 c.triggerAction('despicar',1,{steerDir:1}); const d=c.update(1/60,{x:1,y:0,z:0},[]);
 assert.ok(d.spoolCommand>0); assert.ok(d.debicoTorque>0); assert.ok(d.tensionAssist<0);
 c.triggerAction('retao',1,{steerDir:1}); for(let i=0;i<40;i++) c.update(1/60,{x:1,y:0,z:0},[]);
 const p=c.update(1/60,{x:1,y:0,z:0},[]); assert.ok(p.spoolCommand<0); assert.ok(p.tensionAssist>0);
});

test('curtidas consecutivas nao reiniciam a animacao do despique',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../frontend/src/entities/Kite.js'),'utf8');
 assert.match(src,/previous > 0 && stats\.name === 'despicar'/);
 assert.match(src,/this\.lineSlack=Math\.max/);
});
