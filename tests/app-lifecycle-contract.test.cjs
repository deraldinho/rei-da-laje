const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const code=fs.readFileSync(path.resolve(__dirname,'../frontend/src/engine/App.js'),'utf8');

test('P17: GameApp usa bags de lifecycle e socket',()=>{
  assert.match(code,/LifecycleBag/);
  assert.match(code,/SocketSubscriptionBag/);
  assert.match(code,/this\._lifecycle\.dispose\(\)/);
  assert.match(code,/this\._socketSubscriptions\.dispose\(\)/);
});

test('P17: callbacks DOM/Pixi que precisam cleanup não são anônimos',()=>{
  assert.doesNotMatch(code,/window\.addEventListener\('resize',\s*\(\)\s*=>/);
  assert.doesNotMatch(code,/canvasElem\.addEventListener\('pointerdown',\s*\(e\)\s*=>/);
  assert.match(code,/this\._lifecycle\.listen\(window,\s*'resize'/);
  assert.match(code,/this\._lifecycle\.listen\(canvasElem,\s*'pointerdown'/);
});

test('P17: destroy não remove listeners Socket.IO de terceiros',()=>{
  assert.doesNotMatch(code,/this\.socket\.off\('(?:player|gift|competition|arena|settings|connect|disconnect|tiktok|likes|relinho|game)/);
  assert.match(code,/this\._socketSubscriptions\.on\('player:spawn'/);
});

test('P17: destroy é idempotente',()=>{
  const start=code.indexOf('  destroy() {');
  assert.ok(start>=0);
  const body=code.slice(start);
  assert.match(body,/if\s*\(this\._destroyed\)\s*return;/);
  assert.match(body,/this\._destroyed\s*=\s*true;/);
});

test('P17: destroy delega timers e DOM exclusivamente ao LifecycleBag',()=>{
  const start=code.indexOf('  destroy() {');
  const body=code.slice(start);
  assert.doesNotMatch(body,/window\.removeEventListener\(/);
  assert.doesNotMatch(body,/clearInterval\(/);
  assert.match(body,/this\._lifecycle\.dispose\(\)/);
});