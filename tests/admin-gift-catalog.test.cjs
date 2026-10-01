const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('painel lista catálogo detectado sem interpretar nome de presente como HTML',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../backend/views/admin.html'),'utf8');
 assert.match(html,/id="giftCatalog"/);
 assert.match(html,/\/api\/gifts\/catalog/);
 assert.match(html,/name\.textContent=/);
 assert.match(html,/ANIMAÇÃO AUTOMÁTICA/);
 assert.match(html,/durationSeconds/);
 assert.match(html,/maxDurationSeconds/);
 assert.match(html,/gift\.benefit/);
});
