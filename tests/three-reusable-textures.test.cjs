const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

function installCanvasDom() {
  const draws = [];
  const images = [];
  const makeContext = () => ({
    save() {}, restore() {}, beginPath() {}, closePath() {}, clip() {},
    arc() {}, moveTo() {}, lineTo() {}, fill() {}, stroke() {}, clearRect() {},
    fillRect() {}, strokeRect() {}, roundRect() {}, fillText() {},
    drawImage(...args) { draws.push(args); }
  });
  global.document = {
    createElement(tag) {
      assert.equal(tag, 'canvas');
      return { width: 0, height: 0, getContext: () => makeContext() };
    }
  };
  global.Image = class {
    constructor() { images.push(this); }
    set src(value) { this._src = value; }
    get src() { return this._src; }
  };
  return { draws, images };
}

async function loadMaterials() {
  const file = path.join(__dirname, '../frontend/src/ui/three/ThreeMaterials.js');
  const threeUrl = pathToFileURL(path.join(__dirname, '../node_modules/three/build/three.module.js')).href;
  let source = fs.readFileSync(file, 'utf8');
  source = source.replace("import * as THREE from 'three';", `import * as THREE from '${threeUrl}';`);
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

test('paper reutilizável mantém a mesma CanvasTexture e apenas atualiza seu bitmap', async () => {
  installCanvasDom();
  const materials = await loadMaterials();
  const texture = materials.createReusableKitePaperTexture();
  const same = texture;
  const canvas = texture.image;
  const versionBefore = texture.version;

  const result = materials.paintReusableKitePaperTexture(
    texture, 0xff0000, 0x00ff00, 2
  );

  assert.equal(result, undefined);
  assert.equal(texture, same);
  assert.equal(texture.image, canvas);
  assert.equal(canvas.width, 128);
  assert.equal(canvas.height, 128);
  assert.ok(texture.version > versionBefore, 'bitmap precisa marcar upload da mesma textura');
});

test('decal reutilizável ignora callback atrasado de avatar após reuso do slot', async () => {
  const { draws, images } = installCanvasDom();
  const materials = await loadMaterials();
  const texture = materials.createReusableKiteDecalTexture();
  let currentGeneration = 1;
  materials.paintReusableKiteDecalTexture(texture, {
    nickname: 'Antigo',
    profileUrl: 'https://example.com/old.jpg',
    baseColorHex: 0x112233,
    isKing: false,
    isLeader: false
  }, 1, generation => generation === currentGeneration);

  assert.equal(images.length, 1);
  currentGeneration = 2;
  materials.paintReusableKiteDecalTexture(texture, {
    nickname: 'Novo',
    profileUrl: '',
    baseColorHex: 0x445566,
    isKing: true,
    isLeader: false
  }, 2, generation => generation === currentGeneration);

  const drawsBeforeLateLoad = draws.length;
  images[0].onload();
  assert.equal(draws.length, drawsBeforeLateLoad,
    'avatar antigo não pode desenhar sobre slot reaproveitado');
  assert.equal(texture.userData.identityGeneration, 2);
  assert.equal(texture.userData.identityNickname, 'Novo');
});
