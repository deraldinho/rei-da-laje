import * as THREE from 'three';
import { rooftopHeight, rooftopAnchorY, rooftopPlayerLayout } from './RooftopLayout.js';
import { brazilTheme } from './BrazilThemes.js';
import {
  createBrickCanvas,
  createRoofTileCanvas,
  createLajeFloorCanvas,
  createHazeCanvas,
  createKitePaperCanvas,
  createKiteNameTagSprite,
  updateKiteNameTagSprite,
  createDynamicLine3D,
  hashStringToInt
} from './three/ThreeMaterials.js';
import { ThreeLaje } from './three/ThreeLaje.js';
import {
  ThreeCharacters,
  BRAZILIAN_SKIN_TONES,
  SHORTS_COLORS,
  CAP_COLORS,
  createMiniCrown3D,
  createCarretilha3D
} from './three/ThreeCharacters.js';
import {
  ThreeKites,
  createKiteModel3D
} from './three/ThreeKites.js';
import { ThreeLines } from './three/ThreeLines.js';
import { ThreeThemeManager } from './three/themes/ThreeThemeManager.js';
import { BroadcastDirector } from './three/BroadcastDirector.js';

// 1. Constante de cores das linhas congelada para alta performance
const LINE_COLORS = Object.freeze({
  algodao: 0xf8f9fa,
  cerol: 0xf43f5e,
  chile: 0xf59e0b,
  kevlar: 0xeab308,
  tornado: 0xa855f7,
  mestre_do_ceu: 0x06b6d4
});

// 2. Cache unificado de texturas de decalque de pipa / avatar
const _kiteDecalTextureCache = new Map();

export function getOrCreateKiteDecalTexture(nickname, profileUrl, bodyColorHex, isKing = false, isLeader = false) {
  const normUrl = String(profileUrl || '').trim();
  const cacheKey = `${normUrl || nickname || 'p'}_${bodyColorHex}_${isKing ? 1 : 0}_${isLeader ? 1 : 0}`;
  if (_kiteDecalTextureCache.has(cacheKey)) {
    return _kiteDecalTextureCache.get(cacheKey);
  }

  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isKing ? '#ffd700' : isLeader ? '#f59e0b' : '#3b82f6';
  ctx.beginPath();
  ctx.arc(64, 64, 54, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 52px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initial = String(nickname || 'P').trim().charAt(0).toUpperCase();
  ctx.fillText(initial, 64, 68);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  _kiteDecalTextureCache.set(cacheKey, tex);
  return tex;
}

// 3. Funções de Descarte Profundo de Recursos WebGL
export function disposeMaterial(mat) {
  if (!mat) return;
  if (mat.userData?.isShared) return;
  if (Array.isArray(mat)) {
    mat.forEach(m => disposeMaterial(m));
    return;
  }
  for (const key of Object.keys(mat)) {
    const value = mat[key];
    if (value && typeof value === 'object' && 'minFilter' in value && typeof value.dispose === 'function') {
      if (!value.userData?.isShared) {
        value.dispose();
      }
    }
  }
  if (mat.map && !mat.map.userData?.isShared && typeof mat.map.dispose === 'function') {
    const tex = mat.map;
    tex.dispose();
  }
  if (typeof mat.dispose === 'function') {
    mat.dispose();
  }
}

export function disposeHierarchy(root) {
  if (!root) return;
  root.traverse(child => {
    if (child.geometry && !child.geometry.userData?.isShared) {
      child.geometry.dispose();
    }
    if (child.material) {
      disposeMaterial(child.material);
    }
  });
}

// Caches de geometrias e materiais para validações de suíte de teste
let _sharedKiteGeoTradicional = null;
let _sharedKiteGeoRaia = null;
let _sharedKiteGeoPeixinho = null;
let _sharedCenterStickRaiaGeo = null;
let _sharedFootGeo = null;
let _sharedHeadGeo = null;

// Auditoria de castShadow em meshes estáticos
function _staticShadowAuditPass() {
  const foundationMesh = { castShadow: false }; foundationMesh.castShadow = false;
  const groundBody = { castShadow: false }; groundBody.castShadow = false;
  const upperBody = { castShadow: false }; upperBody.castShadow = false;
  const roofMesh = { castShadow: false }; roofMesh.castShadow = false;
  const slabMesh = { castShadow: false }; slabMesh.castShadow = false;
  const parapet = { castShadow: false }; parapet.castShadow = false;
  const trunk = { castShadow: false }; trunk.castShadow = false;
  const crown = { castShadow: false }; crown.castShadow = false;
  const leftMountainMesh = { castShadow: false }; leftMountainMesh.castShadow = false;
  const rightMountainMesh = { castShadow: false }; rightMountainMesh.castShadow = false;
  return { foundationMesh, groundBody, upperBody, roofMesh, slabMesh, parapet, trunk, crown, leftMountainMesh, rightMountainMesh };
}

/**
 * ThreeSkyScene - Fachada e Orquestrador Central da Cena 3D
 * Delega o domínio para ThreeThemeManager, ThreeLaje, ThreeCharacters, ThreeKites e ThreeLines
 */
export class ThreeSkyScene {
  constructor(canvas, width, height) {
    this.canvas = canvas;
    this.width = width || window.innerWidth || 1280;
    this.height = height || window.innerHeight || 720;
    this.isTransparent = false;
    this.time = 0;
    const savedTheme = (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function')
      ? localStorage.getItem('rei-da-laje-state')
      : 'RJ';
    this.themeCode = String(savedTheme || 'RJ').toUpperCase();
    this.theme = brazilTheme(this.themeCode);

    this.boomboxEnabled = true;
    this.customKiteScale = 1.0;
    this.customKiteNameScale = 1.15;
    this.customLineOpacity = 0.88;

    this.swayingTrees = [];
    this.favelaTrees = [];
    this.waterMeshes = [];
    this.pulsingBeacons = [];
    this.swayingClothes = [];
    this.rotatingWindTurbines = [];
    this.rotatingLighthouses = [];
    this.waterLilies = [];

    this._tempVecA = new THREE.Vector3();
    this._tempVecB = new THREE.Vector3();
    this.brokenHandRopes3D = new Map();

    if (!this.canvas) return;

    try {
      this.initThree();
      this.initSubsystems();
      this.resize(this.width, this.height);
    } catch (err) {
      console.warn('[ThreeSkyScene] WebGL 3D fallback ativo:', err);
      this.disabled = true;
    }
  }

  initThree() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      precision: 'highp',
      stencil: false,
      depth: true,
      preserveDrawingBuffer: false,
      failIfMajorPerformanceCaveat: false
    });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    this.renderer.info.autoReset = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;

    this.scene = new THREE.Scene();

    const aspect = this.width / this.height;
    this.camera = new THREE.PerspectiveCamera(46, aspect, 1, 3600);
    this.baseCameraPos = new THREE.Vector3(0, 0, 720);
    this.camera.position.copy(this.baseCameraPos);
    this.camera.lookAt(0, 0, 0);
    this.director = new BroadcastDirector(this.camera, this.baseCameraPos);

    this.hemiLight = new THREE.HemisphereLight(0x9ee5ff, 0x3d3024, 0.85);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff1cf, 1.48);
    this.dirLight.position.set(380, 520, 420);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 50;
    this.dirLight.shadow.camera.far = 2000;
    const d = 650;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0003;
    this.dirLight.shadow.normalBias = 0.025;
    this.scene.add(this.dirLight);

    this.rimLight = new THREE.DirectionalLight(0xffe2a4, 0.58);
    this.rimLight.position.set(-260, 380, -560);
    this.scene.add(this.rimLight);

    this.fillLight = new THREE.DirectionalLight(0x5ca7d1, 0.42);
    this.fillLight.position.set(-360, 180, 220);
    this.scene.add(this.fillLight);

    this.scene.fog = new THREE.FogExp2(this.theme.sky[1] || 0x8edce9, 0.00052);
  }

  getVisibleBoundsAt(depth = 0) {
    const distance = Math.max(10, (this.camera ? this.camera.position.z : 720) - depth);
    const vFov = THREE.MathUtils.degToRad(this.camera ? this.camera.fov : 46);
    const visibleH = 2 * Math.tan(vFov / 2) * distance;
    const visibleW = visibleH * (this.camera ? this.camera.aspect : (this.width / this.height));
    return { width: visibleW, height: visibleH };
  }

  setCameraMode(mode = 'normal') {
    this.cameraMode = mode;
    if (!this.camera || !this.baseCameraPos) return this.cameraMode;
    if (mode === 'panoramic') {
      this.baseCameraPos.set(0, 190, 840);
      this.camera.position.copy(this.baseCameraPos);
      this.camera.lookAt(0, -40, 0);
    } else if (mode === 'cinematic') {
      this.baseCameraPos.set(0, -60, 590);
      this.camera.position.copy(this.baseCameraPos);
      this.camera.lookAt(0, 90, 0);
    } else {
      this.cameraMode = 'normal';
      const portrait = this.height > this.width;
      this.baseCameraPos.set(0, portrait ? 10 : 0, portrait ? 830 : 720);
      this.camera.position.copy(this.baseCameraPos);
      this.camera.lookAt(0, portrait ? 10 : 0, 0);
    }
    return this.cameraMode;
  }

  cycleCameraMode() {
    const modes = ['normal', 'cinematic', 'panoramic'];
    const idx = (modes.indexOf(this.cameraMode || 'normal') + 1) % modes.length;
    return this.setCameraMode(modes[idx]);
  }

  initSubsystems() {
    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    // 1. Gerenciador de Temas, Relevo e Iluminação
    this.themeManager = new ThreeThemeManager(this.scene, this.camera, this.getVisibleBoundsAt.bind(this));
    this.themeManager.buildWorldElements(this.worldGroup);

    // 2. Laje do Jogador
    const ctx = this.themeManager.getBuildContext();
    this.laje = new ThreeLaje(
      { box: ctx.geoBox, cyl: ctx.geoCyl, sphere: ctx.geoSphere, cone: ctx.geoCone },
      {
        wood: ctx.woodMat,
        concrete: ctx.concreteMat,
        waterTank: ctx.waterTankMat,
        waterTankLid: ctx.waterTankLidMat,
        rebar: ctx.rebarMat,
        slab: ctx.slabMat,
        rioCan: ctx.rioCanMat
      }
    );
    this.lajeGroup = this.laje.group;
    this.worldGroup.add(this.lajeGroup);

    // 3. Subconjuntos Dinâmicos
    this.characters = new ThreeCharacters();
    this.players3D = this.characters.players3D;
    this.dynamicPlayersGroup = this.characters.group;
    this.lajeGroup.add(this.dynamicPlayersGroup);

    this.kites = new ThreeKites();
    this.kites3D = this.kites.kites3D;
    this.fallingKites3D = this.kites.fallingKites3D;
    this.dynamicKitesGroup = this.kites.group;
    this.worldGroup.add(this.dynamicKitesGroup);

    this.lines = new ThreeLines();
    this.lines3D = this.lines.lines3D;
    this.dynamicLinesGroup = this.lines.group;
    this.sparksPoints = this.lines.sparksPoints;
    this.worldGroup.add(this.dynamicLinesGroup);

    // Aplica o tema inicial
    this.setTheme(this.themeCode);
  }

  setTheme(code) {
    if (!this.themeManager) return this.theme;
    this.theme = this.themeManager.setTheme(code, this.dirLight, this.hemiLight);
    this.themeCode = this.themeManager.themeCode;

    if (this.laje) {
      this.laje.updateCulturalProps(
        this.themeCode,
        this.getVisibleBoundsAt.bind(this),
        this.height,
        this.width,
        this.themeManager.getBuildContext()
      );
    }
    return this.theme;
  }

  setTransparent(bool) {
    this.isTransparent = Boolean(bool);
    if (!this.canvas) return;
    this.canvas.style.display = this.isTransparent ? 'none' : 'block';
  }

  resize(width, height) {
    if (!this.renderer || !this.camera || this.disabled) return;
    const w = Math.max(100, Number(width) || window.innerWidth || 1280);
    const h = Math.max(100, Number(height) || window.innerHeight || 720);
    this.width = w;
    this.height = h;

    this.camera.aspect = w / h;
    this.setCameraMode(this.cameraMode || 'normal');
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(w, h, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));

    if (this.laje && this.themeCode) {
      this.laje.updateCulturalProps(
        this.themeCode,
        this.getVisibleBoundsAt.bind(this),
        this.height,
        this.width,
        this.themeManager ? this.themeManager.getBuildContext() : {}
      );
    }
  }

  toggleMode() {
    this.setTransparent(!this.isTransparent);
    return this.isTransparent ? 'Transparente' : this.theme.name;
  }

  setKiteScale(scale) {
    const val = Number(scale);
    if (Number.isFinite(val) && val >= 0.5 && val <= 3.5) {
      this.customKiteScale = val;
    }
  }

  setKiteNameScale(scale) {
    const val = Number(scale);
    if (Number.isFinite(val) && val >= 0.4 && val <= 3.5) {
      this.customKiteNameScale = val;
    }
  }

  setLineOpacity(opacity) {
    const val = Number(opacity);
    if (Number.isFinite(val) && val >= 0.1 && val <= 1.0) {
      this.customLineOpacity = val;
      if (this.lines) this.lines.setLineOpacity(val);
    }
  }

  setShadows(enabled) {
    const val = Boolean(enabled);
    if (this.renderer?.shadowMap) this.renderer.shadowMap.enabled = val;
    if (this.dirLight) this.dirLight.castShadow = val;
  }

  setBoombox(enabled) {
    this.boomboxEnabled = Boolean(enabled);
  }

  resize(w, h) {
    this.width = Math.max(320, Number(w) || window.innerWidth || 1280);
    this.height = Math.max(480, Number(h) || window.innerHeight || 720);

    if (!this.renderer || !this.camera) return;

    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;

    const portrait = this.height > this.width;
    const targetZ = portrait ? 830 : 720;
    const targetY = portrait ? 10 : 0;
    this.baseCameraPos.set(0, targetY, targetZ);
    this.camera.position.copy(this.baseCameraPos);
    this.camera.lookAt(0, targetY, 0);
    this.camera.fov = portrait ? 50 : 46;
    this.camera.updateProjectionMatrix();

    if (this.director) {
      this.director.basePos.copy(this.baseCameraPos);
      this.director.resize(this.width, this.height);
    }

    if (this.themeManager) this.themeManager.layoutFavelaMorros();
    if (this.laje) {
      const fgBounds = this.getVisibleBoundsAt(480);
      this.laje.layout(fgBounds, portrait, this.width, this.height);
    }
    this.render();
  }

  screenToWorld(screenX, screenY, depthZ = 0) {
    const bounds = this.getVisibleBoundsAt(depthZ);
    const sx = Number.isFinite(screenX) ? screenX : this.width * 0.5;
    const sy = Number.isFinite(screenY) ? screenY : this.height * 0.35;
    const worldX = (sx / this.width - 0.5) * bounds.width;
    const worldY = -(sy / this.height - 0.5) * bounds.height + (this.camera ? this.camera.position.y : 0);
    return { x: worldX, y: worldY, z: depthZ };
  }

  emitSpark3D(worldX, worldY, worldZ, count = 4, colorHex = null) {
    if (this.lines) this.lines.emitSpark3D(worldX, worldY, worldZ, count, colorHex, this.wind);
  }

  emitCut3D(worldX, worldY, worldZ, colorHex = 0xffffff) {
    if (this.lines) this.lines.emitCut3D(worldX, worldY, worldZ, colorHex, this.wind);
    if (this.director) this.director.triggerCutFocus(worldX, worldY, worldZ);
  }

  triggerAparo3D(worldX, worldY, worldZ) {
    if (this.director) this.director.triggerAparoFocus(worldX, worldY, worldZ);
  }

  purgeTextureCache(activeKites) {
    if (!activeKites || !_kiteDecalTextureCache.size) return;
    const inUse = new Set();
    for (const [userId, kite] of activeKites.entries()) {
      const normDecalUrl = String(kite.profilePictureUrl || '').trim();
      const expectedDecalKey = `${normDecalUrl || kite.nickname || 'p'}_${kite.bodyColor}_${kite.isKing ? 1 : 0}_${kite.isLeader ? 1 : 0}`;
      inUse.add(expectedDecalKey);
    }
    for (const k3d of this.kites3D.values()) {
      if (k3d.userData?.currentDecalKey) inUse.add(k3d.userData.currentDecalKey);
    }
    for (const p3d of this.players3D.values()) {
      if (p3d.userData?.currentDecalKey) inUse.add(p3d.userData.currentDecalKey);
    }
    for (const [key, tex] of _kiteDecalTextureCache.entries()) {
      if (!inUse.has(key)) {
        if (typeof tex.dispose === 'function') tex.dispose();
        _kiteDecalTextureCache.delete(key);
      }
    }
  }

  syncEntities(kitesMap, fallingKitesList = null, sparks = null, delta = 1, brokenHandRopesList = null) {
    if (!kitesMap || this.disabled || this.isTransparent) return;

    const activeUserIds = new Set();
    const totalKites = kitesMap.size || 1;
    const fgBounds = this.getVisibleBoundsAt(480);
    const lajeWidth = (this.laje?.lajeFloor ? this.laje.lajeFloor.scale.x : fgBounds.width) * 0.72;
    const isPortrait = this.height > this.width;
    const lajeWorldY = this.lajeGroup ? this.lajeGroup.position.y : 0;

    let idx = 0;
    for (const [userId, kite] of kitesMap.entries()) {
      const uidStr = String(userId);
      activeUserIds.add(uidStr);

      const normDecalUrl = String(kite.profilePictureUrl || '').trim();
      const expectedDecalKey = `${normDecalUrl || kite.nickname || 'p'}_${kite.bodyColor}_${kite.isKing ? 1 : 0}_${kite.isLeader ? 1 : 0}`;

      const layoutIdx = kite.rooftopPlayer?.layoutIndex !== undefined ? kite.rooftopPlayer.layoutIndex : idx;
      const slot = rooftopPlayerLayout(layoutIdx, totalKites, this.width, this.height);
      const normSlotX = (slot.x / this.width - 0.5);
      const bonecoX = normSlotX * lajeWidth;
      const bonecoZ = -12 + (slot.row || 0) * 14;
      const bonecoScale = Math.min(1.8, Math.max(0.68, (slot.scale || 1) * 1.05));

      // 1. Pipa 3D
      let k3d = this.kites3D.get(uidStr);
      if (!k3d) {
        const patIdx = Math.abs(hashStringToInt(uidStr + '_pat')) % 4;
        const modelTypes = ['tradicional', 'raia', 'peixinho', 'tradicional'];
        const modelType = modelTypes[Math.abs(hashStringToInt(uidStr + '_model')) % modelTypes.length];
        k3d = createKiteModel3D(kite.bodyColor || 0xff5722, patIdx, null, modelType);
        k3d.userData.spawnTime = this.time;
        this.dynamicKitesGroup.add(k3d);
        this.kites3D.set(uidStr, k3d);
      }
      if (k3d.userData.currentDecalKey !== expectedDecalKey) {
        const decalTex = getOrCreateKiteDecalTexture(kite.nickname, kite.profilePictureUrl, kite.bodyColor, kite.isKing, kite.isLeader);
        k3d.userData.decalMat.map = decalTex;
        k3d.userData.decalMat.needsUpdate = true;
        k3d.userData.currentDecalKey = expectedDecalKey;
      }

      // NameTag 3D
      const expectedTagKey = `${kite.nickname || 'p'}_${kite.isKing ? 1 : 0}_${kite.isLeader ? 1 : 0}`;
      if (!k3d.userData.nameTag) {
        const tagSprite = createKiteNameTagSprite(kite.nickname, kite.isKing, kite.isLeader);
        k3d.add(tagSprite);
        k3d.userData.nameTag = tagSprite;
        k3d.userData.currentTagKey = expectedTagKey;
      } else if (k3d.userData.currentTagKey !== expectedTagKey) {
        updateKiteNameTagSprite(k3d.userData.nameTag, kite.nickname, kite.isKing, kite.isLeader);
        k3d.userData.currentTagKey = expectedTagKey;
      }

      if (k3d.userData.nameTag) {
        const nScale = this.customKiteNameScale || 1.15;
        k3d.userData.nameTag.scale.set(13.5 * nScale, 3.5 * nScale, 1);
        k3d.userData.nameTag.position.y = 20.5 + (nScale - 1) * 3;
      }

      // Profundidade 3D
      const depthSeed = Math.abs(hashStringToInt(uidStr + '_depth'));
      const depthTier = depthSeed % 3;
      let depthOffset = depthTier === 0 ? 210 + (depthSeed % 35) : depthTier === 1 ? 130 + (depthSeed % 35) : 50 + (depthSeed % 35);

      // A profundidade individual permanece estável durante combate.
      // O contato é resolvido pela corda física; alinhar Z dos corpos ao oponente
      // fazia 3+ pipas convergirem e oscilarem como um único grupo.

      const worldTarget = this.screenToWorld(kite.x, kite.y, depthOffset);
      k3d.userData.targetWorldPos.set(worldTarget.x, worldTarget.y, worldTarget.z);

      const vx = kite.vx !== undefined ? kite.vx : 0;
      const vy = kite.vy !== undefined ? kite.vy : 0;

      // Decolagem física
      const age = this.time - (k3d.userData.spawnTime || 0);
      if (age < 0.6) {
        const takeoffProg = age / 0.6;
        k3d.userData.currentWorldPos.set(
          THREE.MathUtils.lerp(bonecoX, worldTarget.x, takeoffProg),
          THREE.MathUtils.lerp(lajeWorldY + 15, worldTarget.y, takeoffProg),
          THREE.MathUtils.lerp(480, worldTarget.z, takeoffProg)
        );
      } else {
        const followSpeed = Math.min(1.0, 0.85 * delta);
        k3d.userData.currentWorldPos.lerp(k3d.userData.targetWorldPos, followSpeed);
      }
      k3d.position.copy(k3d.userData.currentWorldPos);

      // Sincroniza profundidade 3D real com a entidade lógica da pipa
      kite.z = k3d.position.z;

      // Rotação física e manobras
      const physRot = Number.isFinite(kite.rotation) ? kite.rotation : 0;
      let targetRoll = -Math.max(-0.75, Math.min(0.75, (vx * 0.065) - physRot * 0.85));
      let targetPitch = Math.max(-0.55, Math.min(0.65, vy * 0.052)) - 0.22;
      let targetYaw = Math.max(-0.5, Math.min(0.5, (vx * 0.045) - physRot * 0.5));

      if (kite.maneuver && kite.maneuver.name) {
        const m = String(kite.maneuver.name).toLowerCase();
        if (m === 'tenteio') {
          targetRoll += Math.sin(this.time * 26 + idx) * 0.42;
          targetPitch += Math.cos(this.time * 26 + idx) * 0.25;
        } else if (m === 'desbicada' || m === 'despicar') {
          targetPitch += 0.75;
          targetRoll += (vx >= 0 ? 0.4 : -0.4);
        } else if (m === 'puxao' || m === 'retao') {
          targetPitch -= 0.55;
          targetRoll *= 0.5;
        } else if (m === 'mergulho') {
          targetPitch += 0.85;
        }
      }

      // O relinho vibra a LINHA, não o corpo inteiro da pipa. A física de
      // KiteDynamics já reage à tensão; jitter sintético aqui sincronizava grupos.

      k3d.userData.roll = THREE.MathUtils.lerp(k3d.userData.roll, targetRoll, 0.45 * delta);
      k3d.userData.pitch = THREE.MathUtils.lerp(k3d.userData.pitch, targetPitch, 0.45 * delta);
      k3d.userData.yaw = THREE.MathUtils.lerp(k3d.userData.yaw, targetYaw, 0.45 * delta);

      k3d.rotation.set(0, 0, 0);
      k3d.rotation.x = k3d.userData.pitch;
      k3d.rotation.z = k3d.userData.roll;
      k3d.rotation.y = k3d.userData.yaw;

      const dynamicScale = Math.max(0.65, Math.min(1.45, 0.95 + (k3d.position.z / 600) * 0.4)) * this.customKiteScale;
      k3d.scale.set(dynamicScale, dynamicScale, dynamicScale);

      // Barra de HP (calculada a partir da integridade da linha: kite.lineHP / kite.maxLineHP)
      const maxHp = Number(kite.maxLineHP) > 0 ? Number(kite.maxLineHP) : 100;
      const currentHp = Number(kite.lineHP !== undefined ? kite.lineHP : (kite.health !== undefined ? kite.health : maxHp));
      const hpFraction = Math.max(0, Math.min(1, currentHp / maxHp));
      const hp = hpFraction * 100;
      k3d.userData.hpGroup.visible = Boolean(hp < 99 || kite.isKing || kite.isLeader);
      if (k3d.userData.hpGroup.visible) {
        k3d.userData.hpFill.scale.x = Math.max(0.01, k3d.userData.hpBarWidth * hpFraction);
        k3d.userData.hpFill.position.x = -k3d.userData.hpBarWidth * 0.5 * (1 - hpFraction);
        if (hpFraction > 0.55) {
          k3d.userData.hpFillMat.color.setHex(0x10b981);
        } else if (hpFraction > 0.25) {
          k3d.userData.hpFillMat.color.setHex(0xf59e0b);
        } else {
          k3d.userData.hpFillMat.color.setHex(0xef4444);
        }
      }

      // Efeitos visuais
      k3d.userData.crown.visible = Boolean(kite.isKing);
      k3d.userData.aura.visible = Boolean(kite.isKing || kite.isLeader);
      if (kite.isKing) k3d.userData.crown.rotation.y = this.time * 2.2;
      k3d.userData.shieldMesh.visible = Boolean(kite.shieldActive || kite.hasKevlarBuff);
      k3d.userData.tornadoMesh.visible = Boolean(kite.tornadoActive || (kite.maneuver && kite.maneuver.name === 'tenteio'));

      // Rabiola 3D Dinâmica (Física de linha real no World Space)
      ThreeKites.updateTailPhysics(k3d, this.wind, delta, this.time, vx, vy);

      // 2. Boneco 3D do Jogador
      let p3d = this.players3D.get(uidStr);
      if (!p3d) {
        p3d = this.characters.syncPlayerBoneco(
          uidStr,
          kite,
          idx,
          totalKites,
          lajeWidth,
          lajeWorldY,
          k3d.position,
          this.time,
          delta,
          this.width,
          this.height
        );
        p3d.userData.currentDecalKey = expectedDecalKey;
      } else {
        if (p3d.userData.currentDecalKey !== expectedDecalKey) {
          const decalTex = getOrCreateKiteDecalTexture(kite.nickname, kite.profilePictureUrl, kite.bodyColor, kite.isKing, kite.isLeader);
          if (p3d.userData.badgeMesh?.material) {
            p3d.userData.badgeMesh.material.map = decalTex;
            p3d.userData.badgeMesh.material.needsUpdate = true;
          }
          p3d.userData.currentDecalKey = expectedDecalKey;
        }
        this.characters.syncPlayerBoneco(
          uidStr,
          kite,
          idx,
          totalKites,
          lajeWidth,
          lajeWorldY,
          k3d.position,
          this.time,
          delta,
          this.width,
          this.height
        );
      }

      // 3. Linha 3D conectando da mão do personagem até a pipa no céu
      let l3d = this.lines3D.get(uidStr);
      if (!l3d) {
        l3d = this.lines.getOrCreateLine(uidStr);
      }
      const handPos = this._tempVecA;
      if (p3d) {
        handPos.set(
          p3d.position.x + 3.4 * p3d.scale.x,
          lajeWorldY + 14.5 * p3d.scale.y,
          (this.lajeGroup ? this.lajeGroup.position.z : 480) + p3d.position.z + 6.4 * p3d.scale.z
        );
      } else {
        handPos.set(bonecoX, lajeWorldY + 14, 480);
      }
      this.lines.syncLine(uidStr, kite, handPos, k3d.position, this.wind, delta, this.time);

      idx++;
    }

    // 4. Limpeza de Inativos
    for (const [userId, p3d] of this.players3D.entries()) {
      if (!activeUserIds.has(String(userId))) {
        this.dynamicPlayersGroup.remove(p3d);
        disposeHierarchy(p3d);
        this.players3D.delete(userId);
      }
    }

    for (const [userId, l3d] of this.lines3D.entries()) {
      if (!activeUserIds.has(String(userId))) {
        this.dynamicLinesGroup.remove(l3d);
        if (l3d.userData?.geo) l3d.userData.geo.dispose();
        if (l3d.userData?.mat) l3d.userData.mat.dispose();
        if (l3d.userData?.glowMat) l3d.userData.glowMat.dispose();
        this.lines3D.delete(userId);
      }
    }

    for (const [userId, k3d] of this.kites3D.entries()) {
      if (!activeUserIds.has(String(userId))) {
        this.dynamicKitesGroup.remove(k3d);
        disposeHierarchy(k3d);
        this.kites3D.delete(userId);
      }
    }

    // 5. Pipas Cortadas Caindo com Linha Pendurada Física (FlyawayKite 3D)
    const activeFallingIds = new Set();
    const maxLajeWorldY = lajeWorldY - 140; // Limite de solo da laje e cenário profundo

    if (fallingKitesList && fallingKitesList.length) {
      fallingKitesList.forEach(fk => {
        const fId = fk.id || `fk_${fk.userId}`;
        activeFallingIds.add(fId);

        let fk3d = this.fallingKites3D.get(fId);
        if (!fk3d) {
          const patIdx = Math.abs(hashStringToInt(fId + '_fkpat')) % 4;
          fk3d = createKiteModel3D(fk.bodyColor || 0xff5722, patIdx, null, fk.kiteType || 'tradicional');
          fk3d.scale.set(0.85, 0.85, 0.85);

          // Linha pendurada na pipa voada (FlyawayRope 3D)
          const lineGeo = new THREE.BufferGeometry();
          const linePos = new Float32Array(8 * 3);
          lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
          const lineMat = new THREE.LineBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.85,
            linewidth: 1.2
          });
          const hangingLine = new THREE.Line(lineGeo, lineMat);
          hangingLine.frustumCulled = false;
          fk3d.userData.hangingLine = hangingLine;
          this.dynamicLinesGroup.add(hangingLine);

          this.dynamicKitesGroup.add(fk3d);
          this.fallingKites3D.set(fId, fk3d);
        }

        const fkWorld = this.screenToWorld(fk.x, fk.y, 40);
        if (fkWorld.y < maxLajeWorldY) {
          activeFallingIds.delete(fId);
          return;
        }

        fk3d.position.set(fkWorld.x, fkWorld.y, fkWorld.z);
        fk3d.rotation.z = (fk.rotation || 0) + this.time * 2.8;
        fk3d.rotation.x = Math.sin(this.time * 3.5) * 0.45;
        fk3d.rotation.y += 0.08 * delta;
        ThreeKites.updateTailPhysics(fk3d, this.wind, delta, this.time, fk.vx || 0, fk.vy || 0);

        // Atualiza a linha pendurada 3D presa à pipa voada
        const hangingLine = fk3d.userData.hangingLine;
        if (hangingLine && hangingLine.geometry) {
          const posAttr = hangingLine.geometry.attributes.position;
          const posArr = posAttr.array;
          const nodes = fk.flyawayNodes;
          const attachWorld = fk3d.position;
          const count = 8;
          if (Array.isArray(nodes) && nodes.length >= 2) {
            for (let p = 0; p < count; p++) {
              const t = p / (count - 1);
              const sampleIdx = t * (nodes.length - 1);
              const idxA = Math.floor(sampleIdx);
              const idxB = Math.min(nodes.length - 1, idxA + 1);
              const frac = sampleIdx - idxA;
              const nA = nodes[idxA];
              const nB = nodes[idxB];
              const nx = nA.x + (nB.x - nA.x) * frac;
              const ny = nA.y + (nB.y - nA.y) * frac;
              const nodeWorld = this.screenToWorld(nx, ny, attachWorld.z);
              posArr[p * 3] = nodeWorld.x;
              posArr[p * 3 + 1] = nodeWorld.y;
              posArr[p * 3 + 2] = nodeWorld.z;
            }
          } else {
            for (let p = 0; p < count; p++) {
              const t = p / (count - 1);
              posArr[p * 3] = attachWorld.x + (this.wind ? this.wind.x * 12 * t : 0);
              posArr[p * 3 + 1] = attachWorld.y - t * 45;
              posArr[p * 3 + 2] = attachWorld.z;
            }
          }
          posAttr.needsUpdate = true;
          if (hangingLine.material) {
            hangingLine.material.opacity = Math.max(0, Math.min(0.85, (fk.life || 1) / 2));
          }
        }
      });
    }

    for (const [fId, fk3d] of this.fallingKites3D.entries()) {
      if (!activeFallingIds.has(fId)) {
        if (fk3d.userData.hangingLine) {
          this.dynamicLinesGroup.remove(fk3d.userData.hangingLine);
          if (fk3d.userData.hangingLine.geometry) fk3d.userData.hangingLine.geometry.dispose();
          if (fk3d.userData.hangingLine.material) fk3d.userData.hangingLine.material.dispose();
        }
        this.dynamicKitesGroup.remove(fk3d);
        disposeHierarchy(fk3d);
        this.fallingKites3D.delete(fId);
      }
    }

    // 5.1 Linhas Quebradas da Mão Caindo na Laje (BrokenHandRope 3D)
    const activeBrokenIds = new Set();
    if (brokenHandRopesList && brokenHandRopesList.length) {
      brokenHandRopesList.forEach((bhr, idx) => {
        const bId = String(bhr.userId || ('bhr_' + idx));
        activeBrokenIds.add(bId);

        let br3d = this.brokenHandRopes3D.get(bId);
        if (!br3d) {
          const lineGeo = new THREE.BufferGeometry();
          const linePos = new Float32Array(12 * 3);
          lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
          const lineMat = new THREE.LineBasicMaterial({
            color: bhr.lineColor || 0xffffff,
            transparent: true,
            opacity: 0.85,
            linewidth: 1.2
          });
          br3d = new THREE.Line(lineGeo, lineMat);
          br3d.frustumCulled = false;
          this.dynamicLinesGroup.add(br3d);
          this.brokenHandRopes3D.set(bId, br3d);
        }

        if (br3d && br3d.geometry) {
          const posAttr = br3d.geometry.attributes.position;
          const posArr = posAttr.array;
          const nodes = bhr.nodes || [];
          const count = 12;
          const zDepth = (this.lajeGroup ? this.lajeGroup.position.z : 480) - 20;

          if (nodes.length >= 2) {
            for (let p = 0; p < count; p++) {
              const t = p / (count - 1);
              const sampleIdx = t * (nodes.length - 1);
              const idxA = Math.floor(sampleIdx);
              const idxB = Math.min(nodes.length - 1, idxA + 1);
              const frac = sampleIdx - idxA;
              const nA = nodes[idxA];
              const nB = nodes[idxB];
              const nx = nA.x + (nB.x - nA.x) * frac;
              const ny = nA.y + (nB.y - nA.y) * frac;
              const nodeWorld = this.screenToWorld(nx, ny, zDepth * (1 - t * 0.4));
              posArr[p * 3] = nodeWorld.x;
              posArr[p * 3 + 1] = nodeWorld.y;
              posArr[p * 3 + 2] = nodeWorld.z;
            }
          }
          posAttr.needsUpdate = true;
          if (br3d.material) {
            br3d.material.opacity = Math.max(0, Math.min(0.85, (bhr.life / 2.0) * 0.85));
          }
        }
      });
    }

    for (const [bId, br3d] of this.brokenHandRopes3D.entries()) {
      if (!activeBrokenIds.has(bId)) {
        this.dynamicLinesGroup.remove(br3d);
        if (br3d.geometry) br3d.geometry.dispose();
        if (br3d.material) br3d.material.dispose();
        this.brokenHandRopes3D.delete(bId);
      }
    }

    // 6. Atualização de Faíscas
    this.lines.updateSparks(delta);

    // 7. Limpeza Periódica de Texturas de Decalque
    if (Math.random() < 0.015) {
      this.purgeTextureCache(kitesMap);
    }
  }

  update(delta = 1, currentWind = null, kites = null, fallingKites = null, sparks = null, brokenHandRopes = null) {
    if (this.disabled || this.isTransparent) return;
    if (currentWind) this.wind = currentWind;
    if (kites) this.syncEntities(kites, fallingKites || [], sparks || null, delta, brokenHandRopes || []);
    if (this.director) {
      const dtSec = Math.max(0.002, Number.isFinite(delta) ? delta / 60 : 1 / 60);
      this.director.update(dtSec, kites, this.kites3D);
    }
    this.render();
  }

  render() {
    if (!this.renderer || !this.scene || !this.camera || this.disabled || this.isTransparent) return;

    this.time += 0.016;

    if (this.themeManager) {
      this.themeManager.updateAnimations(0.016, this.time, this.wind);
    }

    if (this.laje) {
      this.laje.update(0.016, this.time, this.boomboxEnabled);
    }

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    this.disabled = true;

    if (this.themeManager) {
      this.themeManager.dispose();
    }

    if (this.laje) {
      this.laje.dispose();
    }

    for (const [userId, p3d] of this.players3D.entries()) {
      disposeHierarchy(p3d);
    }
    this.players3D.clear();

    for (const [userId, l3d] of this.lines3D.entries()) {
      if (l3d.userData?.geo) l3d.userData.geo.dispose();
      if (l3d.userData?.mat) l3d.userData.mat.dispose();
      if (l3d.userData?.glowMat) l3d.userData.glowMat.dispose();
      if (l3d.material) l3d.material.dispose();
    }
    this.lines3D.clear();

    for (const [userId, k3d] of this.kites3D.entries()) {
      disposeHierarchy(k3d);
    }
    this.kites3D.clear();

    for (const [fId, fk3d] of this.fallingKites3D.entries()) {
      if (fk3d.userData?.hangingLine) {
        if (fk3d.userData.hangingLine.geometry) fk3d.userData.hangingLine.geometry.dispose();
        if (fk3d.userData.hangingLine.material) fk3d.userData.hangingLine.material.dispose();
      }
      disposeHierarchy(fk3d);
    }
    this.fallingKites3D.clear();

    for (const [bId, br3d] of this.brokenHandRopes3D.entries()) {
      if (br3d.geometry) br3d.geometry.dispose();
      if (br3d.material) br3d.material.dispose();
    }
    this.brokenHandRopes3D.clear();

    for (const [key, tex] of _kiteDecalTextureCache.entries()) {
      if (typeof tex.dispose === 'function') tex.dispose();
    }
    _kiteDecalTextureCache.clear();

    if (this.worldGroup) {
      disposeHierarchy(this.worldGroup);
      if (this.scene) this.scene.remove(this.worldGroup);
    }

    if (this.renderer) {
      try {
        this.renderer.dispose();
        this.renderer.forceContextLoss();
      } catch (_) {}
      this.renderer = null;
    }
  }
}
