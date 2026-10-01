import * as THREE from 'three';
import { maneuverPose } from '../../engine/ManeuverVisuals.js';
import {
  createKitePaperCanvas,
  getOrCreateKiteDecalTexture,
  createKiteNameTagSprite,
  updateKiteNameTagSprite,
  disposeHierarchy
} from './ThreeMaterials.js';
import { createMiniCrown3D } from './ThreeCharacters.js';

const _tempWorldAnchor = new THREE.Vector3();
const _tempLocalPos = new THREE.Vector3();

// Geometrias e materiais compartilhados de pipas
function createKiteShapeGeometry(w = 26, topH = 15, botH = 26, dihedral = 2.0) {
  const geo = new THREE.BufferGeometry();
  const cy = topH * 0.28;
  const positions = new Float32Array([
    0, topH, 0,
    0, cy, 0.4,
    0, -botH, 0,
    -w * 0.5, cy, -dihedral,
    w * 0.5, cy, -dihedral
  ]);
  const uvs = new Float32Array([
    0.5, 1.0,
    0.5, 0.62,
    0.5, 0.0,
    0.0, 0.62,
    1.0, 0.62
  ]);
  const indices = [
    0, 3, 1,
    0, 1, 4,
    1, 3, 2,
    1, 2, 4
  ];
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.userData = { isShared: true };
  return geo;
}

function createRaiaShapeGeometry(w = 32, topH = 17, botH = 17, dihedral = 2.6) {
  const geo = new THREE.BufferGeometry();
  const cy = 2.0;
  const positions = new Float32Array([
    0, topH, 0,
    0, cy, 0.5,
    0, -botH, 0,
    -w * 0.5, cy, -dihedral,
    w * 0.5, cy, -dihedral
  ]);
  const uvs = new Float32Array([
    0.5, 1.0,
    0.5, 0.5,
    0.5, 0.0,
    0.0, 0.5,
    1.0, 0.5
  ]);
  const indices = [
    0, 3, 1,
    0, 1, 4,
    1, 3, 2,
    1, 2, 4
  ];
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.userData = { isShared: true };
  return geo;
}

function createPeixinhoShapeGeometry(w = 20, topH = 11, botH = 24, dihedral = 1.6) {
  const geo = new THREE.BufferGeometry();
  const cy = topH * 0.25;
  const positions = new Float32Array([
    0, topH, 0,
    0, cy, 0.3,
    0, -botH, 0,
    -w * 0.5, cy, -dihedral,
    w * 0.5, cy, -dihedral
  ]);
  const uvs = new Float32Array([
    0.5, 1.0,
    0.5, 0.68,
    0.5, 0.0,
    0.0, 0.68,
    1.0, 0.68
  ]);
  const indices = [
    0, 3, 1,
    0, 1, 4,
    1, 3, 2,
    1, 2, 4
  ];
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  geo.userData = { isShared: true };
  return geo;
}

let _sharedKiteGeoTradicional = null;
export function getSharedTradicionalGeo() {
  if (!_sharedKiteGeoTradicional) {
    _sharedKiteGeoTradicional = createKiteShapeGeometry(26, 15, 26, 2.0);
  }
  return _sharedKiteGeoTradicional;
}

let _sharedKiteGeoRaia = null;
export function getSharedRaiaGeo() {
  if (!_sharedKiteGeoRaia) {
    _sharedKiteGeoRaia = createRaiaShapeGeometry(32, 17, 17, 2.6);
  }
  return _sharedKiteGeoRaia;
}

let _sharedKiteGeoPeixinho = null;
export function getSharedPeixinhoGeo() {
  if (!_sharedKiteGeoPeixinho) {
    _sharedKiteGeoPeixinho = createPeixinhoShapeGeometry(20, 11, 24, 1.6);
  }
  return _sharedKiteGeoPeixinho;
}

let _sharedCenterStickRaiaGeo = null;
let _sharedCenterStickPeixinhoGeo = null;
let _sharedCenterStickTradicionalGeo = null;
export function getSharedCenterStickGeo(isRaia, isPeixinho) {
  if (isRaia) {
    if (!_sharedCenterStickRaiaGeo) {
      _sharedCenterStickRaiaGeo = new THREE.CylinderGeometry(0.45, 0.45, 34, 6);
      _sharedCenterStickRaiaGeo.userData = { isShared: true };
    }
    return _sharedCenterStickRaiaGeo;
  }
  if (isPeixinho) {
    if (!_sharedCenterStickPeixinhoGeo) {
      _sharedCenterStickPeixinhoGeo = new THREE.CylinderGeometry(0.45, 0.45, 35, 6);
      _sharedCenterStickPeixinhoGeo.userData = { isShared: true };
    }
    return _sharedCenterStickPeixinhoGeo;
  }
  if (!_sharedCenterStickTradicionalGeo) {
    _sharedCenterStickTradicionalGeo = new THREE.CylinderGeometry(0.45, 0.45, 41, 6);
    _sharedCenterStickTradicionalGeo.userData = { isShared: true };
  }
  return _sharedCenterStickTradicionalGeo;
}

let _sharedCrossStickRaiaGeo = null;
let _sharedCrossStickPeixinhoGeo = null;
let _sharedCrossStickTradicionalGeo = null;
export function getSharedCrossStickGeo(isRaia, isPeixinho) {
  if (isRaia) {
    if (!_sharedCrossStickRaiaGeo) {
      const curvePoints = [];
      const crossW = 16, crossArch = 5.2, crossBaseY = 2.0;
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const x = -crossW + t * (crossW * 2);
        const y = crossBaseY - Math.pow(x / crossW, 2) * crossArch;
        curvePoints.push(new THREE.Vector3(x, y, 0.5));
      }
      _sharedCrossStickRaiaGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curvePoints), 10, 0.38, 5, false);
      _sharedCrossStickRaiaGeo.userData = { isShared: true };
    }
    return _sharedCrossStickRaiaGeo;
  }
  if (isPeixinho) {
    if (!_sharedCrossStickPeixinhoGeo) {
      const curvePoints = [];
      const crossW = 10, crossArch = 2.8, crossBaseY = 3.0;
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const x = -crossW + t * (crossW * 2);
        const y = crossBaseY - Math.pow(x / crossW, 2) * crossArch;
        curvePoints.push(new THREE.Vector3(x, y, 0.5));
      }
      _sharedCrossStickPeixinhoGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curvePoints), 10, 0.38, 5, false);
      _sharedCrossStickPeixinhoGeo.userData = { isShared: true };
    }
    return _sharedCrossStickPeixinhoGeo;
  }
  if (!_sharedCrossStickTradicionalGeo) {
    const curvePoints = [];
    const crossW = 13, crossArch = 3.6, crossBaseY = 4.2;
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      const x = -crossW + t * (crossW * 2);
      const y = crossBaseY - Math.pow(x / crossW, 2) * crossArch;
      curvePoints.push(new THREE.Vector3(x, y, 0.5));
    }
    _sharedCrossStickTradicionalGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(curvePoints), 10, 0.38, 5, false);
    _sharedCrossStickTradicionalGeo.userData = { isShared: true };
  }
  return _sharedCrossStickTradicionalGeo;
}

let _sharedCabrestoRaiaGeo = null;
let _sharedCabrestoPeixinhoGeo = null;
let _sharedCabrestoTradicionalGeo = null;
export function getSharedCabrestoGeo(isRaia, isPeixinho) {
  if (isRaia) {
    if (!_sharedCabrestoRaiaGeo) {
      const geo = new THREE.BufferGeometry();
      const cabTopY = 15, cabBotY = -15, cabSideX = 15, crossBaseY = 2.0;
      const verts = new Float32Array([
        0, cabTopY, 0.5,    0, 0, 7.5,
        -cabSideX, crossBaseY, 0.5,   0, 0, 7.5,
        cabSideX, crossBaseY, 0.5,    0, 0, 7.5,
        0, cabBotY, 0.5,   0, 0, 7.5
      ]);
      geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      geo.userData = { isShared: true };
      _sharedCabrestoRaiaGeo = geo;
    }
    return _sharedCabrestoRaiaGeo;
  }
  if (isPeixinho) {
    if (!_sharedCabrestoPeixinhoGeo) {
      const geo = new THREE.BufferGeometry();
      const cabTopY = 10, cabBotY = -20, cabSideX = 9, crossBaseY = 3.0;
      const verts = new Float32Array([
        0, cabTopY, 0.5,    0, 0, 7.5,
        -cabSideX, crossBaseY, 0.5,   0, 0, 7.5,
        cabSideX, crossBaseY, 0.5,    0, 0, 7.5,
        0, cabBotY, 0.5,   0, 0, 7.5
      ]);
      geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      geo.userData = { isShared: true };
      _sharedCabrestoPeixinhoGeo = geo;
    }
    return _sharedCabrestoPeixinhoGeo;
  }
  if (!_sharedCabrestoTradicionalGeo) {
    const geo = new THREE.BufferGeometry();
    const cabTopY = 14, cabBotY = -18, cabSideX = 12, crossBaseY = 4.2;
    const verts = new Float32Array([
      0, cabTopY, 0.5,    0, 0, 7.5,
      -cabSideX, crossBaseY, 0.5,   0, 0, 7.5,
      cabSideX, crossBaseY, 0.5,    0, 0, 7.5,
      0, cabBotY, 0.5,   0, 0, 7.5
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
    geo.userData = { isShared: true };
    _sharedCabrestoTradicionalGeo = geo;
  }
  return _sharedCabrestoTradicionalGeo;
}

let _sharedBambooMat = null;
export function getSharedBambooMat() {
  if (!_sharedBambooMat) {
    _sharedBambooMat = new THREE.MeshStandardMaterial({ color: 0xdcb162, roughness: 0.85 });
    _sharedBambooMat.userData = { isShared: true };
  }
  return _sharedBambooMat;
}

let _sharedFiberMat = null;
export function getSharedFiberMat() {
  if (!_sharedFiberMat) {
    _sharedFiberMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
    _sharedFiberMat.userData = { isShared: true };
  }
  return _sharedFiberMat;
}

let _sharedCabrestoMat = null;
export function getSharedCabrestoMat() {
  if (!_sharedCabrestoMat) {
    _sharedCabrestoMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 });
    _sharedCabrestoMat.userData = { isShared: true };
  }
  return _sharedCabrestoMat;
}

let _sharedAuraGeo = null;
let _sharedAuraMat = null;
export function getSharedAura() {
  if (!_sharedAuraGeo) {
    _sharedAuraGeo = new THREE.RingGeometry(18, 22, 20);
    _sharedAuraGeo.userData = { isShared: true };
  }
  if (!_sharedAuraMat) {
    _sharedAuraMat = new THREE.MeshBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    _sharedAuraMat.userData = { isShared: true };
  }
  return { geo: _sharedAuraGeo, mat: _sharedAuraMat };
}

let _sharedShieldGeo = null;
let _sharedShieldMat = null;
export function getSharedShield() {
  if (!_sharedShieldGeo) {
    _sharedShieldGeo = new THREE.SphereGeometry(22, 14, 10);
    _sharedShieldGeo.userData = { isShared: true };
  }
  if (!_sharedShieldMat) {
    _sharedShieldMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
      wireframe: true,
      depthWrite: false
    });
    _sharedShieldMat.userData = { isShared: true };
  }
  return { geo: _sharedShieldGeo, mat: _sharedShieldMat };
}

let _sharedTornadoGeo = null;
let _sharedTornadoMat = null;
export function getSharedTornado() {
  if (!_sharedTornadoGeo) {
    _sharedTornadoGeo = new THREE.CylinderGeometry(26, 8, 42, 12, 1, true);
    _sharedTornadoGeo.userData = { isShared: true };
  }
  if (!_sharedTornadoMat) {
    _sharedTornadoMat = new THREE.MeshBasicMaterial({
      color: 0xa855f7,
      transparent: true,
      opacity: 0.35,
      wireframe: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    _sharedTornadoMat.userData = { isShared: true };
  }
  return { geo: _sharedTornadoGeo, mat: _sharedTornadoMat };
}

let _sharedFitilhoRaiaGeo = null;
let _sharedFitilhoNormalGeo = null;
export function getSharedFitilhoGeo(isRaia) {
  if (isRaia) {
    if (!_sharedFitilhoRaiaGeo) {
      _sharedFitilhoRaiaGeo = new THREE.PlaneGeometry(8.5, 2.2);
      _sharedFitilhoRaiaGeo.userData = { isShared: true };
    }
    return _sharedFitilhoRaiaGeo;
  }
  if (!_sharedFitilhoNormalGeo) {
    _sharedFitilhoNormalGeo = new THREE.PlaneGeometry(6.8, 2.2);
    _sharedFitilhoNormalGeo.userData = { isShared: true };
  }
  return _sharedFitilhoNormalGeo;
}

const _sharedFitilhoMats = new Map();
export function getSharedFitilhoMat(colorHex) {
  if (!_sharedFitilhoMats.has(colorHex)) {
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      roughness: 0.45
    });
    mat.userData = { isShared: true };
    _sharedFitilhoMats.set(colorHex, mat);
  }
  return _sharedFitilhoMats.get(colorHex);
}

let _sharedDecalPeixinhoGeo = null;
let _sharedDecalNormalGeo = null;
export function getSharedDecalGeo(isPeixinho) {
  if (isPeixinho) {
    if (!_sharedDecalPeixinhoGeo) {
      _sharedDecalPeixinhoGeo = new THREE.CircleGeometry(4.2, 16);
      _sharedDecalPeixinhoGeo.userData = { isShared: true };
    }
    return _sharedDecalPeixinhoGeo;
  }
  if (!_sharedDecalNormalGeo) {
    _sharedDecalNormalGeo = new THREE.CircleGeometry(5.0, 16);
    _sharedDecalNormalGeo.userData = { isShared: true };
  }
  return _sharedDecalNormalGeo;
}

let _sharedHpBoxGeo = null;
export function getSharedHpBoxGeo() {
  if (!_sharedHpBoxGeo) {
    _sharedHpBoxGeo = new THREE.BoxGeometry(1, 1, 1);
    _sharedHpBoxGeo.userData = { isShared: true };
  }
  return _sharedHpBoxGeo;
}

let _sharedHpSphereGeo = null;
export function getSharedHpSphereGeo() {
  if (!_sharedHpSphereGeo) {
    _sharedHpSphereGeo = new THREE.SphereGeometry(1, 8, 8);
    _sharedHpSphereGeo.userData = { isShared: true };
  }
  return _sharedHpSphereGeo;
}

let _sharedHpBgMat = null;
export function getSharedHpBgMat() {
  if (!_sharedHpBgMat) {
    _sharedHpBgMat = new THREE.MeshBasicMaterial({ color: 0x050f1a, transparent: true, opacity: 0.88, depthWrite: false });
    _sharedHpBgMat.userData = { isShared: true };
  }
  return _sharedHpBgMat;
}

let _sharedHpBorderMat = null;
export function getSharedHpBorderMat() {
  if (!_sharedHpBorderMat) {
    _sharedHpBorderMat = new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.9, depthWrite: false });
    _sharedHpBorderMat.userData = { isShared: true };
  }
  return _sharedHpBorderMat;
}

export function createKiteModel3D(themeColorHex = 0xff5722, patternIndex = 0, secondaryColorHex = null, kiteModelType = 'tradicional') {
  const group = new THREE.Group();

  const pColor = themeColorHex || 0xff5722;
  const sColor = secondaryColorHex || ((pColor ^ 0x00ffff) | 0x330033);
  const paperTex = createKitePaperCanvas(pColor, sColor, patternIndex);

  const isRaia = kiteModelType === 'raia';
  const isPeixinho = kiteModelType === 'peixinho';
  const kiteGeo = isRaia
    ? getSharedRaiaGeo()
    : isPeixinho
      ? getSharedPeixinhoGeo()
      : getSharedTradicionalGeo();

  const kiteMat = new THREE.MeshStandardMaterial({
    map: paperTex,
    color: 0xffffff,
    side: THREE.DoubleSide,
    roughness: 0.38,
    metalness: 0.04,
    transparent: true,
    opacity: 0.96
  });
  const kiteMesh = new THREE.Mesh(kiteGeo, kiteMat);
  kiteMesh.castShadow = true;
  group.add(kiteMesh);

  // Vareta Central de Bambu
  const centerStickY = isRaia ? 0 : isPeixinho ? -6.5 : -5.5;
  const centerStickGeo = getSharedCenterStickGeo(isRaia, isPeixinho);
  const centerStick = new THREE.Mesh(centerStickGeo, getSharedBambooMat());
  centerStick.position.set(0, centerStickY, 0.4);
  group.add(centerStick);

  // Vareta Arqueada Transversal (Fibra)
  const crossStickGeo = getSharedCrossStickGeo(isRaia, isPeixinho);
  const crossStick = new THREE.Mesh(crossStickGeo, getSharedFiberMat());
  group.add(crossStick);

  // Cabresto 3D
  const cabrestoGeo = getSharedCabrestoGeo(isRaia, isPeixinho);
  const cabresto = new THREE.LineSegments(cabrestoGeo, getSharedCabrestoMat());
  group.add(cabresto);

  // Decalque com Foto/Inicial
  const decalGeo = getSharedDecalGeo(isPeixinho);
  const decalMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const decal = new THREE.Mesh(decalGeo, decalMat);
  decal.position.set(0, 1.2, 0.65);
  group.add(decal);

  // Coroa do Rei da Laje
  const crown = createMiniCrown3D();
  crown.scale.set(0.85, 0.85, 0.85);
  crown.position.set(0, 25.5, 1.5);
  crown.visible = false;
  group.add(crown);

  // Aura Luminosa de Streak / Líder
  const { geo: auraGeo, mat: auraMat } = getSharedAura();
  const aura = new THREE.Mesh(auraGeo, auraMat);
  aura.position.set(0, -6, -0.2);
  aura.visible = false;
  group.add(aura);

  // Rabiola 3D Dinâmica (Física flexível com BufferGeometry atualizável)
  const tailGroup = new THREE.Group();
  const tailBaseY = isRaia ? -17 : isPeixinho ? -24 : -26;
  tailGroup.position.set(0, tailBaseY, 0);

  const numNodes = isRaia ? 5 : isPeixinho ? 16 : 14;
  const tailNodes = [];
  const fitilhos = [];
  const tailColors = [0xff0055, 0xffd700, 0x00f0ff, 0x111111, 0x00e676, 0xff9100];
  const fitilhoGeo = getSharedFitilhoGeo(isRaia);

  const tailPositions = new Float32Array(numNodes * 3);
  for (let i = 0; i < numNodes; i++) {
    const ny = -i * 5.2;
    tailNodes.push(new THREE.Vector3(0, ny, 0));
    tailPositions[i * 3] = 0;
    tailPositions[i * 3 + 1] = ny;
    tailPositions[i * 3 + 2] = 0;

    if (i > 0 && (i % 2 === 1 || (isRaia && i === 2))) {
      const fCol = tailColors[(i + (patternIndex || 0)) % tailColors.length];
      const fMat = getSharedFitilhoMat(fCol);
      const fMesh = new THREE.Mesh(fitilhoGeo, fMat);
      tailGroup.add(fMesh);
      fitilhos.push({ mesh: fMesh, nodeIdx: i });
    }
  }

  const tailGeo = new THREE.BufferGeometry();
  tailGeo.setAttribute('position', new THREE.BufferAttribute(tailPositions, 3));
  const tailMat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85
  });
  const tailMesh = new THREE.Line(tailGeo, tailMat);
  tailGroup.add(tailMesh);
  group.add(tailGroup);

  // Escudo 3D
  const { geo: shieldGeo, mat: shieldMat } = getSharedShield();
  const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
  shieldMesh.visible = false;
  group.add(shieldMesh);

  // Vórtice Tornado 3D
  const { geo: tornadoGeo, mat: tornadoMat } = getSharedTornado();
  const tornadoMesh = new THREE.Mesh(tornadoGeo, tornadoMat);
  tornadoMesh.position.y = -8;
  tornadoMesh.visible = false;
  group.add(tornadoMesh);

  // Barra de Sangue / HP 3D
  const hpGroup = new THREE.Group();
  hpGroup.position.set(0, isRaia ? -20 : isPeixinho ? -25 : -24, 1.2);

  const hpBarWidth = 14;
  const hpBarHeight = 1.6;
  const hpBarDepth = 0.5;

  const hpBg = new THREE.Mesh(getSharedHpBoxGeo(), getSharedHpBgMat());
  hpBg.scale.set(hpBarWidth + 0.8, hpBarHeight + 0.5, hpBarDepth);
  hpGroup.add(hpBg);

  const hpBorder = new THREE.Mesh(getSharedHpBoxGeo(), getSharedHpBorderMat());
  hpBorder.scale.set(hpBarWidth + 1.2, hpBarHeight + 0.9, hpBarDepth * 0.8);
  hpBorder.position.z = -0.05;
  hpGroup.add(hpBorder);

  const hpFillMat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });
  const hpFill = new THREE.Mesh(getSharedHpBoxGeo(), hpFillMat);
  hpFill.scale.set(hpBarWidth, hpBarHeight, hpBarDepth * 1.1);
  hpFill.position.z = 0.1;
  hpGroup.add(hpFill);

  const hpIconMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    transparent: true,
    opacity: 0.95,
    depthWrite: false
  });
  const hpIcon = new THREE.Mesh(getSharedHpSphereGeo(), hpIconMat);
  hpIcon.scale.set(0.9, 1.1, 0.9);
  hpIcon.position.set(-hpBarWidth * 0.5 - 1.2, 0, 0.15);
  hpGroup.add(hpIcon);

  group.add(hpGroup);

  group.userData = {
    kiteMesh,
    kiteMat,
    centerStick,
    crossStick,
    cabresto,
    decal,
    decalMat,
    crown,
    aura,
    shieldMesh,
    tornadoMesh,
    tailGroup,
    tailNodes,
    fitilhos,
    tailMesh,
    hpGroup,
    hpFill,
    hpFillMat,
    hpIcon,
    hpIconMat,
    hpBarWidth,
    targetWorldPos: new THREE.Vector3(),
    currentWorldPos: new THREE.Vector3(),
    roll: 0,
    pitch: 0,
    yaw: 0,
    spinAngle: 0,
    trailTimer: 0
  };

  return group;
}

export class ThreeKites {
  constructor() {
    this.kites3D = new Map();
    this.fallingKites3D = new Map();
    this.group = new THREE.Group();
  }

  get(uidStr) {
    return this.kites3D.get(uidStr);
  }

  has(uidStr) {
    return this.kites3D.has(uidStr);
  }

  getOrCreateKite(uidStr, kite, patternIndex = 0) {
    let k3d = this.kites3D.get(uidStr);
    if (!k3d) {
      k3d = createKiteModel3D(kite.bodyColor || 0xff5722, patternIndex, null, kite.kiteType || 'tradicional');
      const tagSprite = createKiteNameTagSprite(kite.nickname, kite.isKing, kite.isLeader);
      k3d.add(tagSprite);
      k3d.userData.nameTag = tagSprite;

      this.group.add(k3d);
      this.kites3D.set(uidStr, k3d);
    }
    return k3d;
  }

  syncKite(uidStr, kite, idx, screenToWorldFn, lajeWorldY, bonecoX, time, delta, wind, isPortrait, customKiteScale) {
    const k3d = this.getOrCreateKite(uidStr, kite, idx);

    // 1. Atualização do Decalque e NameTag
    const normDecalUrl = String(kite.profilePictureUrl || '').trim();
    const expectedDecalKey = `${normDecalUrl || kite.nickname || 'p'}_${kite.bodyColor}_${kite.isKing ? 1 : 0}_${kite.isLeader ? 1 : 0}`;
    if (k3d.userData.currentDecalKey !== expectedDecalKey) {
      const decalTex = getOrCreateKiteDecalTexture(kite.nickname, kite.profilePictureUrl, kite.bodyColor, kite.isKing, kite.isLeader);
      k3d.userData.decal.material.map = decalTex;
      k3d.userData.decal.material.needsUpdate = true;
      k3d.userData.currentDecalKey = expectedDecalKey;
    }

    const expectedTagKey = `${kite.nickname || 'p'}_${kite.isKing ? 1 : 0}_${kite.isLeader ? 1 : 0}`;
    if (k3d.userData.currentTagKey !== expectedTagKey) {
      if (!k3d.userData.nameTag) {
        const tagSprite = createKiteNameTagSprite(kite.nickname, kite.isKing, kite.isLeader);
        k3d.add(tagSprite);
        k3d.userData.nameTag = tagSprite;
      } else {
        updateKiteNameTagSprite(k3d.userData.nameTag, kite.nickname, kite.isKing, kite.isLeader);
      }
      k3d.userData.currentTagKey = expectedTagKey;
    }

    // 2. Posicionamento 3D no céu e decolagem física
    const depthOffset = (idx % 5) * 8 - 16;
    const swayTime = time * 2.2 + idx * 1.35;
    const windDriftX = Math.sin(swayTime) * 6;
    const windDriftY = Math.cos(swayTime * 0.8) * 4;
    const windDriftZ = Math.sin(swayTime * 0.6) * 4;

    const kitePos3D = screenToWorldFn(kite.x, kite.y, depthOffset);

    if (!k3d.userData.spawnTime) k3d.userData.spawnTime = time;
    const age = time - k3d.userData.spawnTime;
    const isAscendingVisual = Boolean(kite.isAscending || age < 1.8);
    if (isAscendingVisual && age < 2.0) {
      const t = Math.min(1, Math.max(0, age / 1.8));
      const easeOut = 1 - Math.pow(1 - t, 3);
      const startY = lajeWorldY + 24;
      const startZ = 430;
      const curX = bonecoX + (kitePos3D.x + windDriftX - bonecoX) * easeOut;
      const curY = startY + (kitePos3D.y + windDriftY - startY) * easeOut;
      const curZ = startZ + (kitePos3D.z + windDriftZ - startZ) * easeOut;
      k3d.position.set(curX, curY, curZ);
    } else {
      k3d.position.set(kitePos3D.x + windDriftX, kitePos3D.y + windDriftY, kitePos3D.z + windDriftZ);
    }

    // 3. Orientação 3D (Pitch, Roll, Yaw) reagindo a manobras
    const pose = maneuverPose(kite.maneuver, time);
    const vx = Number(kite.vx || 0), vy = Number(kite.vy || 0);
    const basePitch = -Math.min(0.55, Math.max(-0.55, vy * 0.045));
    const baseRoll = Math.min(0.65, Math.max(-0.65, vx * 0.04));

    k3d.rotation.x = pose.pitch3D !== 0 ? pose.pitch3D : basePitch;
    if (pose.spin3D) {
      k3d.userData.spinAngle = (k3d.userData.spinAngle || 0) + 0.38;
      k3d.rotation.z = k3d.userData.spinAngle;
    } else {
      k3d.rotation.z = -(pose.roll3D !== 0 ? pose.roll3D : (pose.angle || baseRoll));
    }
    k3d.rotation.y = (pose.yaw3D !== 0 ? pose.yaw3D : 0) + (wind ? wind.x * 0.14 : 0);

    // Reação aerodinâmica de combate: a pipa estremece com o atrito violento das linhas
    if (kite.isInCombat) {
      const combatJitter = Math.sin(time * 36 + idx * 2.1) * 0.08;
      k3d.rotation.z += combatJitter;
      k3d.rotation.x += Math.cos(time * 28 + idx) * 0.06;
    }

    const targetKiteScale = customKiteScale !== undefined ? customKiteScale : (isPortrait ? 1.55 : 1.25);
    const baseScale = isPortrait ? targetKiteScale : (targetKiteScale * 0.8);
    const finalScale = (pose.scale || 1) * baseScale;
    k3d.scale.set(finalScale, finalScale, finalScale);

    // 4. Coroa do Rei da Laje
    k3d.userData.crown.visible = Boolean(kite.isKing || kite.isLeader);
    if (k3d.userData.crown.visible) {
      k3d.userData.crown.rotation.y = time * 2.5;
    }

    // 5. Aura de Streak
    k3d.userData.aura.visible = Boolean(kite.isLeader || (kite.streak && kite.streak >= 2));
    if (k3d.userData.aura.visible) {
      const auraPulse = 1 + Math.sin(time * 6.5) * 0.08;
      k3d.userData.aura.scale.set(auraPulse, auraPulse, auraPulse);
    }

    // 6. Escudo / Proteção 3D
    const hasShield = Boolean(kite.shieldCount > 0 || kite.isInvulnerable);
    if (k3d.userData.shieldMesh) {
      k3d.userData.shieldMesh.visible = hasShield;
      if (hasShield) {
        k3d.userData.shieldMesh.rotation.y += 0.04 * (delta || 1);
        k3d.userData.shieldMesh.rotation.x = Math.sin(time * 3) * 0.15;
      }
    }

    // 7. Vórtice Tornado 3D
    const hasTornado = Boolean(kite.specials && kite.specials.tornado > 0);
    if (k3d.userData.tornadoMesh) {
      k3d.userData.tornadoMesh.visible = hasTornado;
      if (hasTornado) {
        k3d.userData.tornadoMesh.rotation.y += 0.18 * (delta || 1);
      }
    }

    // 8. Barra de HP 3D
    if (k3d.userData.hpGroup) {
      k3d.userData.hpGroup.quaternion.copy(k3d.quaternion).invert();

      const hpRatio = Math.max(0, Math.min(1, (kite.lineHP !== undefined ? kite.lineHP : 100) / (kite.maxLineHP || 100)));
      const fullW = k3d.userData.hpBarWidth || 14;
      const currentW = Math.max(0.01, fullW * hpRatio);

      k3d.userData.hpFill.scale.x = currentW;
      k3d.userData.hpFill.position.x = -fullW * 0.5 + currentW * 0.5;

      let hpColorHex = 0x10b981;
      if (hpRatio <= 0.3) {
        hpColorHex = (Math.sin(time * 14) > 0) ? 0xff0055 : 0xef4444;
      } else if (hpRatio <= 0.6) {
        hpColorHex = 0xf59e0b;
      }

      if (k3d.userData.hpFillMat) {
        k3d.userData.hpFillMat.color.setHex(hpColorHex);
      }

      if (k3d.userData.hpIcon && kite.isInCombat) {
        const bloodPulse = 0.9 + Math.sin(time * 16) * 0.35;
        k3d.userData.hpIcon.scale.set(bloodPulse, bloodPulse * 1.2, bloodPulse);
      }
    }

    // 9. Rabiola 3D como linha física viva (Verlet + Gravidade + Vento no World Space)
    ThreeKites.updateTailPhysics(
      k3d,
      wind,
      delta,
      time,
      kite.vx !== undefined ? kite.vx : 0,
      kite.vy !== undefined ? kite.vy : 0
    );

    return k3d;
  }

  /**
   * Simula a rabiola como uma corda física (Verlet Rope Physics) no espaço mundial 3D,
   * reagindo à gravidade mundial, ao vento aerodinâmico e à inércia dos movimentos.
   */
  static updateTailPhysics(k3d, wind, delta, time, kiteVx = 0, kiteVy = 0) {
    if (!k3d || !k3d.userData) return;
    const { tailGroup, tailNodes, fitilhos, tailMesh } = k3d.userData;
    if (!tailGroup || !tailNodes || !tailNodes.length || !tailMesh?.geometry) return;

    // Inicializa nós no espaço mundial (World Space) se ainda não existirem
    if (!k3d.userData.tailWorldNodes || k3d.userData.tailWorldNodes.length !== tailNodes.length) {
      k3d.userData.tailWorldNodes = [];
      tailGroup.getWorldPosition(_tempWorldAnchor);
      for (let i = 0; i < tailNodes.length; i++) {
        k3d.userData.tailWorldNodes.push({
          x: _tempWorldAnchor.x,
          y: _tempWorldAnchor.y - i * 5.2,
          z: _tempWorldAnchor.z,
          prevX: _tempWorldAnchor.x,
          prevY: _tempWorldAnchor.y - i * 5.2,
          prevZ: _tempWorldAnchor.z
        });
      }
    }

    const worldNodes = k3d.userData.tailWorldNodes;
    tailGroup.getWorldPosition(_tempWorldAnchor);

    // Nó 0 sempre ancorado na base da pipa no mundo
    worldNodes[0].x = _tempWorldAnchor.x;
    worldNodes[0].y = _tempWorldAnchor.y;
    worldNodes[0].z = _tempWorldAnchor.z;
    worldNodes[0].prevX = _tempWorldAnchor.x;
    worldNodes[0].prevY = _tempWorldAnchor.y;
    worldNodes[0].prevZ = _tempWorldAnchor.z;

    const safeDt = Math.max(0.005, Math.min(0.05, (Number(delta) || 1) / 60));
    const wX = (Number.isFinite(wind?.x) ? wind.x : 0) * 36.0;
    const wZ = Number.isFinite(wind?.z) ? wind.z : (Number.isFinite(wind?.y) ? wind.y * 14.0 : 0);
    const gravityY = -34.0; // gravidade mundial puxando a fita para baixo
    const damping = 0.88; // amortecimento do ar na fita

    // 1. Passo de integração Verlet (gravidade, vento e turbulência flutter)
    for (let i = 1; i < worldNodes.length; i++) {
      const node = worldNodes[i];
      const vx = (node.x - node.prevX) * damping;
      const vy = (node.y - node.prevY) * damping;
      const vz = (node.z - node.prevZ) * damping;

      node.prevX = node.x;
      node.prevY = node.y;
      node.prevZ = node.z;

      // Flutter de plástico tremulando no vento
      const flutterX = Math.sin(time * 12.0 - i * 0.58) * (1.8 + i * 0.22);
      const flutterZ = Math.cos(time * 9.8 - i * 0.48) * (1.3 + i * 0.16);

      const ax = wX + flutterX - (kiteVx * 0.35);
      const ay = gravityY;
      const az = wZ + flutterZ;

      node.x += vx + ax * safeDt * safeDt * 30.0;
      node.y += vy + ay * safeDt * safeDt * 30.0;
      node.z += vz + az * safeDt * safeDt * 30.0;
    }

    // 2. Restrições inelásticas de distância de corda (Distance Constraints - 4 iterações)
    const segSpacing = 5.2;
    for (let it = 0; it < 4; it++) {
      for (let i = 0; i < worldNodes.length - 1; i++) {
        const n1 = worldNodes[i];
        const n2 = worldNodes[i + 1];

        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dz = n2.z - n1.z;
        const dist = Math.hypot(dx, dy, dz) || 0.001;
        const diff = (dist - segSpacing) / dist;

        if (i === 0) {
          // Nó 0 fixo na âncora da pipa
          n2.x -= dx * diff;
          n2.y -= dy * diff;
          n2.z -= dz * diff;
        } else {
          n1.x += dx * 0.5 * diff;
          n1.y += dy * 0.5 * diff;
          n1.z += dz * 0.5 * diff;
          n2.x -= dx * 0.5 * diff;
          n2.y -= dy * 0.5 * diff;
          n2.z -= dz * 0.5 * diff;
        }
      }
    }

    // 3. Projeção dos nós mundiais para coordenadas locais de tailGroup
    const posAttr = tailMesh.geometry.attributes.position;
    if (posAttr && posAttr.array) {
      const arr = posAttr.array;
      for (let i = 0; i < worldNodes.length; i++) {
        _tempLocalPos.set(worldNodes[i].x, worldNodes[i].y, worldNodes[i].z);
        tailGroup.worldToLocal(_tempLocalPos);

        tailNodes[i].copy(_tempLocalPos);
        arr[i * 3] = _tempLocalPos.x;
        arr[i * 3 + 1] = _tempLocalPos.y;
        arr[i * 3 + 2] = _tempLocalPos.z;
      }
      posAttr.needsUpdate = true;
    }

    // 4. Fitilhos coloridos orientados pela curva e tremulando no fluxo
    if (fitilhos && fitilhos.length) {
      for (let f = 0; f < fitilhos.length; f++) {
        const item = fitilhos[f];
        const nodeIdx = item.nodeIdx;
        const curr = tailNodes[nodeIdx];
        const prev = tailNodes[nodeIdx - 1] || curr;

        if (curr) {
          item.mesh.position.set(curr.x, curr.y, curr.z);

          const dx = curr.x - prev.x;
          const dy = curr.y - prev.y;
          const dz = curr.z - prev.z;
          const len = Math.hypot(dx, dy, dz) || 1;

          const fWave = time * 8.5 + f * 1.5;
          item.mesh.rotation.z = Math.atan2(dy, dx) + Math.PI / 2 + Math.sin(fWave) * 0.45;
          item.mesh.rotation.x = Math.atan2(dz, len) + Math.cos(fWave * 0.75) * 0.35;
        }
      }
    }
  }

  syncFallingKites(fallingKitesList, screenToWorldFn, maxLajeWorldY, delta) {
    const activeFkIds = new Set();
    if (fallingKitesList && fallingKitesList.length) {
      for (const fk of fallingKitesList) {
        const fId = String(fk.id || fk.userId || (fk.kiteData && fk.kiteData.userId) || ('fk_' + Math.round(fk.x) + '_' + Math.round(fk.y)));
        activeFkIds.add(fId);

        let fk3d = this.fallingKites3D.get(fId);
        if (!fk3d) {
          fk3d = createKiteModel3D(fk.bodyColor || (fk.kiteData && fk.kiteData.bodyColor) || 0xff6633);
          this.group.add(fk3d);
          this.fallingKites3D.set(fId, fk3d);
        }

        const fkWorld = screenToWorldFn(fk.x, fk.y, 20);
        if (fkWorld.y < maxLajeWorldY) {
          activeFkIds.delete(fId);
          continue;
        }

        fk3d.position.set(fkWorld.x, fkWorld.y, fkWorld.z);
        fk3d.rotation.z += 0.08 * (delta || 1);
        fk3d.rotation.x += 0.05 * (delta || 1);
        fk3d.rotation.y += 0.06 * (delta || 1);
      }
    }

    for (const [fId, fk3d] of this.fallingKites3D.entries()) {
      if (!activeFkIds.has(fId)) {
        this.group.remove(fk3d);
        disposeHierarchy(fk3d);
        this.fallingKites3D.delete(fId);
      }
    }
  }

  pruneInactive(activeUserIds) {
    for (const [userId, k3d] of this.kites3D.entries()) {
      if (!activeUserIds.has(String(userId))) {
        this.group.remove(k3d);
        disposeHierarchy(k3d);
        this.kites3D.delete(userId);
      }
    }
  }

  dispose() {
    for (const [userId, k3d] of this.kites3D.entries()) {
      this.group.remove(k3d);
      disposeHierarchy(k3d);
    }
    this.kites3D.clear();

    for (const [fId, fk3d] of this.fallingKites3D.entries()) {
      this.group.remove(fk3d);
      disposeHierarchy(fk3d);
    }
    this.fallingKites3D.clear();
  }
}

const POOL_TAIL_COLORS = [0xff0055, 0xffd700, 0x00f0ff, 0x111111, 0x00e676, 0xff9100];

export function configureKiteModelType3D(model, type = 'tradicional', patternIndex = 0) {
  if (!model?.userData?.poolGeometries) return model;
  const normalized = type === 'raia' ? 'raia' : type === 'peixinho' ? 'peixinho' : 'tradicional';
  const cfg = model.userData.poolGeometries[normalized];
  model.userData.kiteMesh.geometry = cfg.body;
  model.userData.centerStick.geometry = cfg.center;
  model.userData.centerStick.position.y = cfg.centerY;
  model.userData.crossStick.geometry = cfg.cross;
  model.userData.cabresto.geometry = cfg.cabresto;
  model.userData.decal.geometry = cfg.decal;
  model.userData.tailGroup.position.y = cfg.tailY;
  model.userData.hpGroup.position.y = cfg.hpY;
  model.userData.tailMesh.geometry.setDrawRange(0, cfg.tailCount);
  model.userData.activeTailNodeCount = cfg.tailCount;

  const nodeIndices = normalized === 'raia'
    ? [2]
    : Array.from({ length: Math.floor(cfg.tailCount / 2) }, (_, i) => i * 2 + 1)
      .filter(nodeIdx => nodeIdx < cfg.tailCount);
  model.userData.fitilhos.forEach((item, index) => {
    const nodeIdx = nodeIndices[index];
    item.mesh.visible = Number.isInteger(nodeIdx);
    if (!Number.isInteger(nodeIdx)) return;
    item.nodeIdx = nodeIdx;
    item.mesh.geometry = normalized === 'raia'
      ? model.userData.poolFitilhoGeometries.raia
      : model.userData.poolFitilhoGeometries.normal;
    item.mesh.material = model.userData.poolFitilhoMats[
      (nodeIdx + Math.abs(Number(patternIndex) || 0)) % model.userData.poolFitilhoMats.length
    ];
  });
  model.userData.kiteModelType = normalized;
  return model;
}

export function createPoolReadyKiteModel3D() {
  const poolGeometries = {
    tradicional: {
      body: getSharedTradicionalGeo(),
      center: getSharedCenterStickGeo(false, false),
      cross: getSharedCrossStickGeo(false, false),
      cabresto: getSharedCabrestoGeo(false, false),
      decal: getSharedDecalGeo(false),
      centerY: -5.5, tailY: -26, hpY: -24, tailCount: 14
    },
    raia: {
      body: getSharedRaiaGeo(),
      center: getSharedCenterStickGeo(true, false),
      cross: getSharedCrossStickGeo(true, false),
      cabresto: getSharedCabrestoGeo(true, false),
      decal: getSharedDecalGeo(false),
      centerY: 0, tailY: -17, hpY: -20, tailCount: 5
    },
    peixinho: {
      body: getSharedPeixinhoGeo(),
      center: getSharedCenterStickGeo(false, true),
      cross: getSharedCrossStickGeo(false, true),
      cabresto: getSharedCabrestoGeo(false, true),
      decal: getSharedDecalGeo(true),
      centerY: -6.5, tailY: -24, hpY: -25, tailCount: 16
    }
  };
  const poolFitilhoGeometries = {
    normal: getSharedFitilhoGeo(false),
    raia: getSharedFitilhoGeo(true)
  };
  const poolFitilhoMats = POOL_TAIL_COLORS.map(color => getSharedFitilhoMat(color));
  const model = createKiteModel3D(0xff5722, 0, null, 'peixinho');
  model.userData.poolReady = true;
  model.userData.poolGeometries = poolGeometries;
  model.userData.poolFitilhoGeometries = poolFitilhoGeometries;
  model.userData.poolFitilhoMats = poolFitilhoMats;
  configureKiteModelType3D(model, 'tradicional', 0);
  return model;
}
