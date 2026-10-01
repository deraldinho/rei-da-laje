import * as THREE from 'three';

export function buildWindTurbine(ctx, x, y, z, height = 75, rotorRadius = 26) {
  const turbine = new THREE.Group();
  const tower = new THREE.Mesh(ctx.geoCone, ctx.windTurbineMat);
  tower.scale.set(4.2, height, 4.2);
  tower.position.y = height * 0.5;
  tower.castShadow = false;
  turbine.add(tower);

  const nacelle = new THREE.Mesh(ctx.geoBox, ctx.windTurbineMat);
  nacelle.scale.set(5.5, 4.5, 11);
  nacelle.position.set(0, height, 1.5);
  nacelle.castShadow = false;
  turbine.add(nacelle);

  const rotor = new THREE.Group();
  rotor.position.set(0, height, 7.2);

  const hub = new THREE.Mesh(ctx.geoSphere, ctx.windTurbineMat);
  hub.scale.set(2.4, 2.4, 2.4);
  hub.castShadow = false;
  rotor.add(hub);

  for (let b = 0; b < 3; b++) {
    const angle = (b * Math.PI * 2) / 3;
    const blade = new THREE.Mesh(ctx.geoBox, ctx.windTurbineMat);
    blade.scale.set(1.4, rotorRadius, 0.4);
    blade.position.set(
      Math.sin(angle) * (rotorRadius * 0.5),
      Math.cos(angle) * (rotorRadius * 0.5),
      0
    );
    blade.rotation.z = -angle;
    blade.castShadow = false;
    rotor.add(blade);
  }

  rotor.rotation.z = Math.random() * Math.PI * 2;
  turbine.add(rotor);
  if (ctx.rotatingWindTurbines) ctx.rotatingWindTurbines.push(rotor);

  turbine.position.set(x, y, z);
  return turbine;
}

export function buildCristoRedentor(ctx, x, y, z) {
  const cristo = new THREE.Group();
  const base = new THREE.Mesh(ctx.geoBox, ctx.stoneMat);
  base.scale.set(14, 18, 14);
  base.position.y = 9;
  base.castShadow = false;
  cristo.add(base);

  const body = new THREE.Mesh(ctx.geoBox, ctx.cristoMat);
  body.scale.set(7.5, 34, 5.5);
  body.position.y = 18 + 17;
  body.castShadow = false;
  cristo.add(body);

  const arms = new THREE.Mesh(ctx.geoBox, ctx.cristoMat);
  arms.scale.set(38, 3.2, 3.2);
  arms.position.set(0, 18 + 29, 0);
  arms.castShadow = false;
  cristo.add(arms);

  const head = new THREE.Mesh(ctx.geoSphere, ctx.cristoMat);
  head.scale.set(3.4, 4.2, 3.4);
  head.position.set(0, 18 + 36, 0);
  head.castShadow = false;
  cristo.add(head);

  cristo.position.set(x, y, z);
  return cristo;
}

export function buildPonteEstaiada(ctx, x, y, z) {
  const bridge = new THREE.Group();
  const pylonH = 95;

  for (let side = -1; side <= 1; side += 2) {
    const leg = new THREE.Mesh(ctx.geoBox, ctx.concreteMat);
    leg.scale.set(4.5, pylonH * 1.08, 4.5);
    leg.position.set(side * 6, pylonH * 0.5, 0);
    leg.rotation.z = -side * 0.22;
    leg.castShadow = false;
    bridge.add(leg);
  }

  const deck = new THREE.Mesh(ctx.geoBox, ctx.concreteMat);
  deck.scale.set(170, 4.5, 26);
  deck.position.set(0, 24, 0);
  deck.castShadow = false;
  bridge.add(deck);

  for (let c = 1; c <= 6; c++) {
    const cableY = 48 + c * 7;
    const spreadX = 22 + c * 11;
    for (let s = -1; s <= 1; s += 2) {
      const cable = new THREE.Mesh(ctx.geoBox, ctx.cableStayMat);
      const dist = Math.hypot(spreadX, cableY - 24);
      cable.scale.set(0.6, dist, 0.6);
      cable.position.set(s * spreadX * 0.5, (cableY + 24) * 0.5, (c % 2 === 0 ? 8 : -8));
      cable.rotation.z = s * Math.atan2(spreadX, cableY - 24);
      cable.castShadow = false;
      bridge.add(cable);
    }
  }

  bridge.position.set(x, y, z);
  return bridge;
}

export function buildCongressoNacional(ctx, x, y, z) {
  const congresso = new THREE.Group();

  const base = new THREE.Mesh(ctx.geoBox, ctx.modernistWhiteMat);
  base.scale.set(120, 7, 60);
  base.position.y = 3.5;
  base.castShadow = false;
  congresso.add(base);

  const towerH = 68;
  const towerW = 14;
  const towerD = 8;
  for (let t = -1; t <= 1; t += 2) {
    const tower = new THREE.Mesh(ctx.geoBox, ctx.modernistWhiteMat);
    tower.scale.set(towerW, towerH, towerD);
    tower.position.set(t * 10, 7 + towerH * 0.5, -4);
    tower.castShadow = false;
    congresso.add(tower);

    const glass = new THREE.Mesh(ctx.geoBox, ctx.glassWindowMat);
    glass.scale.set(towerW - 2, towerH - 8, towerD + 0.5);
    glass.position.set(t * 10, 7 + towerH * 0.5, -4);
    glass.castShadow = false;
    congresso.add(glass);
  }

  const bridge = new THREE.Mesh(ctx.geoBox, ctx.modernistWhiteMat);
  bridge.scale.set(12, 5, 6);
  bridge.position.set(0, 7 + towerH * 0.65, -4);
  bridge.castShadow = false;
  congresso.add(bridge);

  const camaraCupola = new THREE.Mesh(ctx.geoCyl, ctx.modernistWhiteMat);
  camaraCupola.scale.set(24, 7, 24);
  camaraCupola.position.set(-36, 7 + 3.5, 8);
  camaraCupola.castShadow = false;
  congresso.add(camaraCupola);

  const senadoCupola = new THREE.Mesh(ctx.geoSphere, ctx.modernistWhiteMat);
  senadoCupola.scale.set(13, 10, 13);
  senadoCupola.position.set(36, 7 + 5, 8);
  senadoCupola.castShadow = false;
  congresso.add(senadoCupola);

  congresso.position.set(x, y, z);
  return congresso;
}

export function buildCatedralBrasilia(ctx, x, y, z) {
  const catedral = new THREE.Group();
  const numColumns = 16;
  const catH = 46;

  for (let c = 0; c < numColumns; c++) {
    const angle = (c / numColumns) * Math.PI * 2;
    const col = new THREE.Mesh(ctx.geoBox, ctx.modernistWhiteMat);
    col.scale.set(2.4, catH, 2.4);
    const rad = 18;
    col.position.set(Math.sin(angle) * rad, catH * 0.5, Math.cos(angle) * rad);
    col.rotation.y = angle;
    col.rotation.x = 0.28;
    col.castShadow = false;
    catedral.add(col);
  }

  const glassCone = new THREE.Mesh(ctx.geoCone, ctx.glassWindowMat);
  glassCone.scale.set(28, catH * 0.9, 28);
  glassCone.position.y = catH * 0.45;
  glassCone.castShadow = false;
  catedral.add(glassCone);

  const cross = new THREE.Mesh(ctx.geoBox, ctx.goldChurchMat);
  cross.scale.set(1.4, 9, 1.4);
  cross.position.y = catH + 4.5;
  cross.castShadow = false;
  catedral.add(cross);

  catedral.position.set(x, y, z);
  return catedral;
}

export function buildJardimBotanicoCuritiba(ctx, x, y, z) {
  const jb = new THREE.Group();

  const base = new THREE.Mesh(ctx.geoBox, ctx.modernistWhiteMat);
  base.scale.set(72, 4, 32);
  base.position.y = 2;
  base.castShadow = false;
  jb.add(base);

  const midDome = new THREE.Mesh(ctx.geoCyl, ctx.glassWindowMat);
  midDome.scale.set(16, 32, 16);
  midDome.position.set(0, 18, 0);
  midDome.castShadow = false;
  jb.add(midDome);

  const midCap = new THREE.Mesh(ctx.geoSphere, ctx.modernistWhiteMat);
  midCap.scale.set(8.5, 9, 8.5);
  midCap.position.set(0, 34, 0);
  midCap.castShadow = false;
  jb.add(midCap);

  for (let s = -1; s <= 1; s += 2) {
    const sideDome = new THREE.Mesh(ctx.geoCyl, ctx.glassWindowMat);
    sideDome.scale.set(12, 22, 12);
    sideDome.position.set(s * 22, 13, 0);
    sideDome.castShadow = false;
    jb.add(sideDome);

    const sideCap = new THREE.Mesh(ctx.geoSphere, ctx.modernistWhiteMat);
    sideCap.scale.set(6.5, 7, 6.5);
    sideCap.position.set(s * 22, 24, 0);
    sideCap.castShadow = false;
    jb.add(sideCap);
  }

  jb.position.set(x, y, z);
  return jb;
}

export function buildElevadorLacerda(ctx, x, y, z) {
  const elevador = new THREE.Group();
  const towerH = 82;

  const tower = new THREE.Mesh(ctx.geoBox, ctx.modernistWhiteMat);
  tower.scale.set(14, towerH, 14);
  tower.position.y = towerH * 0.5;
  tower.castShadow = false;
  elevador.add(tower);

  const walkway = new THREE.Mesh(ctx.geoBox, ctx.modernistWhiteMat);
  walkway.scale.set(45, 10, 10);
  walkway.position.set(-22, towerH - 9, 0);
  walkway.castShadow = false;
  elevador.add(walkway);

  const belvedere = new THREE.Mesh(ctx.geoBox, ctx.glassWindowMat);
  belvedere.scale.set(15, 8, 15);
  belvedere.position.set(0, towerH + 4, 0);
  belvedere.castShadow = false;
  elevador.add(belvedere);

  elevador.position.set(x, y, z);
  return elevador;
}

export function buildVitoriaRegia(ctx, x, y, z, radius = 9.5) {
  const lily = new THREE.Group();

  const pad = new THREE.Mesh(ctx.geoCyl, ctx.vitoriaRegiaMat);
  pad.scale.set(radius, 0.35, radius);
  pad.castShadow = false;
  lily.add(pad);

  const rim = new THREE.Mesh(ctx.geoCyl, ctx.vitoriaRegiaMat);
  rim.scale.set(radius * 1.05, 1.2, radius * 1.05);
  rim.position.y = 0.5;
  rim.castShadow = false;
  lily.add(rim);

  const flower = new THREE.Mesh(ctx.geoCone, ctx.vitoriaFlowerMat);
  flower.scale.set(2.8, 3.2, 2.8);
  flower.position.y = 1.8;
  flower.castShadow = false;
  lily.add(flower);

  lily.position.set(x, y, z);
  lily.userData = { baseY: y };
  if (ctx.waterLilies) ctx.waterLilies.push(lily);
  return lily;
}

export function buildFarolWithRotatingBeam(ctx, x, y, z, height = 52) {
  const farol = new THREE.Group();
  const base = new THREE.Mesh(ctx.geoBox, ctx.stoneMat);
  base.scale.set(22, 10, 22);
  base.position.y = 5;
  base.castShadow = false;
  farol.add(base);

  const tower = new THREE.Mesh(ctx.geoCyl, ctx.lighthouseMat);
  tower.scale.set(7.5, height, 7.5);
  tower.position.y = 10 + height * 0.5;
  tower.castShadow = false;
  farol.add(tower);

  const cap = new THREE.Mesh(ctx.geoCone, ctx.lighthouseRedMat);
  cap.scale.set(9.5, 9, 9.5);
  cap.position.y = 10 + height + 4.5;
  cap.castShadow = false;
  farol.add(cap);

  const beamGroup = new THREE.Group();
  beamGroup.position.set(0, 10 + height, 0);

  const beam = new THREE.Mesh(ctx.geoCone, ctx.lightBeamMat);
  beam.scale.set(22, 180, 22);
  beam.position.set(0, 0, 90);
  beam.rotation.x = Math.PI * 0.5;
  beam.castShadow = false;
  beamGroup.add(beam);

  farol.add(beamGroup);
  if (ctx.rotatingLighthouses) ctx.rotatingLighthouses.push(beamGroup);

  farol.position.set(x, y, z);
  return farol;
}
