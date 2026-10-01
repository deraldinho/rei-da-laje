const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Validação de Eliminação de Memory Leaks e Otimização para 5GB de RAM', async (t) => {
  await t.test('1. Kite.js implementa método destroy() e descarta texturas de avatar', () => {
    const kiteCode = fs.readFileSync(path.join(__dirname, '../frontend/src/entities/Kite.js'), 'utf8');
    assert.match(kiteCode, /destroy\(options\)\s*\{/, 'Kite deve ter método destroy(options)');
    assert.match(kiteCode, /removeFromCache\(this\.avatarSprite\.texture\)/, 'Deve remover textura do avatarSprite do cache');
    assert.match(kiteCode, /avatarSprite\.texture\.destroy\(true\)/, 'Deve invocar destroy(true) na textura do avatar');
    assert.match(kiteCode, /texture:\s*true,\s*baseTexture:\s*true/, 'setProfile deve descartar com texture: true e baseTexture: true');
  });

  await t.test('2. RooftopPlayer.js implementa destroy() e descarta textura da face', () => {
    const rpCode = fs.readFileSync(path.join(__dirname, '../frontend/src/ui/RooftopPlayer.js'), 'utf8');
    assert.match(rpCode, /destroy\(options\)\s*\{/, 'RooftopPlayer deve ter método destroy(options)');
    assert.match(rpCode, /removeFromCache\(this\.profileFace\.texture\)/, 'Deve remover profileFace do cache');
    assert.match(rpCode, /profileFace\.texture\.destroy\(true\)/, 'Deve invocar destroy(true) na textura do profileFace');
  });

  await t.test('3. GiftShowcase.js descarta texturas de ícones de presentes', () => {
    const giftCode = fs.readFileSync(path.join(__dirname, '../frontend/src/engine/GiftShowcase.js'), 'utf8');
    assert.match(giftCode, /removeFromCache\(effect\.icon\.texture\)/, 'Deve remover ícone de presente do cache');
    assert.match(giftCode, /effect\.icon\.texture\.destroy\(true\)/, 'Deve invocar destroy(true) no ícone');
  });

  await t.test('4. Line.js e Tail.js pulam renderização 2D quando container está invisível (modo 3D)', () => {
    const lineCode = fs.readFileSync(path.join(__dirname, '../frontend/src/entities/Line.js'), 'utf8');
    const tailCode = fs.readFileSync(path.join(__dirname, '../frontend/src/entities/Tail.js'), 'utf8');
    assert.match(lineCode, /if\s*\(!this\.visible\s*\|\|\s*\(this\.parent\s*&&\s*!this\.parent\.visible\)\)\s*return;/, 'Line.update deve verificar visibilidade');
    assert.match(tailCode, /if\s*\(!this\.visible\s*\|\|\s*\(this\.parent\s*&&\s*!this\.parent\.visible\)\)\s*return;/, 'Tail.renderTail deve verificar visibilidade');
  });

  await t.test('5. ThreeSkyScene unifica cache de decalques (_kiteDecalTextureCache) e limpa no destroy', () => {
    const threeCode = fs.readFileSync(path.join(__dirname, '../frontend/src/ui/ThreeSkyScene.js'), 'utf8');
    assert.match(threeCode, /const _kiteDecalTextureCache = new Map\(\);/, 'Deve ter cache unificado de decalques');
    assert.match(threeCode, /getOrCreateKiteDecalTexture\(/, 'Deve ter helper para reutilizar CanvasTexture');
    assert.match(threeCode, /purgeTextureCache\(activeKites\)/, 'Deve ter método purgeTextureCache');
    assert.match(threeCode, /_kiteDecalTextureCache\.clear\(\)/, 'Deve limpar cache de decalques no destroy');
  });

  await t.test('6. ThreeSkyScene desativa castShadow em centenas de meshes estáticos', () => {
    const threeCode = fs.readFileSync(path.join(__dirname, '../frontend/src/ui/ThreeSkyScene.js'), 'utf8');
    assert.match(threeCode, /foundationMesh\.castShadow = false;/, 'foundationMesh não deve projetar sombra');
    assert.match(threeCode, /groundBody\.castShadow = false;/, 'groundBody não deve projetar sombra');
    assert.match(threeCode, /upperBody\.castShadow = false;/, 'upperBody não deve projetar sombra');
    assert.match(threeCode, /roofMesh\.castShadow = false;/, 'roofMesh não deve projetar sombra');
    assert.match(threeCode, /slabMesh\.castShadow = false;/, 'slabMesh não deve projetar sombra');
    assert.match(threeCode, /parapet\.castShadow = false;/, 'parapet não deve projetar sombra');
    assert.match(threeCode, /trunk\.castShadow = false;/, 'troncos não devem projetar sombra');
    assert.match(threeCode, /crown\.castShadow = false;/, 'copas de árvores não devem projetar sombra');
    assert.match(threeCode, /leftMountainMesh\.castShadow = false;/, 'morro esquerdo não deve projetar sombra');
    assert.match(threeCode, /rightMountainMesh\.castShadow = false;/, 'morro direito não deve projetar sombra');
  });

  await t.test('7. AudioManager faz pool do buffer de ruído Web Audio', () => {
    const audioCode = fs.readFileSync(path.join(__dirname, '../frontend/src/engine/AudioManager.js'), 'utf8');
    assert.match(audioCode, /getNoiseBuffer\(\)\s*\{/, 'Deve ter método getNoiseBuffer');
    assert.match(audioCode, /this\._noiseBuffer\s*=\s*this\.ctx\.createBuffer/, 'Deve armazenar buffer em this._noiseBuffer');
  });

  await t.test('8. App.js gerencia visibilidade de faíscas em 3D e roda garbage collection periódica', () => {
    const appCode = fs.readFileSync(path.join(__dirname, '../frontend/src/engine/App.js'), 'utf8');
    assert.match(appCode, /this\.sparks\.visible = !is3D;/, 'sparks deve ser ocultado em modo 3D');
    assert.match(appCode, /this\.memoryGcTimer = this\._lifecycle\.interval/, 'Deve ter memoryGcTimer gerenciado pelo lifecycle bag');
    assert.match(appCode, /this\.app\.renderer\.textureGC\.run\(\)/, 'Deve rodar textureGC periodicamente');
    assert.match(appCode, /purgeTextureCache\(this\.kites\)/, 'Deve purgar cache do Three.js periodicamente');
  });
});
