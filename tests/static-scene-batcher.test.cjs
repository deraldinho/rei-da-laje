const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function load(rel) {
  const file = path.resolve(__dirname, '..', rel);
  return import(pathToFileURL(file).href + `?t=${Date.now()}_${Math.random()}`);
}

test('StaticSceneBatcher consolida meshes estáticos iguais em InstancedMesh', async () => {
  const THREE = await import('three');
  const { StaticSceneBatcher } = await load('frontend/src/ui/three/StaticSceneBatcher.js');
  const root = new THREE.Group();
  const geo = new THREE.BoxGeometry(1,1,1);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let i = 0; i < 5; i++) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.x = i * 2;
    root.add(mesh);
  }
  const batcher = new StaticSceneBatcher(root, { minInstances: 3 });
  const stats = batcher.rebuild();
  assert.equal(stats.originalMeshes, 5);
  assert.equal(stats.batchedMeshes, 5);
  assert.equal(stats.drawGroups, 1);
  assert.equal(root.children.filter(o => o.isInstancedMesh).length, 1);
  assert.equal(root.children.filter(o => o.isMesh && !o.isInstancedMesh).every(o => !o.visible), true);
});

test('StaticSceneBatcher ignora subárvore dinâmica e atualiza matrizes no resize', async () => {
  const THREE = await import('three');
  const { StaticSceneBatcher } = await load('frontend/src/ui/three/StaticSceneBatcher.js');
  const root = new THREE.Group(), dynamic = new THREE.Group();
  const geo = new THREE.BoxGeometry(1,1,1), mat = new THREE.MeshBasicMaterial();
  dynamic.userData.skipStaticBatch = true;
  dynamic.add(new THREE.Mesh(geo, mat));
  root.add(dynamic);
  const statics = [];
  for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(geo, mat); root.add(m); statics.push(m); }
  const batcher = new StaticSceneBatcher(root, { minInstances: 3 });
  const stats = batcher.rebuild();
  assert.equal(stats.batchedMeshes, 3);
  assert.equal(dynamic.children[0].visible, true);
  statics[1].position.x = 25;
  batcher.refresh();
  const instanced = root.children.find(o => o.isInstancedMesh);
  const matrix = new THREE.Matrix4(); instanced.getMatrixAt(1, matrix);
  assert.ok(Math.abs(new THREE.Vector3().setFromMatrixPosition(matrix).x - 25) < 0.001);
});

test('StaticSceneBatcher dispose restaura meshes originais sem destruir assets compartilhados', async () => {
  const THREE = await import('three');
  const { StaticSceneBatcher } = await load('frontend/src/ui/three/StaticSceneBatcher.js');
  const root = new THREE.Group();
  const geo = new THREE.BoxGeometry(1,1,1), mat = new THREE.MeshBasicMaterial();
  const originals = [];
  for (let i=0;i<4;i++){ const m=new THREE.Mesh(geo,mat);root.add(m);originals.push(m); }
  const batcher = new StaticSceneBatcher(root, { minInstances: 3 });
  batcher.rebuild();
  batcher.dispose();
  assert.equal(root.children.some(o => o.isInstancedMesh), false);
  assert.equal(originals.every(m => m.visible), true);
  assert.equal(geo.attributes.position !== undefined, true);
  assert.equal(mat.isMaterial, true);
});
