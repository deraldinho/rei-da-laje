import * as THREE from 'three';
import { backdropHousePalette } from '../../BackdropLayout.js';
import { brazilTheme } from '../../BrazilThemes.js';
import {
  createBrickCanvas,
  createRoofTileCanvas,
  createHazeCanvas,
  createSolidMountainGeometry,
  disposeHierarchy
} from '../ThreeMaterials.js';
import { buildStateTheme } from './ThemeRegistry.js';

export class ThreeThemeManager {
  constructor(scene, camera, getVisibleBoundsAt) {
    this.scene = scene;
    this.camera = camera;
    this.getVisibleBoundsAt = getVisibleBoundsAt;

    this.themeCode = 'RJ';
    this.theme = brazilTheme('RJ');

    this.swayingTrees = [];
    this.favelaTrees = [];
    this.waterMeshes = [];
    this.pulsingBeacons = [];
    this.swayingClothes = [];
    this.rotatingWindTurbines = [];
    this.rotatingLighthouses = [];
    this.waterLilies = [];

    this.initGeometries();
    this.initMaterials();
  }

  hash(n) {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  initGeometries() {
    this.geoBox = new THREE.BoxGeometry(1, 1, 1);
    this.geoCyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
    this.geoSphere = new THREE.SphereGeometry(1, 14, 10);
    this.geoCone = new THREE.ConeGeometry(0.5, 1, 8);
  }

  initMaterials() {
    this.brickTex = createBrickCanvas();
    this.brickTex.repeat.set(1.5, 1.5);

    this.roofTex = createRoofTileCanvas();
    this.roofTex.repeat.set(2, 2);

    this.hazeTex = createHazeCanvas();
    this.hazeMat = new THREE.MeshBasicMaterial({
      map: this.hazeTex,
      color: this.theme.sky[1] || 0x8edce9,
      transparent: true,
      opacity: 0.38,
      depthWrite: false
    });

    const basePalette = backdropHousePalette();
    this.materials = basePalette.map(color => new THREE.MeshStandardMaterial({
      color,
      roughness: 0.86,
      metalness: 0.03
    }));

    this.brickMat = new THREE.MeshStandardMaterial({ map: this.brickTex, color: 0x9b4530, roughness: 0.88 });
    this.concreteMat = new THREE.MeshStandardMaterial({ color: 0x8a847e, roughness: 0.82 });
    this.stoneMat = new THREE.MeshStandardMaterial({ color: 0x58524b, roughness: 0.94 });
    this.slabMat = new THREE.MeshStandardMaterial({ color: 0xb58269, roughness: 0.68 });
    this.waterTankMat = new THREE.MeshStandardMaterial({ color: 0x0a58ca, roughness: 0.28, metalness: 0.18 });
    this.waterTankLidMat = new THREE.MeshStandardMaterial({ color: 0x084298, roughness: 0.24, metalness: 0.22 });
    this.windowMatLit = new THREE.MeshBasicMaterial({ color: 0xffdf82 });
    this.windowMatDark = new THREE.MeshBasicMaterial({ color: 0x1a2b38 });
    this.doorMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.7 });
    this.rebarMat = new THREE.MeshStandardMaterial({ color: 0x383838, roughness: 0.6, metalness: 0.8 });
    this.roofTileMat = new THREE.MeshStandardMaterial({ map: this.roofTex, color: 0xc45c3d, roughness: 0.8 });

    this.foliageMatA = new THREE.MeshStandardMaterial({ color: 0x276741, roughness: 0.9 });
    this.foliageMatB = new THREE.MeshStandardMaterial({ color: 0x35824c, roughness: 0.88 });
    this.palmMat = new THREE.MeshStandardMaterial({ color: 0x228b48, roughness: 0.85 });
    this.woodMat = new THREE.MeshStandardMaterial({ color: 0x52392b, roughness: 0.92 });
    this.rockMat = new THREE.MeshStandardMaterial({ color: 0x474a4d, roughness: 0.95 });

    this.terrainMat = new THREE.MeshStandardMaterial({
      color: this.theme.terrain || 0x3f725d,
      roughness: 0.92,
      metalness: 0.02,
      flatShading: true,
      side: THREE.DoubleSide
    });

    this.distantTerrainMat = new THREE.MeshStandardMaterial({
      color: this.theme.terrain || 0x3f725d,
      roughness: 0.96,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });

    this.skyscraperMatA = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7, metalness: 0.2 });
    this.skyscraperMatB = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.3 });
    this.glassWindowMat = new THREE.MeshBasicMaterial({ color: 0x93c5fd });
    this.redBeaconMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    this.neonBillboardMatA = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    this.neonBillboardMatB = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

    this.colonialPastelMats = [
      new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x059669, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.7 }),
      new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.8 })
    ];

    this.araucariaTrunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2817, roughness: 0.95 });
    this.araucariaFoliageMat = new THREE.MeshStandardMaterial({ color: 0x143d23, roughness: 0.9 });
    this.sandDuneMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.95, flatShading: true });
    this.lagoonWaterMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85 });
    this.oceanTurquoiseMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.15, metalness: 0.35, transparent: true, opacity: 0.88 });
    this.cerradoTrunkMat = new THREE.MeshStandardMaterial({ color: 0x573e27, roughness: 0.95 });
    this.cerradoFoliageMat = new THREE.MeshStandardMaterial({ color: 0x657e38, roughness: 0.9 });
    this.redSandstoneMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.92, flatShading: true });
    this.cactusMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
    this.pantanalWaterMat = new THREE.MeshStandardMaterial({ color: 0x0e7490, roughness: 0.2, metalness: 0.4, transparent: true, opacity: 0.8 });
    this.ipeFlowersMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.8 });
    this.ipePinkMat = new THREE.MeshStandardMaterial({ color: 0xd946ef, roughness: 0.8 });
    this.amazonForestMatA = new THREE.MeshStandardMaterial({ color: 0x114224, roughness: 0.9 });
    this.amazonForestMatB = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.88 });
    this.amazonWaterMat = new THREE.MeshStandardMaterial({ color: 0x132a2f, roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.88 });
    this.goldChurchMat = new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.85, roughness: 0.25 });
    this.modernistWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    this.jangadaSailMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.75, side: THREE.DoubleSide });
    this.boatMatA = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.7 });
    this.boatMatB = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
    this.lighthouseMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    this.lighthouseRedMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    this.acUnitMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.4 });
    this.barrelWoodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
    this.ceramicPotMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.8 });
    this.copperLampMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.7, roughness: 0.3 });
    this.windTurbineMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.1 });
    this.vitoriaRegiaMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8, side: THREE.DoubleSide });
    this.vitoriaFlowerMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    this.cableStayMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    this.cristoMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.65 });
    this.teatroDomeMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.35, metalness: 0.2 });
    this.teatroYellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35, metalness: 0.2 });
    this.lightBeamMat = new THREE.MeshBasicMaterial({ color: 0xfffde7, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false });
    this.waterfallFoamMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });

    this.rioGraniteMat = new THREE.MeshStandardMaterial({ color: 0x6b8f9e, roughness: 0.88, metalness: 0.05, flatShading: true });
    this.rioSlopeJungleMat = new THREE.MeshStandardMaterial({ color: 0x1d4d31, roughness: 0.92, metalness: 0.02, flatShading: true });
    this.rioSandMat = new THREE.MeshStandardMaterial({ color: 0xeedbb0, roughness: 0.94, metalness: 0.0 });
    this.rioSurfMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 });
    this.rioCityMatA = new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.82 });
    this.rioCityMatB = new THREE.MeshStandardMaterial({ color: 0xdfd7ca, roughness: 0.84 });
    this.rioCanMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.85, roughness: 0.22 });
  }

  getBuildContext() {
    return {
      geoBox: this.geoBox,
      geoCyl: this.geoCyl,
      geoSphere: this.geoSphere,
      geoCone: this.geoCone,

      skyscraperMatA: this.skyscraperMatA,
      skyscraperMatB: this.skyscraperMatB,
      glassWindowMat: this.glassWindowMat,
      redBeaconMat: this.redBeaconMat,
      neonBillboardMatA: this.neonBillboardMatA,
      neonBillboardMatB: this.neonBillboardMatB,
      rebarMat: this.rebarMat,
      modernistWhiteMat: this.modernistWhiteMat,
      concreteMat: this.concreteMat,
      cableStayMat: this.cableStayMat,

      oceanTurquoiseMat: this.oceanTurquoiseMat,
      rioSandMat: this.rioSandMat,
      rioSurfMat: this.rioSurfMat,
      rioCityMatA: this.rioCityMatA,
      rioCityMatB: this.rioCityMatB,
      rioGraniteMat: this.rioGraniteMat,
      rioSlopeJungleMat: this.rioSlopeJungleMat,
      rioCanMat: this.rioCanMat,
      stoneMat: this.stoneMat,
      cristoMat: this.cristoMat,
      boatMatA: this.boatMatA,
      boatMatB: this.boatMatB,
      jangadaSailMat: this.jangadaSailMat,
      woodMat: this.woodMat,
      palmMat: this.palmMat,

      colonialPastelMats: this.colonialPastelMats,
      roofTileMat: this.roofTileMat,
      doorMat: this.doorMat,
      goldChurchMat: this.goldChurchMat,
      ipePinkMat: this.ipePinkMat,
      ipeFlowersMat: this.ipeFlowersMat,

      araucariaTrunkMat: this.araucariaTrunkMat,
      araucariaFoliageMat: this.araucariaFoliageMat,
      sandDuneMat: this.sandDuneMat,
      lagoonWaterMat: this.lagoonWaterMat,
      windTurbineMat: this.windTurbineMat,
      lighthouseMat: this.lighthouseMat,
      lighthouseRedMat: this.lighthouseRedMat,
      lightBeamMat: this.lightBeamMat,
      redSandstoneMat: this.redSandstoneMat,
      cactusMat: this.cactusMat,
      waterfallFoamMat: this.waterfallFoamMat,

      amazonWaterMat: this.amazonWaterMat,
      amazonForestMatA: this.amazonForestMatA,
      amazonForestMatB: this.amazonForestMatB,
      vitoriaRegiaMat: this.vitoriaRegiaMat,
      vitoriaFlowerMat: this.vitoriaFlowerMat,
      teatroDomeMat: this.teatroDomeMat,
      teatroYellowMat: this.teatroYellowMat,

      cerradoTrunkMat: this.cerradoTrunkMat,
      cerradoFoliageMat: this.cerradoFoliageMat,
      pantanalWaterMat: this.pantanalWaterMat,
      barrelWoodMat: this.barrelWoodMat,
      rockMat: this.rockMat,

      waterMeshes: this.waterMeshes,
      pulsingBeacons: this.pulsingBeacons,
      rotatingWindTurbines: this.rotatingWindTurbines,
      rotatingLighthouses: this.rotatingLighthouses,
      waterLilies: this.waterLilies,
      swayingTrees: this.swayingTrees,

      hash: this.hash.bind(this)
    };
  }

  buildWorldElements(worldGroup) {
    this.worldGroup = worldGroup;

    this.buildSkyDome();
    this.buildSun();
    this.buildAtmosphericHaze();
    this.buildClouds();
    this.buildDistantMountains();
    this.buildAtmosphericParticles();
    this.buildAmbientKites();
    this.buildFlockOfBirds();
    this.buildHillsAndFavela();

    this.regionalMapGroup = new THREE.Group();
    this.worldGroup.add(this.regionalMapGroup);
  }

  buildSkyDome() {
    const skyGeo = new THREE.SphereGeometry(1600, 32, 24);
    skyGeo.scale(-1, 1, 1);

    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 16;
    this.skyCanvas.height = 256;
    this.skyTexture = new THREE.CanvasTexture(this.skyCanvas);
    this.updateSkyTexture();

    this.skyMat = new THREE.MeshBasicMaterial({
      map: this.skyTexture,
      depthWrite: false
    });
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMat);
    this.skyMesh.position.set(0, 0, -100);
    this.worldGroup.add(this.skyMesh);
  }

  updateSkyTexture() {
    if (!this.skyCanvas) return;
    const ctx = this.skyCanvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    const topHex = '#' + (this.theme.sky[0] || 0x168bd2).toString(16).padStart(6, '0');
    const botHex = '#' + (this.theme.sky[1] || 0x8edce9).toString(16).padStart(6, '0');
    grad.addColorStop(0, topHex);
    grad.addColorStop(0.72, botHex);
    grad.addColorStop(1, '#ffffff');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 256);
    if (this.skyTexture) this.skyTexture.needsUpdate = true;
  }

  buildSun() {
    const sunGeo = new THREE.SphereGeometry(34, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfffaea });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.sunMesh.position.set(290, 250, -680);
    this.worldGroup.add(this.sunMesh);

    const haloGeo = new THREE.RingGeometry(32, 95, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xffe28a,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.sunHalo = new THREE.Mesh(haloGeo, haloMat);
    this.sunMesh.add(this.sunHalo);

    const outerGeo = new THREE.RingGeometry(90, 240, 32);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xffd175,
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.sunAura = new THREE.Mesh(outerGeo, outerMat);
    this.sunMesh.add(this.sunAura);
  }

  buildAtmosphericHaze() {
    this.hazeGroup = new THREE.Group();
    this.worldGroup.add(this.hazeGroup);

    const hazePlanesData = [
      { y: 60, z: -580, w: 1800, h: 220, opacity: 0.42 },
      { y: -20, z: -450, w: 1600, h: 180, opacity: 0.28 }
    ];

    hazePlanesData.forEach(hd => {
      const geo = new THREE.PlaneGeometry(hd.w, hd.h);
      const mat = new THREE.MeshBasicMaterial({
        map: this.hazeTex,
        color: this.theme.sky[1] || 0x8edce9,
        transparent: true,
        opacity: hd.opacity,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, hd.y, hd.z);
      this.hazeGroup.add(mesh);
    });
  }

  buildAtmosphericParticles() {
    const particleCount = 75;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 800;
      positions[i * 3 + 1] = -100 + Math.random() * 450;
      positions[i * 3 + 2] = -400 + Math.random() * 600;

      speeds[i * 3] = 0.2 + Math.random() * 0.4;
      speeds[i * 3 + 1] = 0.1 + Math.random() * 0.2;
      speeds[i * 3 + 2] = 0.05 + Math.random() * 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleSpeeds = speeds;

    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255, 245, 210, 0.9)');
    grad.addColorStop(0.5, 'rgba(255, 230, 160, 0.4)');
    grad.addColorStop(1, 'rgba(255, 220, 140, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
    const pTex = new THREE.CanvasTexture(c);

    const material = new THREE.PointsMaterial({
      size: 4.5,
      map: pTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sunMotes = new THREE.Points(geometry, material);
    this.worldGroup.add(this.sunMotes);
  }

  buildClouds() {
    this.cloudsGroup = new THREE.Group();
    this.worldGroup.add(this.cloudsGroup);

    this.cloudList = [];
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff5e6,
      emissiveIntensity: 0.38,
      roughness: 0.95,
      metalness: 0.0,
      transparent: true,
      opacity: 0.82
    });

    for (let c = 0; c < 8; c++) {
      const cloud = new THREE.Group();
      const numPuffs = 6;
      for (let p = 0; p < numPuffs; p++) {
        const puff = new THREE.Mesh(this.geoSphere, cloudMat);
        const r = 24 + this.hash(c * 19 + p * 7) * 20;
        puff.scale.set(r * 2.1, r * 0.65, r * 1.35);
        puff.position.set(
          (p - 2.5) * 32 + (this.hash(p * 3) - 0.5) * 14,
          (this.hash(p + 3) - 0.5) * 6,
          (this.hash(p + 7) - 0.5) * 12
        );
        puff.castShadow = false;
        cloud.add(puff);
      }

      cloud.position.set(
        -520 + c * 160 + (this.hash(c * 5) - 0.5) * 40,
        260 + (c % 4) * 38,
        -460 - (c % 3) * 140
      );
      cloud.userData = { speed: 0.07 + (c % 4) * 0.03, baseX: cloud.position.x };
      this.cloudsGroup.add(cloud);
      this.cloudList.push(cloud);
    }
  }

  buildDistantMountains() {
    this.distantGroup = new THREE.Group();
    this.worldGroup.add(this.distantGroup);

    this.distantPeaks = [];
    const peakGeo = new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);

    const peaksData = [
      { xNorm: -0.45, yNorm: 0.10, w: 280, h: 160, z: -760 },
      { xNorm: -0.22, yNorm: 0.07, w: 230, h: 130, z: -780 },
      { xNorm: 0.24, yNorm: 0.08, w: 250, h: 140, z: -770 },
      { xNorm: 0.48, yNorm: 0.12, w: 300, h: 175, z: -750 }
    ];

    peaksData.forEach((pd, idx) => {
      const mesh = new THREE.Mesh(peakGeo, this.distantTerrainMat);
      mesh.scale.set(pd.w, pd.h, pd.w * 0.7);
      mesh.rotation.y = idx * 0.5;
      mesh.castShadow = false;
      mesh.userData = pd;
      this.distantGroup.add(mesh);
      this.distantPeaks.push(mesh);
    });
  }

  buildAmbientKites() {
    this.kitesGroup = new THREE.Group();
    this.worldGroup.add(this.kitesGroup);

    this.ambientKiteList = [];
    const kiteShape = new THREE.Shape();
    kiteShape.moveTo(0, 14);
    kiteShape.lineTo(9.5, 0);
    kiteShape.lineTo(0, -14);
    kiteShape.lineTo(-9.5, 0);
    kiteShape.closePath();
    const kiteGeo = new THREE.ShapeGeometry(kiteShape);

    const kiteColors = [0xff3366, 0xffeb3b, 0x00e676, 0x00b0ff, 0x7c4dff, 0xff9100];

    for (let k = 0; k < 6; k++) {
      const mat = new THREE.MeshBasicMaterial({
        color: kiteColors[k % kiteColors.length],
        side: THREE.DoubleSide
      });
      const kite = new THREE.Mesh(kiteGeo, mat);
      const startX = -280 + k * 110 + (this.hash(k * 7) - 0.5) * 50;
      const startY = 80 + (k % 4) * 45;
      const startZ = -300 - (k % 3) * 100;
      kite.position.set(startX, startY, startZ);
      const sc = 0.85 + this.hash(k) * 0.45;
      kite.scale.set(sc, sc, sc);
      kite.userData = {
        baseX: startX,
        baseY: startY,
        seed: k * 19.3,
        rotSpeed: 0.8 + this.hash(k) * 0.6
      };
      this.kitesGroup.add(kite);
      this.ambientKiteList.push(kite);
    }
  }

  buildFlockOfBirds() {
    this.birdsGroup = new THREE.Group();
    this.worldGroup.add(this.birdsGroup);

    this.flock = [];
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x1e293b, side: THREE.DoubleSide });

    const leftWingGeo = new THREE.BufferGeometry();
    const leftVerts = new Float32Array([0, 0, 0, -3.4, 0.4, -1.2, -0.6, 0, 1.2]);
    leftWingGeo.setAttribute('position', new THREE.BufferAttribute(leftVerts, 3));
    leftWingGeo.computeVertexNormals();

    const rightWingGeo = new THREE.BufferGeometry();
    const rightVerts = new Float32Array([0, 0, 0, 0.6, 0, 1.2, 3.4, 0.4, -1.2]);
    rightWingGeo.setAttribute('position', new THREE.BufferAttribute(rightVerts, 3));
    rightWingGeo.computeVertexNormals();

    const numBirds = 7;
    for (let b = 0; b < numBirds; b++) {
      const bird = new THREE.Group();

      const leftWing = new THREE.Mesh(leftWingGeo, birdMat);
      bird.add(leftWing);

      const rightWing = new THREE.Mesh(rightWingGeo, birdMat);
      bird.add(rightWing);

      const offX = (b - numBirds * 0.5) * 16 + (this.hash(b * 13) - 0.5) * 8;
      const offY = -Math.abs(b - numBirds * 0.5) * 4 + (this.hash(b * 17) - 0.5) * 6;
      const offZ = (b - numBirds * 0.5) * 6;

      bird.position.set(-360 + offX, 160 + offY, -350 + offZ);
      bird.userData = {
        leftWing,
        rightWing,
        flapSpeed: 10 + (b % 3) * 2.2,
        wingPhase: b * 0.65,
        baseOffX: offX,
        baseOffY: offY,
        baseOffZ: offZ
      };

      this.birdsGroup.add(bird);
      this.flock.push(bird);
    }
  }

  buildFavelaHouse(seed, palette, isLeft) {
    const houseGroup = new THREE.Group();

    const hw = 18 + this.hash(seed + 3) * 15;
    const hh = 17 + this.hash(seed + 4) * 18;
    const hd = 18 + this.hash(seed + 5) * 14;

    const hasUpperFloor = this.hash(seed + 6) > 0.36;
    const isExposedBrick = this.hash(seed + 7) > 0.38;
    const hasPitchedRoof = !hasUpperFloor && (this.hash(seed + 8) > 0.68);

    const foundationDepth = 75;
    const foundationMesh = new THREE.Mesh(this.geoBox, this.stoneMat);
    foundationMesh.scale.set(hw + 1.4, foundationDepth, hd + 1.4);
    foundationMesh.position.y = -foundationDepth * 0.5;
    foundationMesh.castShadow = false;
    foundationMesh.receiveShadow = true;
    houseGroup.add(foundationMesh);

    const groundMat = isExposedBrick ? this.brickMat : this.materials[Math.floor(this.hash(seed + 9) * this.materials.length)];
    const groundBody = new THREE.Mesh(this.geoBox, groundMat);
    groundBody.scale.set(hw, hh, hd);
    groundBody.position.y = hh * 0.5;
    groundBody.castShadow = false;
    groundBody.receiveShadow = true;
    houseGroup.add(groundBody);

    const doorH = Math.min(hh * 0.55, 13);
    const doorW = Math.min(hw * 0.35, 7.5);
    const doorMesh = new THREE.Mesh(this.geoBox, this.doorMat);
    doorMesh.scale.set(doorW, doorH, 0.6);
    doorMesh.position.set(-hw * 0.22, doorH * 0.5, hd * 0.5 + 0.3);
    houseGroup.add(doorMesh);

    const winW = hw * 0.28, winH = hh * 0.24;
    const winMat = this.hash(seed + 10) > 0.42 ? this.windowMatLit : this.windowMatDark;
    const winMesh = new THREE.Mesh(this.geoBox, winMat);
    winMesh.scale.set(winW, winH, 0.7);
    winMesh.position.set(hw * 0.22, hh * 0.55, hd * 0.5 + 0.35);
    houseGroup.add(winMesh);

    let topY = hh;

    if (hasUpperFloor) {
      const uh = 14 + this.hash(seed + 11) * 12;
      const uw = hw * (0.85 + this.hash(seed + 12) * 0.2);
      const ud = hd * (0.85 + this.hash(seed + 13) * 0.2);
      const shiftX = (this.hash(seed + 14) - 0.5) * 3;

      const midSlab = new THREE.Mesh(this.geoBox, this.slabMat);
      midSlab.scale.set(hw + 2, 2.2, hd + 2);
      midSlab.position.set(0, topY + 1.1, 0);
      houseGroup.add(midSlab);

      const upperMat = (this.hash(seed + 15) > 0.45)
        ? this.brickMat
        : this.materials[Math.floor(this.hash(seed + 16) * this.materials.length)];
      const upperBody = new THREE.Mesh(this.geoBox, upperMat);
      upperBody.scale.set(uw, uh, ud);
      upperBody.position.set(shiftX, topY + 2.2 + uh * 0.5, 0);
      upperBody.castShadow = false;
      upperBody.receiveShadow = true;
      houseGroup.add(upperBody);

      const upWin = new THREE.Mesh(this.geoBox, this.hash(seed + 17) > 0.35 ? this.windowMatLit : this.windowMatDark);
      upWin.scale.set(uw * 0.34, uh * 0.28, 0.7);
      upWin.position.set(shiftX, topY + 2.2 + uh * 0.58, ud * 0.5 + 0.35);
      houseGroup.add(upWin);

      topY += 2.2 + uh;
    }

    if (hasPitchedRoof) {
      const roofH = 7 + this.hash(seed + 18) * 4;
      const roofMesh = new THREE.Mesh(this.geoCone, this.roofTileMat);
      roofMesh.scale.set(hw * 1.35, roofH, hd * 1.35);
      roofMesh.position.set(0, topY + roofH * 0.5, 0);
      roofMesh.rotation.y = Math.PI * 0.25;
      roofMesh.castShadow = false;
      houseGroup.add(roofMesh);
    } else {
      const slabMesh = new THREE.Mesh(this.geoBox, this.slabMat);
      slabMesh.scale.set(hw + 2.4, 2.2, hd + 2.4);
      slabMesh.position.set(0, topY + 1.1, 0);
      slabMesh.castShadow = false;
      houseGroup.add(slabMesh);

      const parapet = new THREE.Mesh(this.geoBox, isExposedBrick ? this.brickMat : this.concreteMat);
      parapet.scale.set(hw + 2, 4.2, hd + 2);
      parapet.position.set(0, topY + 2.2 + 2.1, 0);
      parapet.castShadow = false;
      houseGroup.add(parapet);

      const colW = 1.8, colH = 6.5;
      const corners = [
        [-hw * 0.46, -hd * 0.46],
        [hw * 0.46, -hd * 0.46],
        [-hw * 0.46, hd * 0.46],
        [hw * 0.46, hd * 0.46]
      ];

      corners.forEach(([cx, cz]) => {
        const col = new THREE.Mesh(this.geoBox, this.concreteMat);
        col.scale.set(colW, colH, colW);
        col.position.set(cx, topY + 2.2 + colH * 0.5, cz);
        houseGroup.add(col);

        const rebar = new THREE.Mesh(this.geoCyl, this.rebarMat);
        rebar.scale.set(0.3, 3.5, 0.3);
        rebar.position.set(cx, topY + 2.2 + colH + 1.75, cz);
        houseGroup.add(rebar);
      });

      if (this.hash(seed + 19) > 0.42) {
        const tankGroup = new THREE.Group();
        const tr = 3.6 + this.hash(seed + 20) * 1.6;
        const th = 6.2 + this.hash(seed + 21) * 2.4;

        const pallet = new THREE.Mesh(this.geoBox, this.woodMat);
        pallet.scale.set(tr * 2.3, 1.2, tr * 2.3);
        pallet.position.y = 0.6;
        tankGroup.add(pallet);

        const tank = new THREE.Mesh(this.geoCyl, this.waterTankMat);
        tank.scale.set(tr * 2, th, tr * 2);
        tank.position.y = 1.2 + th * 0.5;
        tankGroup.add(tank);

        const lid = new THREE.Mesh(this.geoCyl, this.waterTankLidMat);
        lid.scale.set(tr * 2.2, 1.4, tr * 2.2);
        lid.position.y = 1.2 + th + 0.7;
        tankGroup.add(lid);

        tankGroup.position.set(
          (this.hash(seed + 22) - 0.5) * (hw * 0.4),
          topY + 2.2,
          (this.hash(seed + 23) - 0.5) * (hd * 0.4)
        );
        houseGroup.add(tankGroup);
      }

      if (this.hash(seed + 24) > 0.72) {
        const clothesline = new THREE.Group();
        const numClothes = 3 + Math.floor(this.hash(seed + 25) * 3);
        const clothColors = [0xff4444, 0xffeb3b, 0x00e5ff, 0xffffff, 0x76ff03];

        for (let c = 0; c < numClothes; c++) {
          const clothMat = new THREE.MeshBasicMaterial({
            color: clothColors[Math.floor(this.hash(seed + 26 + c) * clothColors.length)],
            side: THREE.DoubleSide
          });
          const cloth = new THREE.Mesh(this.geoBox, clothMat);
          cloth.scale.set(2.8, 3.8, 0.2);
          cloth.position.set((c - numClothes * 0.5) * 3.4, 3, 0);
          cloth.rotation.x = 0.12;
          clothesline.add(cloth);
          this.swayingClothes.push({ cloth, seed: seed + 26 + c });
        }

        clothesline.position.set(0, topY + 2.2, 0);
        houseGroup.add(clothesline);
      }

      if (this.hash(seed + 27) > 0.6) {
        const antenna = new THREE.Mesh(this.geoCyl, this.rebarMat);
        antenna.scale.set(0.4, 15, 0.4);
        antenna.position.set(
          (this.hash(seed + 28) - 0.5) * (hw * 0.5),
          topY + 9.7,
          (this.hash(seed + 29) - 0.5) * (hd * 0.5)
        );
        houseGroup.add(antenna);
      }
    }

    return houseGroup;
  }

  buildTropicalTree(seed, isPalm = false) {
    const tree = new THREE.Group();
    const h = 20 + this.hash(seed) * 16;

    if (isPalm) {
      const trunk = new THREE.Mesh(this.geoCyl, this.woodMat);
      trunk.scale.set(1.4, h, 1.4);
      trunk.position.y = h * 0.5;
      trunk.rotation.z = (this.hash(seed + 1) - 0.5) * 0.28;
      trunk.castShadow = false;
      tree.add(trunk);

      for (let f = 0; f < 5; f++) {
        const leaf = new THREE.Mesh(this.geoCone, this.palmMat);
        leaf.scale.set(5.5, 14, 0.6);
        leaf.position.set(0, h, 0);
        leaf.rotation.z = 1.1;
        leaf.rotation.y = (f / 5) * Math.PI * 2;
        tree.add(leaf);
      }
    } else {
      const trunk = new THREE.Mesh(this.geoCyl, this.woodMat);
      trunk.scale.set(2.2, h * 0.6, 2.2);
      trunk.position.y = h * 0.3;
      trunk.castShadow = false;
      tree.add(trunk);

      const crown = new THREE.Mesh(this.geoSphere, (this.hash(seed + 2) > 0.5) ? this.foliageMatA : this.foliageMatB);
      const cr = 10 + this.hash(seed + 3) * 8;
      crown.scale.set(cr * 1.3, cr, cr * 1.2);
      crown.position.y = h * 0.6 + cr * 0.7;
      crown.castShadow = false;
      tree.add(crown);
    }

    return tree;
  }

  buildHillsAndFavela() {
    this.favelaGroup = new THREE.Group();
    this.worldGroup.add(this.favelaGroup);

    this.leftHillGroup = new THREE.Group();
    this.rightHillGroup = new THREE.Group();
    this.favelaGroup.add(this.leftHillGroup, this.rightHillGroup);

    this.favelaPropsGroup = new THREE.Group();
    this.favelaGroup.add(this.favelaPropsGroup);

    this.favelaLeftGroup = new THREE.Group();
    this.favelaRightGroup = new THREE.Group();
    this.favelaPropsGroup.add(this.favelaLeftGroup, this.favelaRightGroup);

    const palette = backdropHousePalette();

    this.mountainSegmentsX = 24;
    this.mountainSegmentsY = 18;

    const leftTerrainGeo = createSolidMountainGeometry(this.mountainSegmentsX, this.mountainSegmentsY);
    this.leftMountainMesh = new THREE.Mesh(leftTerrainGeo, this.terrainMat);
    this.leftMountainMesh.receiveShadow = true;
    this.leftMountainMesh.castShadow = false;
    this.leftHillGroup.add(this.leftMountainMesh);

    const rightTerrainGeo = createSolidMountainGeometry(this.mountainSegmentsX, this.mountainSegmentsY);
    this.rightMountainMesh = new THREE.Mesh(rightTerrainGeo, this.terrainMat);
    this.rightMountainMesh.receiveShadow = true;
    this.rightMountainMesh.castShadow = false;
    this.rightHillGroup.add(this.rightMountainMesh);

    [true, false].forEach(isLeft => {
      const targetGroup = isLeft ? this.favelaLeftGroup : this.favelaRightGroup;
      const numHouses = 28;

      for (let i = 0; i < numHouses; i++) {
        const seed = (isLeft ? 1000 : 5000) + i * 37;
        const house = this.buildFavelaHouse(seed, palette, isLeft);

        const normX = 0.14 + (i / numHouses) * 0.70;
        const z = -410 + (i % 6) * 75 + (this.hash(seed + 1) - 0.5) * 20;

        house.userData = {
          isLeft,
          normX: Math.max(0.08, Math.min(0.88, normX)),
          depthZ: z,
          jitterX: (this.hash(seed + 2) - 0.5) * 8
        };
        targetGroup.add(house);
      }

      const numTrees = 20;
      for (let t = 0; t < numTrees; t++) {
        const tSeed = (isLeft ? 2000 : 7000) + t * 29;
        const isPalm = this.hash(tSeed) > 0.45;
        const tree = this.buildTropicalTree(tSeed, isPalm);

        const normX = 0.12 + (t / numTrees) * 0.74;
        const z = -360 + (t % 4) * 85 + (this.hash(tSeed + 1) - 0.5) * 25;

        tree.userData = {
          isTree: true,
          isLeft,
          normX: Math.max(0.1, Math.min(0.86, normX)),
          depthZ: z,
          seed: tSeed
        };
        targetGroup.add(tree);
        this.swayingTrees.push(tree);
        this.favelaTrees.push(tree);
      }

      const numRocks = 8;
      for (let r = 0; r < numRocks; r++) {
        const rSeed = (isLeft ? 2300 : 2900) + r * 41;
        const rock = new THREE.Mesh(this.geoSphere, this.rockMat);
        const rx = 16 + this.hash(rSeed) * 16;
        const ry = 14 + this.hash(rSeed + 1) * 12;
        const rz = 16 + this.hash(rSeed + 2) * 16;
        rock.scale.set(rx, ry, rz);
        rock.castShadow = false;
        rock.receiveShadow = true;

        const normX = 0.20 + (r / numRocks) * 0.62;
        const z = -330 + (r % 3) * 90;

        rock.userData = {
          isRock: true,
          isLeft,
          normX,
          depthZ: z,
          seed: rSeed
        };
        targetGroup.add(rock);
      }
    });
  }

  computeMorroHeight(x, z, isLeft, bounds) {
    const portrait = (bounds.height || 720) > (bounds.width || 1280);
    const boundsZ = this.getVisibleBoundsAt(z);

    const xInner = (isLeft ? -1 : 1) * boundsZ.width * (portrait ? 0.17 : 0.20);
    const xOuter = (isLeft ? -1 : 1) * boundsZ.width * 0.65;

    const span = xInner - xOuter;
    const norm = Math.max(0, Math.min(1, (x - xOuter) / span));

    const yBase = -boundsZ.height * (portrait ? 0.46 : 0.42);

    const feature = this.theme?.feature || 'morro';
    const c = this.themeCode || 'RJ';

    if (feature === 'metropole' || c === 'SP') {
      const yPeak = boundsZ.height * (portrait ? 0.11 : 0.09);
      const stepped = Math.floor(Math.pow(1 - norm, 0.9) * 4) / 4;
      const urbanGrade = stepped * 0.65 + (1 - norm) * 0.35;
      return yBase + urbanGrade * (yPeak - yBase);
    }

    if (feature === 'pampa' || c === 'RS') {
      const yPeak = boundsZ.height * (portrait ? 0.08 : 0.06);
      const coxilha = Math.sin(norm * Math.PI) * 10 + Math.sin(norm * 5.5 + (z + 200) * 0.012) * 5;
      return yBase + (1 - norm) * 0.45 * (yPeak - yBase) + coxilha;
    }

    if (feature === 'pantanal' || ['MT', 'MS'].includes(c)) {
      const yPeak = boundsZ.height * (portrait ? 0.05 : 0.04);
      return yBase + (1 - norm) * 0.28 * (yPeak - yBase) + Math.sin(norm * 3.14) * 3;
    }

    if (['dunas', 'lencois'].includes(feature) || ['CE', 'RN', 'MA'].includes(c)) {
      const yPeak = boundsZ.height * (portrait ? 0.18 : 0.15);
      const duneWave = Math.sin(norm * Math.PI * 1.5) * 14 + Math.cos(norm * 4.2 + (z + 200) * 0.015) * 7;
      return yBase + Math.pow(1 - norm, 1.1) * (yPeak - yBase) + duneWave;
    }

    if (['floresta', 'rio', 'amazonia', 'mangue'].includes(feature) || ['AM', 'PA', 'AC', 'RO', 'AP'].includes(c)) {
      const yPeak = boundsZ.height * (portrait ? 0.09 : 0.08);
      return yBase + Math.pow(1 - norm, 0.95) * (yPeak - yBase) + Math.sin(norm * 4.8) * 4;
    }

    if (['jalapao', 'sertao'].includes(feature) || ['TO', 'PI', 'SE'].includes(c)) {
      const yPeak = boundsZ.height * (portrait ? 0.22 : 0.19);
      const mesaStep = (1 - norm > 0.45) ? 0.8 : 0.25;
      return yBase + (mesaStep * 0.55 + (1 - norm) * 0.45) * (yPeak - yBase);
    }

    if (['cerrado', 'lavrado'].includes(feature) || ['DF', 'GO', 'RR'].includes(c)) {
      const yPeak = boundsZ.height * (portrait ? 0.16 : 0.14);
      return yBase + Math.pow(1 - norm, 1.05) * (yPeak - yBase) + Math.sin(norm * 3.8) * 4;
    }

    const yPeak = boundsZ.height * (portrait ? 0.25 : 0.22);
    const slope = Math.pow(1 - norm, 1.25);
    const zNorm = Math.max(0, Math.min(1, (z + 460) / 520));
    const depthPeak = 1.0 + (1 - zNorm) * 0.45;
    let y = yBase + slope * (yPeak - yBase) * depthPeak;
    const topoNoise = Math.sin(norm * 4.2 + (z + 200) * 0.018) * 8.5 + Math.cos(norm * 7.2 - (z + 200) * 0.024) * 5;
    y += topoNoise;
    return y;
  }

  updateSolidMountainMesh(mesh, isLeft, bounds) {
    if (!mesh || !mesh.geometry) return;
    const pos = mesh.geometry.attributes.position;
    const Nu = this.mountainSegmentsX;
    const Nv = this.mountainSegmentsY;
    const portrait = (bounds.height || 720) > (bounds.width || 1280);

    const yFloor = -bounds.height * (portrait ? 0.85 : 0.75);

    let idx = 0;
    for (let j = 0; j <= Nv; j++) {
      const v = j / Nv;
      const z = -460 + v * 520;
      const boundsZ = this.getVisibleBoundsAt(z);
      const xInner = (isLeft ? -1 : 1) * boundsZ.width * (portrait ? 0.17 : 0.20);
      const xOuter = (isLeft ? -1 : 1) * boundsZ.width * 0.65;

      for (let i = 0; i <= Nu; i++) {
        const u = i / Nu;
        const x = xOuter + u * (xInner - xOuter);
        const y = this.computeMorroHeight(x, z, isLeft, bounds);

        pos.setXYZ(idx, x, y, z);
        idx++;
      }
    }

    for (let j = 0; j <= Nv; j++) {
      const v = j / Nv;
      const z = -460 + v * 520;
      const boundsZ = this.getVisibleBoundsAt(z);
      const xInner = (isLeft ? -1 : 1) * boundsZ.width * (portrait ? 0.17 : 0.20);
      pos.setXYZ(idx, xInner, yFloor, z);
      idx++;
    }

    for (let j = 0; j <= Nv; j++) {
      const v = j / Nv;
      const z = -460 + v * 520;
      const boundsZ = this.getVisibleBoundsAt(z);
      const xOuter = (isLeft ? -1 : 1) * boundsZ.width * 0.65;
      pos.setXYZ(idx, xOuter, yFloor, z);
      idx++;
    }

    {
      const z = -460;
      const boundsZ = this.getVisibleBoundsAt(z);
      const xInner = (isLeft ? -1 : 1) * boundsZ.width * (portrait ? 0.17 : 0.20);
      const xOuter = (isLeft ? -1 : 1) * boundsZ.width * 0.65;
      for (let i = 0; i <= Nu; i++) {
        const u = i / Nu;
        const x = xOuter + u * (xInner - xOuter);
        pos.setXYZ(idx, x, yFloor, z);
        idx++;
      }
    }

    {
      const z = 60;
      const boundsZ = this.getVisibleBoundsAt(z);
      const xInner = (isLeft ? -1 : 1) * boundsZ.width * (portrait ? 0.17 : 0.20);
      const xOuter = (isLeft ? -1 : 1) * boundsZ.width * 0.65;
      for (let i = 0; i <= Nu; i++) {
        const u = i / Nu;
        const x = xOuter + u * (xInner - xOuter);
        pos.setXYZ(idx, x, yFloor, z);
        idx++;
      }
    }

    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }

  layoutFavelaMorros() {
    if (!this.camera || !this.leftHillGroup || !this.rightHillGroup) return;

    const bounds = this.getVisibleBoundsAt(-180);
    const portrait = (bounds.height || 720) > (bounds.width || 1280);

    this.updateSolidMountainMesh(this.leftMountainMesh, true, bounds);
    this.updateSolidMountainMesh(this.rightMountainMesh, false, bounds);

    if (this.favelaPropsGroup && this.favelaPropsGroup.visible && this.favelaLeftGroup && this.favelaRightGroup) {
      [this.favelaLeftGroup, this.favelaRightGroup].forEach(group => {
        group.children.forEach(child => {
          const data = child.userData;
          if (!data || data.normX === undefined) return;
          const isLeft = data.isLeft;

          const z = data.depthZ;
          const boundsZ = this.getVisibleBoundsAt(z);
          const xInner = (isLeft ? -1 : 1) * boundsZ.width * (portrait ? 0.17 : 0.20);
          const xOuter = (isLeft ? -1 : 1) * boundsZ.width * 0.65;

          const x = xOuter + data.normX * (xInner - xOuter) + (data.jitterX || 0);
          const groundY = this.computeMorroHeight(x, z, isLeft, bounds);

          if (data.isRock) {
            child.position.set(x, groundY - 4, z);
          } else {
            child.position.set(x, groundY, z);
          }
        });
      });
    }

    if (this.regionalMapGroup) {
      this.regionalMapGroup.children.forEach(child => {
        const data = child.userData;
        if (!data || data.normX === undefined) return;
        const isLeft = data.isLeft;
        const z = data.depthZ !== undefined ? data.depthZ : -380;
        const boundsZ = this.getVisibleBoundsAt(z);
        const xInner = (isLeft ? -1 : 1) * boundsZ.width * (portrait ? 0.17 : 0.20);
        const xOuter = (isLeft ? -1 : 1) * boundsZ.width * 0.65;
        const x = xOuter + data.normX * (xInner - xOuter) + (data.jitterX || 0);
        const groundY = this.computeMorroHeight(x, z, isLeft, bounds);
        const yOff = data.offsetY || 0;
        child.position.set(x, groundY + yOff, z);
      });
    }

    if (this.distantPeaks && this.distantPeaks.length) {
      this.distantPeaks.forEach(peak => {
        const pd = peak.userData;
        const x = bounds.width * pd.xNorm * 1.5;
        const y = bounds.height * pd.yNorm;
        peak.position.set(x, y, pd.z);
      });
    }
  }

  setTheme(code, dirLight, hemiLight) {
    this.themeCode = String(code || 'RJ').toUpperCase();
    this.theme = brazilTheme(this.themeCode);

    try {
      localStorage.setItem('rei-da-laje-state', this.themeCode);
    } catch (_) {}

    this.updateSkyTexture();

    if (this.scene?.fog) {
      const fogHex = this.theme.sky[1] || 0x8edce9;
      this.scene.fog.color.setHex(fogHex);
    }

    if (this.hazeGroup && this.hazeGroup.children) {
      const hazeColorHex = this.theme.sky[1] || 0x8edce9;
      this.hazeGroup.children.forEach(mesh => {
        if (mesh.material && mesh.material.color) {
          mesh.material.color.setHex(hazeColorHex);
        }
      });
    }

    if (this.terrainMat) {
      this.terrainMat.color.setHex(this.theme.terrain || 0x3f725d);
      if (['CE', 'RN', 'MA'].includes(this.themeCode)) {
        this.terrainMat.roughness = 0.96;
        this.terrainMat.flatShading = false;
      } else if (['TO', 'PI', 'DF', 'GO', 'RR'].includes(this.themeCode)) {
        this.terrainMat.roughness = 0.92;
        this.terrainMat.flatShading = true;
      } else if (this.themeCode === 'SP') {
        this.terrainMat.roughness = 0.85;
        this.terrainMat.flatShading = false;
      } else {
        this.terrainMat.roughness = 0.92;
        this.terrainMat.flatShading = true;
      }
      this.terrainMat.needsUpdate = true;
    }

    if (this.distantTerrainMat) {
      if (this.themeCode === 'RJ') {
        this.distantTerrainMat.color.setHex(0x5a8399);
      } else {
        this.distantTerrainMat.color.setHex(this.theme.terrain || 0x3f725d);
      }
      this.distantTerrainMat.needsUpdate = true;
    }

    if (this.favelaPropsGroup) {
      this.favelaPropsGroup.visible = (this.themeCode === 'RJ');
    }

    this.swayingTrees = (this.themeCode === 'RJ') ? [...this.favelaTrees] : [];

    this.updateAtmosphere(this.theme, dirLight, hemiLight);
    this.updateDistantPeaksForTheme(this.theme.feature, this.themeCode);
    this.buildRegionalMap(this.themeCode, this.theme);
    this.layoutFavelaMorros();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pipa:map_changed', { detail: { code: this.themeCode, theme: this.theme } }));
    }

    return this.theme;
  }

  updateAtmosphere(theme, dirLight, hemiLight) {
    if (!theme || !dirLight || !hemiLight) return;
    const region = theme.region || 'Sudeste';

    if (region === 'Norte') {
      dirLight.color.setHex(0xfff7d6);
      hemiLight.color.setHex(0x86d7e6);
      hemiLight.groundColor.setHex(0x28593a);
    } else if (region === 'Nordeste') {
      dirLight.color.setHex(0xffeaad);
      hemiLight.color.setHex(0xa2e8f5);
      hemiLight.groundColor.setHex(0x8a6234);
    } else if (region === 'Centro-Oeste') {
      dirLight.color.setHex(0xfff0c9);
      hemiLight.color.setHex(0xb2dfeb);
      hemiLight.groundColor.setHex(0x6e5239);
    } else if (region === 'Sul') {
      dirLight.color.setHex(0xfaf2e8);
      hemiLight.color.setHex(0x99cbdf);
      hemiLight.groundColor.setHex(0x344b36);
    } else {
      dirLight.color.setHex(0xfff1cf);
      hemiLight.color.setHex(0x9ee5ff);
      hemiLight.groundColor.setHex(0x3d3024);
    }
  }

  updateDistantPeaksForTheme(feature, code) {
    if (!this.distantPeaks || !this.distantPeaks.length) return;
    const f = String(feature || 'morro').toLowerCase();
    const c = String(code || 'RJ').toUpperCase();

    this.distantPeaks.forEach(mesh => {
      const pd = mesh.userData || {};
      let scX = pd.w || 240;
      let scY = pd.h || 160;
      let scZ = (pd.w || 240) * 0.7;

      if (f === 'metropole' || c === 'SP') {
        scX = (pd.w || 240) * 0.75;
        scY = (pd.h || 160) * 1.5;
        scZ = scX;
      } else if (f === 'cerrado' || f === 'jalapao' || c === 'DF' || c === 'TO') {
        scX = (pd.w || 240) * 1.35;
        scY = (pd.h || 160) * 0.75;
        scZ = scX * 0.9;
      } else if (f === 'dunas' || f === 'lencois' || c === 'MA' || c === 'CE') {
        scX = (pd.w || 240) * 1.4;
        scY = (pd.h || 160) * 0.55;
        scZ = scX * 1.1;
      } else if (f === 'araucarias' || f === 'pampa' || c === 'PR' || c === 'RS') {
        scX = (pd.w || 240) * 1.25;
        scY = (pd.h || 160) * 0.85;
        scZ = scX * 0.85;
      } else if (f === 'floresta' || f === 'rio' || f === 'amazonia' || c === 'AM' || c === 'PA') {
        scX = (pd.w || 240) * 1.3;
        scY = (pd.h || 160) * 0.65;
        scZ = scX * 1.1;
      }

      mesh.scale.set(scX, scY, scZ);
    });
  }

  buildRegionalMap(code, theme) {
    if (!this.regionalMapGroup) return;
    disposeHierarchy(this.regionalMapGroup);
    this.regionalMapGroup.clear();

    this.waterMeshes = [];
    this.pulsingBeacons = [];
    this.rotatingWindTurbines = [];
    this.rotatingLighthouses = [];
    this.waterLilies = [];

    const ctx = this.getBuildContext();
    buildStateTheme(code, this.regionalMapGroup, theme, ctx);

    if (this.themeCode !== 'RJ') {
      this.swayingTrees = ctx.swayingTrees || [];
    }
  }

  updateAnimations(delta, time, wind) {
    // 1. Árvores balançando
    const windStr = Math.hypot(wind?.x || 0, wind?.y || 0) * 0.15;
    if (this.swayingTrees && this.swayingTrees.length) {
      this.swayingTrees.forEach(tree => {
        const seed = tree.userData?.seed || 0;
        const sway = Math.sin(time * 2.2 + seed) * (0.04 + windStr * 0.08);
        tree.rotation.z = sway;
      });
    }

    // 2. Balizas pulsantes
    if (this.pulsingBeacons && this.pulsingBeacons.length) {
      const pulse = 1.0 + Math.sin(time * 5.0) * 0.35;
      this.pulsingBeacons.forEach(b => {
        const base = b.userData?.baseScale || 1.9;
        b.scale.set(base * pulse, base * pulse, base * pulse);
      });
    }

    // 3. Turbinas eólicas giratórias
    if (this.rotatingWindTurbines && this.rotatingWindTurbines.length) {
      const rotSpeed = 2.4 + windStr * 3.5;
      this.rotatingWindTurbines.forEach(rotor => {
        rotor.rotation.z += rotSpeed * delta;
      });
    }

    // 4. Faróis com feixe rotativo
    if (this.rotatingLighthouses && this.rotatingLighthouses.length) {
      this.rotatingLighthouses.forEach(beamGroup => {
        beamGroup.rotation.y += 1.2 * delta;
      });
    }

    // 5. Ondulação da água
    if (this.waterMeshes && this.waterMeshes.length) {
      this.waterMeshes.forEach((mesh, idx) => {
        const baseY = mesh.userData?.baseY || 10;
        mesh.position.y = baseY + Math.sin(time * 2.0 + idx * 1.5) * 0.45;
      });
    }

    // 6. Vitórias-régias flutuando
    if (this.waterLilies && this.waterLilies.length) {
      this.waterLilies.forEach((lily, idx) => {
        const baseY = lily.userData?.baseY || 13;
        lily.position.y = baseY + Math.sin(time * 2.5 + idx * 1.2) * 0.35;
        lily.rotation.y += 0.05 * delta;
      });
    }

    // 7. Roupas no varal
    if (this.swayingClothes && this.swayingClothes.length) {
      this.swayingClothes.forEach(({ cloth, seed }) => {
        cloth.rotation.x = Math.sin(time * 4.0 + seed) * (0.18 + windStr * 0.25);
      });
    }

    // 8. Nuvens em deriva
    if (this.cloudList && this.cloudList.length) {
      this.cloudList.forEach(cloud => {
        cloud.position.x += cloud.userData.speed * delta * 25;
        if (cloud.position.x > 850) {
          cloud.position.x = -850;
        }
      });
    }

    // 9. Pipas ambientes
    if (this.ambientKiteList && this.ambientKiteList.length) {
      this.ambientKiteList.forEach(kite => {
        const d = kite.userData;
        kite.position.x = d.baseX + Math.sin(time * d.rotSpeed + d.seed) * 22;
        kite.position.y = d.baseY + Math.cos(time * d.rotSpeed * 0.8 + d.seed) * 14;
        kite.rotation.z = Math.sin(time * d.rotSpeed + d.seed) * 0.22;
      });
    }

    // 10. Bando de pássaros voando em V
    if (this.flock && this.flock.length) {
      this.flock.forEach((bird, idx) => {
        const d = bird.userData;
        const flap = Math.sin(time * d.flapSpeed + d.wingPhase) * 0.55;
        if (d.leftWing) d.leftWing.rotation.z = flap;
        if (d.rightWing) d.rightWing.rotation.z = -flap;

        bird.position.x += 18 * delta;
        bird.position.y += Math.sin(time * 1.5 + idx) * 0.12;
        if (bird.position.x > 750) {
          bird.position.x = -750;
        }
      });
    }

    // 11. Partículas solares
    if (this.sunMotes && this.particleSpeeds) {
      const pos = this.sunMotes.geometry.attributes.position.array;
      const count = pos.length / 3;
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] -= this.particleSpeeds[i * 3 + 1] * delta * 35;
        pos[i * 3] += Math.sin(time + i) * 0.15;
        if (pos[i * 3 + 1] < -120) {
          pos[i * 3 + 1] = 380;
        }
      }
      this.sunMotes.geometry.attributes.position.needsUpdate = true;
    }
  }

  dispose() {
    if (this.regionalMapGroup) {
      disposeHierarchy(this.regionalMapGroup);
      this.regionalMapGroup.clear();
    }
    this.waterMeshes = [];
    this.pulsingBeacons = [];
    this.swayingTrees = [];
    this.favelaTrees = [];
    this.rotatingWindTurbines = [];
    this.rotatingLighthouses = [];
    this.waterLilies = [];
    this.swayingClothes = [];
    this.cloudList = [];
    this.ambientKiteList = [];
    this.flock = [];
  }
}
