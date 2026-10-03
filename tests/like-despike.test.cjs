const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
test('evento TikTok de like preserva identidade e quantidade e usa entrada unificada',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../backend/tiktokService.js'),'utf8');
 const start=src.indexOf("this.connection.on('like'");const block=src.slice(start,start+800);
 assert.ok(start>=0);assert.match(block,/normalizeUser\(data\)/);assert.match(block,/likeCount/);assert.match(block,/handleLike/);
 const method=src.slice(src.indexOf('handleLike(data'),src.indexOf('handleShare(data'));
 assert.match(method,/ensurePlayerForInteraction/);assert.match(method,/emitLiveInteraction\(entry,'like'/);
});

test('despique físico continua disponível como manobra explícita',async()=>{
 const {PlayerIntentController}=await import('../frontend/src/engine/physics/PlayerIntentController.js');
 const k={x:400,attitude:{headingRate:0}}; const c=new PlayerIntentController(k);
 c.triggerAction('despicar',1,{steerDir:1}); const d=c.update(1/60,{x:1,y:0,z:0},[]);
 assert.ok(d.spoolCommand>0); assert.ok(d.debicoTorque>0); assert.ok(d.tensionAssist<0);
});