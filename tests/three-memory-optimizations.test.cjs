const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('FallingKite possui identificador estável, userId, bodyColor e limpeza de timers', () => {
  const fkSource = fs.readFileSync(path.join(__dirname, '../frontend/src/entities/FallingKite.js'), 'utf8');
  assert.match(fkSource, /this\.userId\s*=\s*kiteData\?\.userId/, 'FallingKite deve expor this.userId diretamente');
  assert.match(fkSource, /this\.id\s*=\s*'fk_'/, 'FallingKite deve gerar id estável no construtor');
  assert.match(fkSource, /this\.bodyColor\s*=/, 'FallingKite deve salvar bodyColor para sincronização 3D');
  assert.match(fkSource, /destroy\(options\)\s*\{/, 'FallingKite deve sobrescrever destroy');
  assert.match(fkSource, /clearInterval\(this\.catchInterval\)/, 'destroy deve limpar catchInterval');
});

test('ThreeSkyScene implementa descarte profundo de memória WebGL e pools compartilhados', () => {
  const threeSource = fs.readFileSync(path.join(__dirname, '../frontend/src/ui/ThreeSkyScene.js'), 'utf8');

  // 1. Funções de Descarte
  assert.match(threeSource, /function disposeMaterial\(/, 'ThreeSkyScene deve implementar disposeMaterial');
  assert.match(threeSource, /function disposeHierarchy\(/, 'ThreeSkyScene deve implementar disposeHierarchy');
  assert.match(threeSource, /child\.geometry\.dispose\(\)/, 'disposeHierarchy deve liberar geometrias');
  assert.match(threeSource, /tex\.dispose\(\)/, 'disposeMaterial deve liberar texturas WebGL');

  // 2. Proteção de recursos compartilhados (isShared)
  assert.match(threeSource, /userData\?\.isShared/, 'dispose não deve destruir geometrias ou materiais compartilhados');
  assert.match(threeSource, /_sharedKiteGeoTradicional/, 'Deve haver cache de geometrias para pipa tradicional');
  assert.match(threeSource, /_sharedKiteGeoRaia/, 'Deve haver cache de geometrias para pipa raia');
  assert.match(threeSource, /_sharedKiteGeoPeixinho/, 'Deve haver cache de geometrias para pipa peixinho');
  assert.match(threeSource, /_sharedCenterStickRaiaGeo/, 'Deve haver cache de varetas de bambu');
  assert.match(threeSource, /_sharedFootGeo/, 'Deve haver cache de pés dos bonecos');
  assert.match(threeSource, /_sharedHeadGeo/, 'Deve haver cache de cabeças dos bonecos');

  // 3. Chamadas de dispose nas remoções
  assert.match(threeSource, /disposeHierarchy\(k3d\)/, 'Deve chamar disposeHierarchy ao remover pipas ativas');
  assert.match(threeSource, /disposeHierarchy\(p3d\)/, 'Deve chamar disposeHierarchy ao remover bonecos');
  assert.match(threeSource, /disposeHierarchy\(fk3d\)/, 'Deve chamar disposeHierarchy ao remover pipas cortadas');
  assert.match(threeSource, /l3d\.userData\.geo\.dispose\(\)/, 'Deve liberar buffers das linhas cortadas');

  // 4. Limpeza incondicional de fallingKites3D
  assert.match(threeSource, /for\s*\(\s*const\s*\[\s*fId,\s*fk3d\s*\]\s*of\s*this\.fallingKites3D\.entries\(\)\s*\)/, 'Deve iterar fallingKites3D');

  // 5. Método destroy()
  assert.match(threeSource, /destroy\(\)\s*\{[\s\S]*this\.kites3D\.clear\(\)[\s\S]*this\.renderer\.dispose\(\)/, 'ThreeSkyScene deve possuir método destroy completo');

  // 6. Teto de PixelRatio para transmissões OBS / Telas 4K
  assert.match(threeSource, /this\.renderer\.setPixelRatio\(Math\.min\(window\.devicePixelRatio\s*\|\|\s*1,\s*1\.25\)\)/, 'pixelRatio deve ter teto seguro de 1.25');
});

test('App.js limita resolução PixiJS e sincroniza reset de arena no ThreeSkyScene', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '../frontend/src/engine/App.js'), 'utf8');
  assert.match(appSource, /resolution:\s*Math\.min\(window\.devicePixelRatio\s*\|\|\s*1,\s*1\.25\)/, 'PixiJS resolution deve ser limitada a 1.25');
  assert.match(appSource, /this\.threeScene\.syncEntities\(this\.kites,\s*this\.fallingKites,\s*this\.sparks,\s*1\)/, 'handleArenaReset deve sincronizar e limpar o Three.js');
});
