const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('FallingKite possui identificador estável, userId, bodyColor e limpeza de timers', () => {
  const fkSource = fs.readFileSync(path.join(__dirname, '../frontend/src/entities/FallingKite.js'), 'utf8');
  assert.match(fkSource, /this\.userId\s*=\s*kiteData\?\.userId/);
  assert.match(fkSource, /this\.id\s*=\s*'fk_'/);
  assert.match(fkSource, /this\.bodyColor\s*=/);
  assert.match(fkSource, /destroy\(options\)\s*\{/);
  assert.match(fkSource, /clearInterval\(this\.catchInterval\)/);
});

test('ThreeSkyScene implementa descarte profundo e pools sem travar o corte', () => {
  const threeSource = fs.readFileSync(path.join(__dirname, '../frontend/src/ui/ThreeSkyScene.js'), 'utf8');
  assert.match(threeSource, /function disposeMaterial\(/);
  assert.match(threeSource, /function disposeHierarchy\(/);
  assert.match(threeSource, /child\.geometry\.dispose\(\)/);
  assert.match(threeSource, /userData\?\.isShared/);

  assert.match(threeSource, /_sharedKiteGeoTradicional/);
  assert.match(threeSource, /_sharedKiteGeoRaia/);
  assert.match(threeSource, /_sharedKiteGeoPeixinho/);
  assert.match(threeSource, /_sharedCenterStickRaiaGeo/);
  assert.match(threeSource, /_sharedFootGeo/);
  assert.match(threeSource, /_sharedHeadGeo/);
  assert.match(threeSource, /new ActiveVisualPool\(\{[\s\S]*capacity:\s*48/);
  assert.match(threeSource, /this\.releaseActiveVisual\(userId\)/,
    'participante inativo deve voltar ao pool sem dispose durante a live');
  const cleanup = threeSource.slice(
    threeSource.indexOf('// 4. Limpeza de Inativos'),
    threeSource.indexOf('// 5. Pipas cortadas')
  );
  assert.doesNotMatch(cleanup, /disposeHierarchy|\.dispose\(/,
    'cleanup de participante nÃ£o pode liberar GPU durante a sessÃ£o');
  assert.match(threeSource, /flyawayPool\.releaseFlyaway\(fId\)/,
    'pipa cortada deve voltar ao pool em vez de ser destruída no frame crítico');
  assert.match(threeSource, /lines\.releaseBrokenRope\(bId\)/,
    'linha rompida deve voltar ao pool');
  assert.match(threeSource, /this\.flyawayPool\?\.dispose\(\)/);
  assert.match(threeSource, /this\.lines\?\.dispose\(\)/);

  assert.match(threeSource,
    /destroy\(\)\s*\{[\s\S]*this\.kites3D\.clear\(\)[\s\S]*this\.renderer\.dispose\(\)/);
  assert.match(threeSource,
    /this\.renderer\.setPixelRatio\(Math\.min\(window\.devicePixelRatio\s*\|\|\s*1,\s*1\.25\)\)/);
});

test('App.js limita resolução PixiJS e sincroniza reset de arena no ThreeSkyScene', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '../frontend/src/engine/App.js'), 'utf8');
  assert.match(appSource,
    /resolution:\s*Math\.min\(window\.devicePixelRatio\s*\|\|\s*1,\s*1\.25\)/);
  assert.match(appSource,
    /this\.threeScene\.syncEntities\(this\.kites,\s*this\.fallingKites,\s*this\.sparks,\s*1\)/);
});
