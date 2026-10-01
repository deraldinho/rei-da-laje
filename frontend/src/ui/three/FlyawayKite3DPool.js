import * as THREE from 'three';
import {
  getSharedTradicionalGeo,
  getSharedRaiaGeo,
  getSharedPeixinhoGeo,
  getSharedCenterStickGeo,
  getSharedCrossStickGeo,
  getSharedCabrestoGeo,
  getSharedBambooMat,
  getSharedFiberMat,
  getSharedCabrestoMat,
  getSharedDecalGeo
} from './ThreeKites.js';
import {
  createKitePaperCanvas,
  getOrCreateKiteDecalTexture
} from './ThreeMaterials.js';

const DEFAULT_POOL_SIZE = 48;
const TAIL_NODES = 8;
const HANGING_NODES = 8;

function geometryForType(type) {
  if (type === 'raia') return getSharedRaiaGeo();
  if (type === 'peixinho') return getSharedPeixinhoGeo();
  return getSharedTradicionalGeo();
}
export function createFlyawayKiteModel3D() {
  const group = new THREE.Group();
  const paper = createKitePaperCanvas(0xff5722, 0x00aaff, 0);
  const bodyMat = new THREE.MeshStandardMaterial({
    map: paper,
    color: 0xffffff,
    side: THREE.DoubleSide,
    roughness: 0.42,
    metalness: 0.02,
    transparent: true,
    opacity: 0.96
  });
  const body = new THREE.Mesh(getSharedTradicionalGeo(), bodyMat);
  body.castShadow = false;
  group.add(body);

  const centerStick = new THREE.Mesh(
    getSharedCenterStickGeo(false, false), getSharedBambooMat());
  centerStick.position.set(0, -5.5, 0.4);
  group.add(centerStick);

  const crossStick = new THREE.Mesh(
    getSharedCrossStickGeo(false, false), getSharedFiberMat());
  group.add(crossStick);

  const cabresto = new THREE.LineSegments(
    getSharedCabrestoGeo(false, false), getSharedCabrestoMat());
  group.add(cabresto);
  const decalMat = new THREE.MeshBasicMaterial({
    map: getOrCreateKiteDecalTexture('Pipa', '', 0xff5722, false, false),
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true
  });
  const decal = new THREE.Mesh(getSharedDecalGeo(false), decalMat);
  decal.position.set(0, 1.2, 0.65);
  group.add(decal);

  const tailGroup = new THREE.Group();
  tailGroup.position.set(0, -26, 0);
  const tailPositions = new Float32Array(TAIL_NODES * 3);
  const tailNodes = [];
  for (let i = 0; i < TAIL_NODES; i++) {
    const y = -i * 5.2;
    tailPositions[i * 3 + 1] = y;
    tailNodes.push(new THREE.Vector3(0, y, 0));
  }
  const tailGeo = new THREE.BufferGeometry();
  tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPositions, 3));
  const tailMat = new THREE.LineBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.82
  });
  const tailMesh = new THREE.Line(tailGeo, tailMat);
  tailGroup.add(tailMesh);
  group.add(tailGroup);

  const hangingGeo = new THREE.BufferGeometry();  const hangingPositions = new Float32Array(HANGING_NODES * 3);
  const hangingLine = new THREE.Line(
    hangingGeo,
    new THREE.LineBasicMaterial({
      color: 0xffffff, transparent: true, opacity: 0.85
    })
  );
  hangingGeo.setAttribute(
    'position', new THREE.BufferAttribute(hangingPositions, 3));
  hangingLine.frustumCulled = false;
  group.add(hangingLine);

  group.visible = false;
  group.scale.set(0.85, 0.85, 0.85);
  group.userData = {
    body,
    bodyMat,
    centerStick,
    crossStick,
    cabresto,
    decal,
    decalMat,
    tailGroup,
    tailNodes,
    fitilhos: [],
    tailMesh,
    hangingLine,
    poolId: null,
    acquiredAt: 0
  };
  return group;
}
export class FlyawayKite3DPool {
  constructor(parentGroup, size = DEFAULT_POOL_SIZE) {
    this.parentGroup = parentGroup;
    this.active = new Map();
    this.items = [];
    const count = Math.max(4, Math.floor(Number(size) || DEFAULT_POOL_SIZE));
    for (let i = 0; i < count; i++) {
      const model = createFlyawayKiteModel3D();
      model.userData.poolIndex = i;
      this.items.push(model);
      this.parentGroup?.add(model);
    }
  }

  _configure(model, flyaway, appearance = null) {
    const type = flyaway?.kiteType || 'tradicional';
    const isRaia = type === 'raia';
    const isPeixinho = type === 'peixinho';
    model.userData.body.geometry = geometryForType(type);
    model.userData.centerStick.geometry =
      getSharedCenterStickGeo(isRaia, isPeixinho);
    model.userData.centerStick.position.y = isRaia ? 0 : isPeixinho ? -6.5 : -5.5;
    model.userData.crossStick.geometry =
      getSharedCrossStickGeo(isRaia, isPeixinho);
    model.userData.cabresto.geometry =
      getSharedCabrestoGeo(isRaia, isPeixinho);
    model.userData.decal.geometry = getSharedDecalGeo(isPeixinho);
    model.userData.tailGroup.position.y = isRaia ? -17 : isPeixinho ? -24 : -26;
    if (appearance?.paperMap) {
      model.userData.bodyMat.map = appearance.paperMap;
      model.userData.bodyMat.color.setHex(0xffffff);
    } else {
      model.userData.bodyMat.color.setHex(flyaway?.bodyColor || 0xff6633);
    }

    if (appearance?.decalMap) {
      model.userData.decalMat.map = appearance.decalMap;
    }
    const lineColor = flyaway?.kiteData?.line?.color || 0xffffff;
    model.userData.hangingLine.material.color.setHex(lineColor);
    model.userData.hangingLine.material.opacity = 0.85;
    model.userData.tailMesh.material.opacity = 0.82;
    model.userData.tailWorldNodes = null;
    model.rotation.set(0, 0, 0);
    model.scale.set(0.85, 0.85, 0.85);
  }

  acquireFlyaway(id, flyaway, appearance = null) {
    const key = String(id);
    if (this.active.has(key)) return this.active.get(key);
    let model = this.items.find(item => !item.userData.poolId);
    if (!model) {
      model = this.items.reduce((oldest, item) =>
        item.userData.acquiredAt < oldest.userData.acquiredAt ? item : oldest,
      this.items[0]);
      if (model?.userData.poolId) this.releaseFlyaway(model.userData.poolId);
    }    if (!model) return null;
    this._configure(model, flyaway, appearance);
    model.userData.poolId = key;
    model.userData.acquiredAt = performance.now();
    model.visible = true;
    this.active.set(key, model);
    return model;
  }

  releaseFlyaway(id) {
    const key = String(id);
    const model = this.active.get(key);
    if (!model) return;
    model.visible = false;
    model.userData.poolId = null;
    model.userData.acquiredAt = 0;
    model.userData.tailWorldNodes = null;
    this.active.delete(key);
  }

  peekForPrewarm() {
    return this.items[0] || null;
  }

  dispose() {
    for (const model of this.items) {
      this.parentGroup?.remove(model);
      model.userData.bodyMat?.dispose();
      model.userData.decalMat?.dispose();
      model.userData.tailMesh?.geometry?.dispose();
      model.userData.tailMesh?.material?.dispose();
      model.userData.hangingLine?.geometry?.dispose();
      model.userData.hangingLine?.material?.dispose();
    }
    this.items.length = 0;
    this.active.clear();
  }
}
