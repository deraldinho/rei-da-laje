import * as THREE from 'three';

/**
 * Consolida meshes estáticos que compartilham Geometry+Material em InstancedMesh.
 * Os objetos originais permanecem na árvore (ocultos) para que layout/resize continue
 * atualizando seus transforms; refresh() copia as novas matrizes para as instâncias.
 */
export class StaticSceneBatcher {
  constructor(root, { minInstances = 3 } = {}) {
    this.root = root;
    this.minInstances = Math.max(2, Math.floor(Number(minInstances) || 3));
    this.batches = [];
    this.hidden = [];
    this.stats = { originalMeshes: 0, batchedMeshes: 0, drawGroups: 0 };
    this._rootInverse = new THREE.Matrix4();
    this._matrix = new THREE.Matrix4();
  }

  _restoreOriginals() {
    for (const item of this.hidden) item.mesh.visible = item.visible;
    this.hidden.length = 0;
  }

  _removeInstances() {
    for (const batch of this.batches) {
      if (batch.instance?.parent) batch.instance.parent.remove(batch.instance);
    }
    this.batches.length = 0;
  }

  _collect() {
    const groups = new Map();
    let originalMeshes = 0;
    const visit = (object, inheritedSkip = false) => {
      const skip = inheritedSkip || Boolean(object.userData?.skipStaticBatch || object.userData?.staticBatchInstance);
      if (object.isMesh && !object.isInstancedMesh) {
        originalMeshes += 1;
        const material = object.material;
        const eligible = !skip && object.geometry && material && !Array.isArray(material) &&
          !material.transparent && !object.isSkinnedMesh && !object.morphTargetInfluences;
        if (eligible) {
          const key = [object.geometry.uuid, material.uuid, object.castShadow ? 1 : 0,
            object.receiveShadow ? 1 : 0, object.renderOrder || 0].join('|');
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key).push(object);
        }
      }
      for (const child of object.children || []) visit(child, skip);
    };
    visit(this.root, false);
    return { groups, originalMeshes };
  }

  _relativeMatrix(mesh) {
    mesh.updateWorldMatrix(true, false);
    return this._matrix.multiplyMatrices(this._rootInverse, mesh.matrixWorld);
  }

  rebuild() {
    if (!this.root) return this.stats;
    this._restoreOriginals();
    this._removeInstances();
    this.root.updateWorldMatrix(true, true);
    this._rootInverse.copy(this.root.matrixWorld).invert();
    const { groups, originalMeshes } = this._collect();
    let batchedMeshes = 0;

    for (const items of groups.values()) {
      if (items.length < this.minInstances) continue;
      const first = items[0];
      const instance = new THREE.InstancedMesh(first.geometry, first.material, items.length);
      instance.userData.staticBatchInstance = true;
      instance.castShadow = first.castShadow;
      instance.receiveShadow = first.receiveShadow;
      instance.renderOrder = first.renderOrder;
      instance.matrixAutoUpdate = false;
      instance.matrix.identity();
      instance.matrixWorldNeedsUpdate = true;

      items.forEach((mesh, index) => {
        instance.setMatrixAt(index, this._relativeMatrix(mesh));
        this.hidden.push({ mesh, visible: mesh.visible });
        mesh.visible = false;
      });
      instance.instanceMatrix.needsUpdate = true;
      instance.computeBoundingSphere?.();
      this.root.add(instance);
      this.batches.push({ instance, items });
      batchedMeshes += items.length;
    }

    this.stats = {
      originalMeshes,
      batchedMeshes,
      drawGroups: this.batches.length,
      savedDraws: Math.max(0, batchedMeshes - this.batches.length)
    };
    return { ...this.stats };
  }

  refresh() {
    if (!this.root || !this.batches.length) return this.stats;
    this.root.updateWorldMatrix(true, true);
    this._rootInverse.copy(this.root.matrixWorld).invert();
    for (const batch of this.batches) {
      batch.items.forEach((mesh, index) => {
        batch.instance.setMatrixAt(index, this._relativeMatrix(mesh));
      });
      batch.instance.instanceMatrix.needsUpdate = true;
      batch.instance.computeBoundingSphere?.();
    }
    return { ...this.stats };
  }

  dispose() {
    this._restoreOriginals();
    this._removeInstances();
    this.stats = { originalMeshes: 0, batchedMeshes: 0, drawGroups: 0, savedDraws: 0 };
  }
}
