const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');

test('poder desconhecido não vira retão por fallback',async()=>{
 const {selectGiftManeuver,maneuverStats}=await import('../frontend/src/engine/Maneuvers.js');
 assert.equal(selectGiftManeuver('poder_que_nao_existe'),null);
 assert.equal(maneuverStats('poder_que_nao_existe',10,1),null);
});

test('App ignora competition:maneuver sem mapeamento funcional',()=>{
 const src=fs.readFileSync(path.join(__dirname,'../frontend/src/engine/App.js'),'utf8');
 const i=src.indexOf("this._socketSubscriptions.on('competition:maneuver'");const block=src.slice(i,i+650);
 assert.ok(i>=0);assert.match(block,/selectGiftManeuver/);assert.doesNotMatch(block,/\|\| String\(data\?\.giftName/);assert.doesNotMatch(block,/\|\| 'retao'/);
});