const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const poolSource = fs.readFileSync(
  path.join(__dirname, '../frontend/src/ui/three/FlyawayKite3DPool.js'), 'utf8');
const threeScene = fs.readFileSync(
  path.join(__dirname, '../frontend/src/ui/ThreeSkyScene.js'), 'utf8');

test('pipa cortada usa modelo 3D especializado e leve', () => {
  assert.match(poolSource, /export function createFlyawayKiteModel3D\(/);
  assert.match(poolSource, /export class FlyawayKite3DPool/);
  const factory = poolSource.split('export function createFlyawayKiteModel3D')[1]
    ?.split('export class FlyawayKite3DPool')[0] || '';
  assert.doesNotMatch(factory, /hpGroup|shieldMesh|tornadoMesh|aura/,
    'Flyaway 3D não deve carregar sistemas de combate da pipa ativa');
});

test('corte reutiliza pool em vez de criar pipa completa no frame crítico', () => {
  const fallingSection = threeScene.split('// 5. Pipas cortadas')[1]
    ?.split('// 5.1 Linhas quebradas')[0] || '';
  assert.match(fallingSection, /acquireFlyaway\(/);
  assert.doesNotMatch(fallingSection, /createKiteModel3D\(|new THREE\./);
});
test('recursos do corte são pré-aquecidos antes do primeiro combate', () => {
  assert.match(threeScene, /prewarmCutVisuals\(/);
  assert.match(threeScene, /renderer\.compile\(this\.scene, this\.camera\)/);
});

test('entidade derrotada volta ao pool sem dispose durante a live', () => {
  const cleanupSection = threeScene.split('// 4. Limpeza de Inativos')[1]
    ?.split('// 5. Pipas cortadas')[0] || '';
  assert.match(cleanupSection, /releaseActiveVisual\(userId\)/);
  assert.doesNotMatch(cleanupSection, /_deferDispose|disposeHierarchy|\.dispose\(/,
    'corte nÃ£o pode liberar recursos WebGL do participante ativo');
});

test('linha rompida 3D também reutiliza pool', () => {
  const brokenSection = threeScene.split('// 5.1 Linhas quebradas')[1]
    ?.split('// 6.')[0] || '';
  assert.match(brokenSection, /acquireBrokenRope\(/);
  assert.doesNotMatch(brokenSection, /new THREE\.BufferGeometry\(/);
});

test('troca de textura da voada não invalida shader já pré-aquecido', () => {
  const configure = poolSource.split('_configure(model, flyaway, appearance = null)')[1]
    ?.split('acquireFlyaway(')[0] || '';
  assert.doesNotMatch(configure, /needsUpdate\s*=\s*true/,
    'trocar uma textura não-nula por outra não deve forçar recompilação do material');
});
