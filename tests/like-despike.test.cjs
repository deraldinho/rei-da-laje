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

test('despique possui ciclo de bicada folga vento e retensionamento',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../frontend/src/engine/Maneuvers.js'),'utf8');
 assert.match(src,/cycle=\(elapsed%0\.62\)\/0\.62/);
 assert.match(src,/kite\.lineSlack/);
 assert.match(src,/catchWind/);
 assert.match(src,/kite\.despikeWindDir=dir/);
});
test('curtidas consecutivas nao reiniciam a animacao do despique',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../frontend/src/entities/Kite.js'),'utf8');
 assert.match(src,/previous > 0 && stats\.name === 'despicar'/);
 assert.match(src,/this\.lineSlack=Math\.max/);
});
