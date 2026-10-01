import * as THREE from 'three';
import { rooftopHeight, rooftopAnchorY } from '../RooftopLayout.js';
import { createLajeFloorCanvas, createBrickCanvas, disposeHierarchy } from './ThreeMaterials.js';

export class ThreeLaje {
  constructor(sharedGeos = {}, sharedMats = {}) {
    this.geoBox = sharedGeos.box || new THREE.BoxGeometry(1, 1, 1);
    this.geoCyl = sharedGeos.cyl || new THREE.CylinderGeometry(1, 1, 1, 16);
    this.geoSphere = sharedGeos.sphere || new THREE.SphereGeometry(1, 16, 12);
    this.geoCone = sharedGeos.cone || new THREE.ConeGeometry(1, 1, 16);

    this.sharedMats = sharedMats;
    this.lajeFloorTex = createLajeFloorCanvas();
    this.brickTex = createBrickCanvas();

    this.group = new THREE.Group();
    this.foregroundTanks = [];
    this.foregroundProps = [];
    this.regionalLajeGroup = null;
    this.speakerCone = null;
    this.grillSmoke = null;

    this.initLaje();
  }

  initLaje() {
    const woodMat = this.sharedMats.wood || new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
    const brickMat = this.sharedMats.brick || new THREE.MeshStandardMaterial({ color: 0xa84a32, roughness: 0.85 });
    const concreteMat = this.sharedMats.concrete || new THREE.MeshStandardMaterial({ color: 0xd6d3cb, roughness: 0.82 });
    const waterTankMat = this.sharedMats.waterTank || new THREE.MeshStandardMaterial({ color: 0x005bbb, roughness: 0.45 });
    const waterTankLidMat = this.sharedMats.waterTankLid || new THREE.MeshStandardMaterial({ color: 0x003d7a, roughness: 0.5 });
    const rebarMat = this.sharedMats.rebar || new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 });
    const slabMat = this.sharedMats.slab || new THREE.MeshStandardMaterial({ color: 0x4a4a4a, roughness: 0.7 });
    const rioCanMat = this.sharedMats.rioCan || new THREE.MeshStandardMaterial({ color: 0xcc2222, metalness: 0.7, roughness: 0.3 });

    // Piso cerâmico texturizado da laje frontal
    this.lajeFloorMat = new THREE.MeshStandardMaterial({
      map: this.lajeFloorTex,
      color: 0x8a4634,
      roughness: 0.65,
      metalness: 0.08
    });
    this.lajeFloor = new THREE.Mesh(this.geoBox, this.lajeFloorMat);
    this.lajeFloor.scale.set(1200, 32, 220);
    this.lajeFloor.position.set(0, -16, 0);
    this.lajeFloor.receiveShadow = true;
    this.group.add(this.lajeFloor);

    // Mureta de proteção da laje na altura da cintura (permite visualização completa dos bonecos)
    this.lajeParapetMat = new THREE.MeshStandardMaterial({ color: 0xab5f46, roughness: 0.72 });
    this.lajeParapet = new THREE.Mesh(this.geoBox, this.lajeParapetMat);
    this.lajeParapet.scale.set(1200, 9.2, 12);
    this.lajeParapet.position.set(0, 4.6, 30);
    this.lajeParapet.castShadow = false;
    this.lajeParapet.receiveShadow = true;
    this.group.add(this.lajeParapet);

    // Pingadeira / beiral superior de concreto liso sobre a mureta
    this.lajeParapetCap = new THREE.Mesh(this.geoBox, concreteMat);
    this.lajeParapetCap.scale.set(1200, 2.0, 14);
    this.lajeParapetCap.position.set(0, 9.6, 30);
    this.lajeParapetCap.castShadow = false;
    this.lajeParapetCap.receiveShadow = true;
    this.group.add(this.lajeParapetCap);

    // Latinhas de refrigerante/cerveja apoiadas na mureta
    const canA = new THREE.Mesh(this.geoCyl, rioCanMat);
    canA.scale.set(2.4, 5.2, 2.4);
    canA.position.set(-68, 13.0, 30);
    canA.castShadow = false;
    this.group.add(canA);

    const canB = new THREE.Mesh(this.geoCyl, waterTankMat);
    canB.scale.set(2.4, 5.2, 2.4);
    canB.position.set(-61, 13.0, 31);
    canB.castShadow = false;
    this.group.add(canB);

    // Parede de tijolos aparentes descendo até a base inferior
    this.lajeWallMat = new THREE.MeshStandardMaterial({
      map: this.brickTex,
      color: 0x6e2c1e,
      roughness: 0.88
    });
    this.lajeWall = new THREE.Mesh(this.geoBox, this.lajeWallMat);
    this.lajeWall.scale.set(1200, 340, 18);
    this.lajeWall.position.set(0, -186, 34);
    this.lajeWall.receiveShadow = true;
    this.group.add(this.lajeWall);

    // Caixas d'água 1000L da laje frontal nos cantos externos
    this.foregroundTanks = [];
    [-1, 1].forEach(side => {
      const tankGroup = new THREE.Group();

      const pallet = new THREE.Mesh(this.geoBox, woodMat);
      pallet.scale.set(22, 2.5, 22);
      pallet.position.y = 1.25;
      tankGroup.add(pallet);

      const tankBody = new THREE.Mesh(this.geoCyl, waterTankMat);
      tankBody.scale.set(18, 20, 18);
      tankBody.position.y = 12.5;
      tankBody.castShadow = false;
      tankBody.receiveShadow = true;
      tankGroup.add(tankBody);

      const lid = new THREE.Mesh(this.geoCyl, waterTankLidMat);
      lid.scale.set(20, 2.8, 20);
      lid.position.y = 23.9;
      lid.castShadow = false;
      tankGroup.add(lid);

      const pipe = new THREE.Mesh(this.geoCyl, concreteMat);
      pipe.scale.set(1.4, 8, 1.4);
      pipe.position.set(9.5, 12, 0);
      pipe.rotation.z = Math.PI * 0.5;
      tankGroup.add(pipe);

      tankGroup.userData = { side };
      this.group.add(tankGroup);
      this.foregroundTanks.push(tankGroup);
    });

    // Canto esquerdo: churrasqueira de alvenaria e tijolos com fumaça
    const grill = new THREE.Group();
    const grillBody = new THREE.Mesh(this.geoBox, brickMat);
    grillBody.scale.set(14, 24, 12);
    grillBody.position.y = 12;
    grill.add(grillBody);

    const chimney = new THREE.Mesh(this.geoBox, brickMat);
    chimney.scale.set(7, 16, 7);
    chimney.position.set(0, 32, 0);
    grill.add(chimney);

    const smokeCount = 16;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(smokeCount * 3);
    for (let s = 0; s < smokeCount; s++) {
      smokePositions[s * 3] = (Math.random() - 0.5) * 3;
      smokePositions[s * 3 + 1] = 40 + s * 3.5;
      smokePositions[s * 3 + 2] = (Math.random() - 0.5) * 3;
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 5.5,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    this.grillSmoke = new THREE.Points(smokeGeo, smokeMat);
    grill.add(this.grillSmoke);

    // Cadeira de praia azul dobrável perto da churrasqueira
    const chairGroup = new THREE.Group();
    const chairSeatMat = new THREE.MeshStandardMaterial({ color: 0x0288d1, roughness: 0.65, side: THREE.DoubleSide });
    const chairSeat = new THREE.Mesh(new THREE.PlaneGeometry(8, 12), chairSeatMat);
    chairSeat.position.set(0, 6, 0);
    chairSeat.rotation.x = -0.45;
    chairGroup.add(chairSeat);

    const chairFrameMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.85, roughness: 0.25 });
    const leg1 = new THREE.Mesh(this.geoCyl, chairFrameMat);
    leg1.scale.set(0.35, 11, 0.35);
    leg1.position.set(-3.8, 5, 0);
    leg1.rotation.x = 0.35;
    chairGroup.add(leg1);

    const leg2 = new THREE.Mesh(this.geoCyl, chairFrameMat);
    leg2.scale.set(0.35, 11, 0.35);
    leg2.position.set(3.8, 5, 0);
    leg2.rotation.x = 0.35;
    chairGroup.add(leg2);

    chairGroup.position.set(13, 0, 4);
    chairGroup.rotation.y = 0.3;
    grill.add(chairGroup);

    grill.userData = { side: -1, isCornerProp: true, offsetRatio: 0.44 };
    this.group.add(grill);
    this.foregroundProps = [grill];

    // Canto direito: caixa de som (Boombox) com subwoofer
    const speaker = new THREE.Group();
    const spkBody = new THREE.Mesh(this.geoBox, rebarMat);
    spkBody.scale.set(13, 20, 11);
    spkBody.position.y = 10;
    speaker.add(spkBody);

    const spkCone = new THREE.Mesh(this.geoCyl, slabMat);
    spkCone.scale.set(7, 1.5, 7);
    spkCone.rotation.x = Math.PI * 0.5;
    spkCone.position.set(0, 12, 5.6);
    speaker.add(spkCone);
    this.speakerCone = spkCone;

    // Cadeira de praia amarela perto da caixa de som
    const chairYellowGroup = new THREE.Group();
    const chairYellowSeatMat = new THREE.MeshStandardMaterial({ color: 0xfbc02d, roughness: 0.65, side: THREE.DoubleSide });
    const chairYellowSeat = new THREE.Mesh(new THREE.PlaneGeometry(8, 12), chairYellowSeatMat);
    chairYellowSeat.position.set(0, 6, 0);
    chairYellowSeat.rotation.x = -0.45;
    chairYellowGroup.add(chairYellowSeat);

    const yLeg1 = new THREE.Mesh(this.geoCyl, chairFrameMat);
    yLeg1.scale.set(0.35, 11, 0.35);
    yLeg1.position.set(-3.8, 5, 0);
    yLeg1.rotation.x = 0.35;
    chairYellowGroup.add(yLeg1);

    const yLeg2 = new THREE.Mesh(this.geoCyl, chairFrameMat);
    yLeg2.scale.set(0.35, 11, 0.35);
    yLeg2.position.set(3.8, 5, 0);
    yLeg2.rotation.x = 0.35;
    chairYellowGroup.add(yLeg2);

    chairYellowGroup.position.set(-13, 0, 4);
    chairYellowGroup.rotation.y = -0.35;
    speaker.add(chairYellowGroup);

    speaker.userData = { side: 1, isCornerProp: true, offsetRatio: 0.44 };
    this.group.add(speaker);
    this.foregroundProps.push(speaker);

    // Grupo de adereços regionais
    this.regionalLajeGroup = new THREE.Group();
    this.group.add(this.regionalLajeGroup);
  }

  update(time, delta, boomboxEnabled = true) {
    // 1. Pulsação do subwoofer da caixa de som sincronizada com o ritmo do Boombox
    if (this.speakerCone) {
      if (boomboxEnabled) {
        const beat = Math.pow(Math.max(0, Math.sin(time * 8.5)), 3);
        const coneScale = 1 + beat * 0.28;
        this.speakerCone.scale.set(7 * coneScale, 1.5 * (1 + beat * 0.4), 7 * coneScale);
      } else {
        this.speakerCone.scale.set(7, 1.5, 7);
      }
    }

    // 2. Fumaça da churrasqueira
    if (this.grillSmoke && this.grillSmoke.geometry) {
      const pos = this.grillSmoke.geometry.attributes.position;
      if (pos) {
        const count = pos.count;
        for (let s = 0; s < count; s++) {
          let y = pos.getY(s) + 0.35 * (delta || 1);
          if (y > 90) y = 40;
          pos.setY(s, y);
          pos.setX(s, (Math.sin(time * 2 + s) * 2.5) + (Math.sin(time * 0.8) * 4));
        }
        pos.needsUpdate = true;
      }
    }
  }

  updateCulturalProps(code, fgBounds, portrait) {
    if (!this.regionalLajeGroup) return;
    disposeHierarchy(this.regionalLajeGroup);
    this.regionalLajeGroup.clear();

    const c = String(code || 'RJ').toUpperCase();
    const isRJ = (c === 'RJ');

    if (this.foregroundTanks) {
      this.foregroundTanks.forEach(t => { t.visible = isRJ; });
    }
    if (this.foregroundProps) {
      this.foregroundProps.forEach(p => { p.visible = isRJ; });
    }

    if (isRJ) return;

    const sideX = fgBounds.width * (portrait ? 0.52 : 0.485);
    const woodMat = this.sharedMats.wood || new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
    const acUnitMat = this.sharedMats.acUnit || new THREE.MeshStandardMaterial({ color: 0xededed, roughness: 0.4 });
    const rebarMat = this.sharedMats.rebar || new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.4 });
    const barrelWoodMat = this.sharedMats.barrelWood || new THREE.MeshStandardMaterial({ color: 0x6e3e1e, roughness: 0.8 });
    const ceramicPotMat = this.sharedMats.ceramicPot || new THREE.MeshStandardMaterial({ color: 0xba5232, roughness: 0.75 });
    const ipePinkMat = this.sharedMats.ipePink || new THREE.MeshStandardMaterial({ color: 0xff66cc, roughness: 0.8 });
    const ipeFlowersMat = this.sharedMats.ipeFlowers || new THREE.MeshStandardMaterial({ color: 0xffe600, roughness: 0.8 });
    const copperLampMat = this.sharedMats.copperLamp || new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.85 });
    const palmMat = this.sharedMats.palm || new THREE.MeshStandardMaterial({ color: 0x2d8a4e, roughness: 0.7 });
    const jangadaSailMat = this.sharedMats.jangadaSail || new THREE.MeshStandardMaterial({ color: 0xdfcfaf, roughness: 0.9 });
    const cactusMat = this.sharedMats.cactus || new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 });

    // SP: Ar condicionado de cobertura corporativa
    if (c === 'SP') {
      [-1, 1].forEach(side => {
        const ac = new THREE.Group();
        const body = new THREE.Mesh(this.geoBox, acUnitMat);
        body.scale.set(22, 18, 16);
        body.position.y = 9;
        body.castShadow = false;
        ac.add(body);

        const grill = new THREE.Mesh(this.geoBox, rebarMat);
        grill.scale.set(16, 12, 1.2);
        grill.position.set(0, 9, 8.5);
        grill.castShadow = false;
        ac.add(grill);

        ac.position.set(side * sideX, 0, -35);
        ac.userData = { side, isCulturalLaje: true };
        this.regionalLajeGroup.add(ac);
      });
    }
    // SUL (PR, RS, SC): Barril e chimarrão
    else if (['PR', 'RS', 'SC'].includes(c)) {
      const barrel = new THREE.Group();
      const bMesh = new THREE.Mesh(this.geoCyl, barrelWoodMat);
      bMesh.scale.set(12, 22, 12);
      bMesh.position.y = 11;
      bMesh.castShadow = false;
      barrel.add(bMesh);

      const cuia = new THREE.Mesh(this.geoSphere, woodMat);
      cuia.scale.set(3, 4, 3);
      cuia.position.set(2, 24, 0);
      cuia.castShadow = false;
      barrel.add(cuia);

      const bomba = new THREE.Mesh(this.geoCyl, acUnitMat);
      bomba.scale.set(0.4, 7, 0.4);
      bomba.position.set(2, 27, 0);
      bomba.rotation.z = 0.25;
      bomba.castShadow = false;
      barrel.add(bomba);

      barrel.position.set(-sideX, 0, -35);
      barrel.userData = { side: -1, isCulturalLaje: true };
      this.regionalLajeGroup.add(barrel);

      const bench = new THREE.Group();
      const seat = new THREE.Mesh(this.geoBox, barrelWoodMat);
      seat.scale.set(28, 3, 14);
      seat.position.y = 8;
      seat.castShadow = false;
      bench.add(seat);

      for (let s = -1; s <= 1; s += 2) {
        const leg = new THREE.Mesh(this.geoBox, barrelWoodMat);
        leg.scale.set(3, 8, 12);
        leg.position.set(s * 10, 4, 0);
        leg.castShadow = false;
        bench.add(leg);
      }
      bench.position.set(sideX, 0, -35);
      bench.userData = { side: 1, isCulturalLaje: true };
      this.regionalLajeGroup.add(bench);
    }
    // HISTÓRICO (MG, BA, PE): Ânforas coloniais
    else if (['MG', 'BA', 'PE'].includes(c)) {
      [-1, 1].forEach(side => {
        const potGroup = new THREE.Group();
        const pot = new THREE.Mesh(this.geoCone, ceramicPotMat);
        pot.scale.set(11, 18, 11);
        pot.position.y = 9;
        pot.rotation.x = Math.PI;
        pot.castShadow = false;
        potGroup.add(pot);

        const flowerMat = (side === -1) ? ipePinkMat : ipeFlowersMat;
        const plant = new THREE.Mesh(this.geoSphere, flowerMat);
        plant.scale.set(10, 8, 10);
        plant.position.y = 21;
        plant.castShadow = false;
        potGroup.add(plant);

        const lamp = new THREE.Mesh(this.geoBox, copperLampMat);
        lamp.scale.set(4, 9, 4);
        lamp.position.set(-side * 12, 10, 0);
        lamp.castShadow = false;
        potGroup.add(lamp);

        potGroup.position.set(side * sideX, 0, -35);
        potGroup.userData = { side, isCulturalLaje: true };
        this.regionalLajeGroup.add(potGroup);
      });
    }
    // LITORAL & DUNAS (CE, RN, MA, AL, PB, SE)
    else if (['CE', 'RN', 'MA', 'AL', 'PB', 'SE'].includes(c)) {
      const cocoStand = new THREE.Group();
      const stand = new THREE.Mesh(this.geoBox, woodMat);
      stand.scale.set(24, 14, 16);
      stand.position.y = 7;
      stand.castShadow = false;
      cocoStand.add(stand);

      for (let k = 0; k < 5; k++) {
        const coco = new THREE.Mesh(this.geoSphere, palmMat);
        coco.scale.set(3.2, 3.8, 3.2);
        coco.position.set((k - 2) * 4.5, 16, (k % 2 === 0 ? 2 : -2));
        coco.castShadow = false;
        cocoStand.add(coco);
      }
      cocoStand.position.set(-sideX, 0, -35);
      cocoStand.userData = { side: -1, isCulturalLaje: true };
      this.regionalLajeGroup.add(cocoStand);

      const matGroup = new THREE.Group();
      const strawMat = new THREE.Mesh(this.geoCyl, jangadaSailMat);
      strawMat.scale.set(4, 20, 4);
      strawMat.position.set(0, 10, 0);
      strawMat.rotation.z = 0.45;
      strawMat.castShadow = false;
      matGroup.add(strawMat);
      matGroup.position.set(sideX, 0, -35);
      matGroup.userData = { side: 1, isCulturalLaje: true };
      this.regionalLajeGroup.add(matGroup);
    }
    // AMAZÔNIA & NORTE (AM, PA, AC, RO, AP)
    else if (['AM', 'PA', 'AC', 'RO', 'AP'].includes(c)) {
      [-1, 1].forEach(side => {
        const totem = new THREE.Group();
        const post = new THREE.Mesh(this.geoBox, woodMat);
        post.scale.set(8, 26, 8);
        post.position.y = 13;
        post.castShadow = false;
        totem.add(post);

        const finial = new THREE.Mesh(this.geoSphere, ceramicPotMat);
        finial.scale.set(6, 6, 6);
        finial.position.y = 28;
        finial.castShadow = false;
        totem.add(finial);

        totem.position.set(side * sideX, 0, -35);
        totem.userData = { side, isCulturalLaje: true };
        this.regionalLajeGroup.add(totem);
      });
    }
    // CENTRO-OESTE & SERTÃO
    else {
      [-1, 1].forEach(side => {
        const potGroup = new THREE.Group();
        const pot = new THREE.Mesh(this.geoCyl, ceramicPotMat);
        pot.scale.set(9, 12, 9);
        pot.position.y = 6;
        pot.castShadow = false;
        potGroup.add(pot);

        const miniCactus = new THREE.Mesh(this.geoCyl, cactusMat);
        miniCactus.scale.set(2.4, 16, 2.4);
        miniCactus.position.y = 18;
        miniCactus.castShadow = false;
        potGroup.add(miniCactus);

        const arm = new THREE.Mesh(this.geoBox, cactusMat);
        arm.scale.set(6, 2, 2);
        arm.position.set(side * 2.5, 17, 0);
        arm.castShadow = false;
        potGroup.add(arm);

        potGroup.position.set(side * sideX, 0, -35);
        potGroup.userData = { side, isCulturalLaje: true };
        this.regionalLajeGroup.add(potGroup);
      });
    }
  }

  layout(fgBounds, portrait, width, height) {
    if (!this.group) return;

    this.lajeFloor.scale.x = fgBounds.width * 1.35;
    this.lajeParapet.scale.x = fgBounds.width * 1.35;
    if (this.lajeParapetCap) this.lajeParapetCap.scale.x = fgBounds.width * 1.35;
    this.lajeWall.scale.x = fgBounds.width * 1.35;

    const tankX = fgBounds.width * (portrait ? 0.52 : 0.485);
    this.foregroundTanks.forEach(t => {
      t.position.set(t.userData.side * tankX, 0, -35);
    });

    if (this.regionalLajeGroup) {
      this.regionalLajeGroup.children.forEach(child => {
        if (child.userData?.side) {
          child.position.set(child.userData.side * tankX, 0, -35);
        }
      });
    }

    if (this.foregroundProps) {
      this.foregroundProps.forEach(p => {
        const propX = fgBounds.width * p.userData.offsetRatio * p.userData.side;
        p.position.set(propX, 0, -32);
      });
    }

    // Alinhamento vertical coerente com RooftopLayout
    const anchorY = rooftopAnchorY(width, height);
    const normFromBottom = (height - anchorY) / height;
    const targetLajeY = -fgBounds.height * 0.5 + normFromBottom * fgBounds.height * 0.95;
    this.group.position.set(0, targetLajeY, 480);
  }

  dispose() {
    if (this.regionalLajeGroup) {
      disposeHierarchy(this.regionalLajeGroup);
      this.regionalLajeGroup.clear();
    }
    if (this.group) {
      disposeHierarchy(this.group);
      this.group.clear();
    }
  }
}
