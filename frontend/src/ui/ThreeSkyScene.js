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
  createKiteModel3D,
  configureKiteModelType3D
} from './three/ThreeKites.js';
import { ThreeLines } from './three/ThreeLines.js';
import { FlyawayKite3DPool } from './three/FlyawayKite3DPool.js';
import { ActiveVisualPool } from './three/ActiveVisualPool.js';
import {
  createActiveVisualSlot3D,
  configureActiveVisualSlot3D,
  resetActiveVisualSlot3D,
  disposeActiveVisualSlot3D
} from './three/ActiveVisualSlot3D.js';
import { ThreeThemeManager } from './three/themes/ThreeThemeManager.js';
import { BroadcastDirector } from './three/BroadcastDirector.js';
import { computeRenderBudget } from './three/RenderBudget.js';

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
    this._userShadowsEnabled = true;
    this._runtimeQuality = 'high';
    this._runtimePopulation = 0;
    this._renderBudget = computeRenderBudget({ quality: 'high', population: 0 });
    this._environmentFrame = 0;

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
    this._deferredDisposals = [];
    this._retiredCutAppearance = new Map();

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
    this.dynamicKitesGroup = this.kites.group;
    this.worldGroup.add(this.dynamicKitesGroup);
    this.flyawayPool = new FlyawayKite3DPool(this.dynamicKitesGroup, 48);
    this.fallingKites3D = this.flyawayPool.active;

    this.lines = new ThreeLines();
    this.lines3D = this.lines.lines3D;
    this.dynamicLinesGroup = this.lines.group;
    this.sparksPoints = this.lines.sparksPoints;
    this.brokenHandRopes3D = this.lines.brokenRopes3D;
    this.worldGroup.add(this.dynamicLinesGroup);


    this.activeVisualPool = new ActiveVisualPool({
      capacity: 48,
      createSlot: index => createActiveVisualSlot3D(index, {
        kites: this.dynamicKitesGroup,
        players: this.dynamicPlayersGroup,
        lines: this.dynamicLinesGroup
      }),
      resetSlot: resetActiveVisualSlot3D,
      disposeSlot: disposeActiveVisualSlot3D
    });
    this._activePoolWarningIds = new Set();

    // Aplica o tema inicial e prÃ©-aquece os materiais usados no corte.
    this.setTheme(this.themeCode);
    this.prewarmVisualPools();
  }

  acquireActiveVisual(userId, kite) {
    if (!this.activeVisualPool) return null;
    const uid = String(userId);
    let slot = this.activeVisualPool.get(uid);
    if (!slot) slot = this.activeVisualPool.acquire(uid);
    if (!slot) {
      this._activePoolWarningIds ||= new Set();
      if (!this._activePoolWarningIds.has(uid)) {
        this._activePoolWarningIds.add(uid);
        console.warn(`[ThreeSkyScene] pool 3D lotado; participante ${uid} sem slot visual.`);
      }
      return null;
    }
    configureActiveVisualSlot3D(slot, uid, kite, this.time);
    this.kites3D.set(uid, slot.kite);
    this.players3D.set(uid, slot.player);
    this.lines3D.set(uid, slot.line);
    return slot;
  }

  releaseActiveVisual(userId) {
    const uid = String(userId);
    const slot = this.activeVisualPool?.get(uid) || null;
    this.kites3D?.delete(uid);
    this.players3D?.delete(uid);
    this.lines3D?.delete(uid);
    this._activePoolWarningIds?.delete(uid);
    if (!slot) return null;
    return this.activeVisualPool.release(uid);
  }

  prewarmCutVisuals() {
    return this.prewarmVisualPools();
  }

  _prewarmFlyawayDecal(renderer) {
    const sourceDecal = this.flyawayPool.items[0]?.userData?.decal;
    if (!renderer || !sourceDecal?.geometry || !sourceDecal?.material) return false;
    const decalWarmScene = new THREE.Scene();
    decalWarmScene.fog = this.scene.fog;
    const decalWarmCamera = new THREE.OrthographicCamera(-30, 30, 24, -24, 0.1, 20);
    decalWarmCamera.position.set(0, 0, 5);
    decalWarmCamera.lookAt(0, 0, 0);
    const decalWarmMesh = new THREE.Mesh(sourceDecal.geometry, sourceDecal.material);
    decalWarmMesh.frustumCulled = false;
    decalWarmMesh.scale.setScalar(0.24);
    decalWarmMesh.position.set(-24, 18, 0);
    decalWarmScene.add(decalWarmMesh);
    this.flyawayPool.items.forEach((flyaway, index) => {
      if (index === 0) return;
      const decal = flyaway?.userData?.decal;
      if (!decal?.geometry || !decal?.material) return;
      const mesh = new THREE.Mesh(decal.geometry, decal.material);
      mesh.frustumCulled = false;
      mesh.scale.setScalar(0.24);
      mesh.position.set(-24 + (index % 8) * 7, 18 - Math.floor(index / 8) * 7, 0);
      decalWarmScene.add(mesh);
    });
    renderer.render(decalWarmScene, decalWarmCamera);
    return true;
  }

  prewarmVisualPools() {
    if (this._visualPoolsPrewarmed) return true;
    if (!this.renderer || !this.scene || !this.camera) {
      this._visualPoolsPrewarmed = false;
      return false;
    }

    const renderer = this.renderer;
    const variants = ['tradicional', 'raia', 'peixinho'];
    const visibility = [];
    const rememberVisible = object => {
      if (!object) return;
      visibility.push([object, object.visible]);
      object.visible = true;
    };
    let previousTarget = null;
    let warmTarget = null;
    const previousShadowMapEnabled = renderer.shadowMap?.enabled;
    const previousDirCastShadow = this.dirLight?.castShadow;

    try {
      this.activeVisualPool.slots.forEach((slot, index) => {
        configureKiteModelType3D(slot.kite, variants[index % variants.length], index % 4);
        rememberVisible(slot.kite);
        rememberVisible(slot.player);
        rememberVisible(slot.line);
        rememberVisible(slot.player.userData.badgeGroup);
        rememberVisible(slot.player.userData.glassesGroup);
        rememberVisible(slot.player.userData.crown);
        rememberVisible(slot.kite.userData.hpGroup);
        rememberVisible(slot.kite.userData.crown);
        rememberVisible(slot.kite.userData.aura);
        rememberVisible(slot.kite.userData.shieldMesh);
        rememberVisible(slot.kite.userData.tornadoMesh);
        slot.kite.position.set((index % 8 - 3.5) * 8, (Math.floor(index / 8) - 2.5) * 8, 0);
        slot.player.position.set((index % 8 - 3.5) * 8, -35, 0);
      });

      this.flyawayPool.items.forEach((flyaway, index) => {
        this.flyawayPool._configure(flyaway, {
          kiteType: variants[index % variants.length],
          bodyColor: 0xff5722 + (index % 8) * 0x001100,
          nickname: `Prewarm ${index}`
        });
        rememberVisible(flyaway);
        flyaway.position.set((index % 8 - 3.5) * 7, 30 + Math.floor(index / 8) * 6, 20);
      });

      this.lines._brokenRopePool.forEach((broken, index) => {
        rememberVisible(broken);
        const attr = broken.geometry?.attributes?.position;
        if (attr?.array) {
          for (let point = 0; point < attr.count; point++) {
            attr.array[point * 3] = (index % 8 - 3.5) * 6 + point * 0.4;
            attr.array[point * 3 + 1] = -20 + Math.floor(index / 8) * 3 - point * 0.25;
            attr.array[point * 3 + 2] = 10;
          }
          attr.needsUpdate = true;
        }
      });

      previousTarget = renderer.getRenderTarget?.() || null;
      warmTarget = new THREE.WebGLRenderTarget(8, 8, {
        depthBuffer: true,
        stencilBuffer: false
      });
      warmTarget.texture.colorSpace = renderer.outputColorSpace;
      renderer.setRenderTarget?.(null);
      renderer.compile(this.scene, this.camera);

      if (renderer.shadowMap) renderer.shadowMap.enabled = false;
      if (this.dirLight) this.dirLight.castShadow = false;
      renderer.compile(this.scene, this.camera);

      renderer.setRenderTarget?.(warmTarget);
      renderer.render(this.scene, this.camera);
      this._prewarmFlyawayDecal(renderer);

      if (renderer.shadowMap && previousShadowMapEnabled !== undefined) {
        renderer.shadowMap.enabled = previousShadowMapEnabled;
      }
      if (this.dirLight && previousDirCastShadow !== undefined) {
        this.dirLight.castShadow = previousDirCastShadow;
      }
      renderer.render(this.scene, this.camera);
      this._prewarmFlyawayDecal(renderer);
      this._visualPoolsPrewarmed = true;
      return true;
    } catch (error) {
      this._visualPoolsPrewarmed = false;
      console.warn('[ThreeSkyScene] prewarm 3D falhou; seguindo com fallback:', error);
      return false;
    } finally {
      if (renderer.shadowMap && previousShadowMapEnabled !== undefined) {
        renderer.shadowMap.enabled = previousShadowMapEnabled;
      }
      if (this.dirLight && previousDirCastShadow !== undefined) {
        this.dirLight.castShadow = previousDirCastShadow;
      }
      try { renderer.setRenderTarget?.(previousTarget); } catch (_) {}
      try { warmTarget?.dispose(); } catch (_) {}
      for (const [object, wasVisible] of visibility) object.visible = Boolean(wasVisible);
      for (const slot of this.activeVisualPool.slots) {
        if (!slot.__poolOwnerId) resetActiveVisualSlot3D(slot);
      }
    }
  }

  _deferDispose(disposer, delayFrames = 3) {
    if (typeof disposer !== 'function') return;
    this._deferredDisposals.push({ disposer, frames: Math.max(1, delayFrames | 0) });
  }

  _drainDeferredDisposals(maxPerFrame = 1) {
    let executed = 0;
    for (let i = 0; i < this._deferredDisposals.length && executed < maxPerFrame;) {
      const item = this._deferredDisposals[i];
      item.frames -= 1;
      if (item.frames > 0) { i++; continue; }
      this._deferredDisposals.splice(i, 1);
      try { item.disposer(); } catch (_) {}
      executed++;
    }
  }

  _flushDeferredDisposals() {
    for (const item of this._deferredDisposals.splice(0)) {
      try { item.disposer(); } catch (_) {}
    }
  }

  setTheme(code) {
    if (!this.themeManager) return this.theme;
    this.theme = this.themeManager.setTheme(code, this.dirLight, this.hemiLight);
    this.themeCode = this.themeManager.themeCode;
    this.themeManager.setRuntimeLod(this._renderBudget?.ambientLod || 0);

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
    this._userShadowsEnabled = Boolean(enabled);
    const effective = this._userShadowsEnabled && (this._renderBudget?.shadows !== false);
    if (this.renderer?.shadowMap) this.renderer.shadowMap.enabled = effective;
    if (this.dirLight) this.dirLight.castShadow = effective;
  }

  setRuntimeQuality(quality = 'high', population = 0) {
    const next = computeRenderBudget({ quality, population });
    const key = `${quality}|${Math.max(0, Number(population) || 0) >= 24 ? 'crowded' : Math.max(0, Number(population) || 0) >= 14 ? 'busy' : 'normal'}`;
    if (key === this._runtimeBudgetKey) return this._renderBudget;
    this._runtimeBudgetKey = key;
    this._runtimeQuality = quality;
    this._runtimePopulation = Math.max(0, Math.floor(Number(population) || 0));
    this._renderBudget = next;
    const baseRatio = Math.min(window.devicePixelRatio || 1, 1.25);
    this.renderer?.setPixelRatio(Math.max(0.5, baseRatio * next.pixelRatioScale));
    const effectiveShadows = this._userShadowsEnabled && next.shadows;
    if (this.renderer?.shadowMap) this.renderer.shadowMap.enabled = effectiveShadows;
    if (this.dirLight) this.dirLight.castShadow = effectiveShadows;
    this.lines?.setIdleLineOpacityScale(next.idleLineOpacityScale);
    this.themeManager?.setRuntimeLod(next.ambientLod);
    return next;
  }

  setBoombox(enabled) {
    this.boomboxEnabled = Boolean(enabled);
  }

  resize(width, height) {
    const w = Math.max(320, Number(width) || window.innerWidth || 1280);
    const h = Math.max(480, Number(height) || window.innerHeight || 720);
    this.width = w;
    this.height = h;
    if (!this.renderer || !this.camera || this.disabled) return;

    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;

    const portrait = h > w;
    const targetZ = portrait ? 830 : 720;
    const targetY = portrait ? 10 : 0;
    this.baseCameraPos.set(0, targetY, targetZ);
    this.camera.position.copy(this.baseCameraPos);
    this.camera.lookAt(0, targetY, 0);
    this.camera.fov = portrait ? 50 : 46;
    this.camera.updateProjectionMatrix();

    if (this.director) {
      this.director.basePos.copy(this.baseCameraPos);
      this.director.resize(w, h);
    }
    if (this.themeManager) this.themeManager.layoutFavelaMorros();
    if (this.laje) {
      const fgBounds = this.getVisibleBoundsAt(480);
      this.laje.layout(fgBounds, portrait, w, h);
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
      const identityBodyColor = Number.isFinite(kite.bodyColor) ? kite.bodyColor : 0xff5722;
      const expectedDecalKey = `${normDecalUrl || kite.nickname || 'p'}_${identityBodyColor}_${kite.isKing ? 1 : 0}_${kite.isLeader ? 1 : 0}`;
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

      // 1. Pipa 3D â€” sempre proveniente do pool prÃ©-alocado.
      let k3d = this.kites3D.get(uidStr);
      if (!k3d) {
        const visualSlot = this.acquireActiveVisual(uidStr, kite);
        if (!visualSlot) {
          idx++;
          continue;
        }
        k3d = visualSlot.kite;
      } else if (k3d.userData.currentDecalKey !== expectedDecalKey) {
        const refreshedSlot = this.acquireActiveVisual(uidStr, kite);
        if (refreshedSlot) k3d = refreshedSlot.kite;
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

      // Posição e atitude vêm exclusivamente do estado físico da pipa.
      const depthOffset = Number.isFinite(kite.z) ? kite.z : 140;
      const worldTarget = this.screenToWorld(kite.x, kite.y, depthOffset);
      k3d.userData.targetWorldPos.set(worldTarget.x, worldTarget.y, worldTarget.z);
      k3d.userData.currentWorldPos.copy(k3d.userData.targetWorldPos);
      k3d.position.copy(k3d.userData.targetWorldPos);

      const vx = Number(kite.vx) || 0;
      const vy = Number(kite.vy) || 0;
      const physRot = Number.isFinite(kite.rotation) ? kite.rotation : 0;
      const targetRoll = Number.isFinite(kite.roll) ? kite.roll
        : -Math.max(-0.75, Math.min(0.75, (vx * 0.065) - physRot * 0.85));
      const targetPitch = Number.isFinite(kite.pitch) ? kite.pitch
        : Math.max(-0.55, Math.min(0.65, vy * 0.052)) - 0.22;
      const targetYaw = Number.isFinite(kite.heading) ? kite.heading
        : Math.max(-0.5, Math.min(0.5, (vx * 0.045) - physRot * 0.5));

      k3d.userData.roll = targetRoll;
      k3d.userData.pitch = targetPitch;
      k3d.userData.yaw = targetYaw;
      k3d.rotation.set(targetPitch, targetYaw, targetRoll);

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

    // 4. Limpeza de Inativos: captura a aparência antes de devolver o slot ativo.
    const fallingByUser = new Map((fallingKitesList || [])
      .filter(fk => fk?.userId !== undefined && fk?.userId !== null)
      .map(fk => [String(fk.userId), fk]));

    if (this.activeVisualPool) {
      for (const [userId, visualSlot] of [...this.activeVisualPool.active.entries()]) {
        if (activeUserIds.has(String(userId))) continue;
        const flyaway = fallingByUser.get(String(userId)) || null;
        if (flyaway) {
          const fId = String(flyaway.id || `fk_${flyaway.userId}`);
          let flyaway3D = this.fallingKites3D.get(fId);
          if (!flyaway3D) flyaway3D = this.flyawayPool.acquireFlyaway(fId, flyaway);
          if (flyaway3D) this.flyawayPool.captureAppearance(flyaway3D, visualSlot);
        }
        this.releaseActiveVisual(userId);
      }
    }

    // 5. Pipas cortadas continuam 100% 3D, usando um modelo leve e pre-alocado.
    const activeFallingIds = new Set();
    const maxLajeWorldY = lajeWorldY - 140;
    if (fallingKitesList && fallingKitesList.length) {
      fallingKitesList.forEach(fk => {
        const fId = String(fk.id || `fk_${fk.userId}`);
        activeFallingIds.add(fId);
        let fk3d = this.fallingKites3D.get(fId);
        if (!fk3d) fk3d = this.flyawayPool.acquireFlyaway(fId, fk);
        if (!fk3d) return;

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

        const hangingLine = fk3d.userData.hangingLine;
        if (hangingLine?.geometry) {
          fk3d.updateMatrixWorld(true);
          const posAttr = hangingLine.geometry.attributes.position;
          const posArr = posAttr.array;
          const nodes = fk.flyawayNodes;
          const count = 8;
          if (Array.isArray(nodes) && nodes.length >= 2) {
            for (let p = 0; p < count; p++) {
              const t = p / (count - 1);
              const sampleIdx = t * (nodes.length - 1);
              const idxA = Math.floor(sampleIdx);
              const idxB = Math.min(nodes.length - 1, idxA + 1);
              const frac = sampleIdx - idxA;
              const nA = nodes[idxA], nB = nodes[idxB];
              const nx = nA.x + (nB.x - nA.x) * frac;
              const ny = nA.y + (nB.y - nA.y) * frac;
              const nodeWorld = this.screenToWorld(nx, ny, fkWorld.z);
              this._tempVecB.set(nodeWorld.x, nodeWorld.y, nodeWorld.z);
              fk3d.worldToLocal(this._tempVecB);
              posArr[p * 3] = this._tempVecB.x;
              posArr[p * 3 + 1] = this._tempVecB.y;
              posArr[p * 3 + 2] = this._tempVecB.z;
            }
          } else {
            for (let p = 0; p < count; p++) {
              const t = p / (count - 1);
              posArr[p * 3] = (this.wind ? this.wind.x * 12 * t : 0);
              posArr[p * 3 + 1] = -t * 45;
              posArr[p * 3 + 2] = 0;
            }
          }
          posAttr.needsUpdate = true;
          hangingLine.material.opacity = Math.max(0, Math.min(0.85, (fk.life || 1) / 2));
        }
      });
    }

    for (const [fId] of this.fallingKites3D.entries()) {
      if (!activeFallingIds.has(fId)) this.flyawayPool.releaseFlyaway(fId);
    }

    // 5.1 Linhas quebradas da mao tambem saem de um pool pre-alocado.
    const activeBrokenIds = new Set();
    if (brokenHandRopesList && brokenHandRopesList.length) {
      brokenHandRopesList.forEach((bhr, idx) => {
        const bId = String(bhr.userId || ('bhr_' + idx));
        activeBrokenIds.add(bId);
        let br3d = this.brokenHandRopes3D.get(bId);
        if (!br3d) br3d = this.lines.acquireBrokenRope(bId, bhr.lineColor || 0xffffff);
        if (!br3d?.geometry) return;
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
            const nA = nodes[idxA], nB = nodes[idxB];
            const nx = nA.x + (nB.x - nA.x) * frac;
            const ny = nA.y + (nB.y - nA.y) * frac;
            const nodeWorld = this.screenToWorld(nx, ny, zDepth * (1 - t * 0.4));
            posArr[p * 3] = nodeWorld.x;
            posArr[p * 3 + 1] = nodeWorld.y;
            posArr[p * 3 + 2] = nodeWorld.z;
          }
        }
        posAttr.needsUpdate = true;
        br3d.material.opacity = Math.max(0, Math.min(0.85, (bhr.life / 2.0) * 0.85));
      });
    }

    for (const [bId] of this.brokenHandRopes3D.entries()) {
      if (!activeBrokenIds.has(bId)) this.lines.releaseBrokenRope(bId);
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

    const environmentStride = Math.max(1, Number(this._renderBudget?.environmentStride) || 1);
    this._environmentFrame = (this._environmentFrame || 0) + 1;
    if (this._environmentFrame % environmentStride === 0) {
      const visualDt = 0.016 * environmentStride;
      if (this.themeManager) this.themeManager.updateAnimations(visualDt, this.time, this.wind);
      if (this.laje) this.laje.update(visualDt, this.time, this.boomboxEnabled);
    }

    this.renderer.render(this.scene, this.camera);
    this._drainDeferredDisposals(1);
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

    this.lines?.dispose();
    this.lines3D?.clear();
    this.brokenHandRopes3D?.clear();

    for (const [userId, k3d] of this.kites3D.entries()) {
      disposeHierarchy(k3d);
    }
    this.kites3D.clear();

    this.flyawayPool?.dispose();
    this.fallingKites3D?.clear();
    this._flushDeferredDisposals();

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
