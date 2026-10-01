const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../frontend/src/entities/Kite.js'), 'utf8').replace(/\r\n/g, '\n');
const match = source.match(/  regenHP\(delta\) \{([\s\S]*?)\n  \}\n\n  renderKite\(/);
assert.ok(match, 'método de regeneração deve existir');
const regenHP = new Function('delta', match[1]);
const makeKite = (hp=40, combat=false) => ({lineHP:hp,maxLineHP:100,isInCombat:combat, updateHPBar() { this.updated = true; }, regenHP});
test('HP recupera 50 pontos em cinco minutos fora de combate', () => {
  const a=makeKite(); for(let i=0;i<60;i++) a.regenHP(1);
  assert.ok(Math.abs(a.lineHP - (40 + 1/6)) < 1e-8);
  const b=makeKite(); for(let i=0;i<30;i++) b.regenHP(2);
  assert.ok(Math.abs(b.lineHP-a.lineHP)<1e-8, 'independente de 30/60 FPS');
  assert.ok(a.lineHP-40 < 1, 'não cura todo o dano entre relinhos curtos');
});
test('não regenera em combate nem ultrapassa HP máximo', () => {
  const inCombat=makeKite(15,true); inCombat.regenHP(180);
  assert.equal(inCombat.lineHP,15);
  const capped=makeKite(99.999); capped.regenHP(3);
  assert.equal(capped.lineHP,100);
});
