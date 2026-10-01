import * as THREE from 'three';

export function buildThemePA(group, theme, ctx) {
  const bay = new THREE.Mesh(ctx.geoBox, ctx.amazonWaterMat);
  bay.scale.set(520, 2, 340);
  bay.position.set(0, 12, -430);
  bay.castShadow = false;
  bay.userData = { baseY: 12 };
  group.add(bay);
  if (ctx.waterMeshes) ctx.waterMeshes.push(bay);

  // Barco Gaiola Amazônico
  const boat = new THREE.Group();
  const hull = new THREE.Mesh(ctx.geoBox, ctx.boatMatA);
  hull.scale.set(46, 10, 18);
  hull.position.y = 5;
  hull.castShadow = false;
  boat.add(hull);

  const cabin = new THREE.Mesh(ctx.geoBox, ctx.boatMatB);
  cabin.scale.set(40, 13, 15);
  cabin.position.y = 16.5;
  cabin.castShadow = false;
  boat.add(cabin);

  const upperDeck = new THREE.Mesh(ctx.geoBox, ctx.boatMatA);
  upperDeck.scale.set(36, 9, 13);
  upperDeck.position.y = 27.5;
  upperDeck.castShadow = false;
  boat.add(upperDeck);

  const stack = new THREE.Mesh(ctx.geoCyl, ctx.rebarMat);
  stack.scale.set(1.4, 16, 1.4);
  stack.position.set(-6, 39, 0);
  stack.castShadow = false;
  boat.add(stack);

  boat.position.set(-80, 14, -390);
  group.add(boat);

  // Açaizeiros
  for (let p = 0; p < 18; p++) {
    const isLeft = (p % 2 === 0);
    const palm = new THREE.Group();
    const ph = 40 + ctx.hash(p * 9) * 20;
    const trunk = new THREE.Mesh(ctx.geoCyl, ctx.woodMat);
    trunk.scale.set(1.2, ph, 1.2);
    trunk.position.y = ph * 0.5;
    trunk.castShadow = false;
    palm.add(trunk);

    const crown = new THREE.Mesh(ctx.geoSphere, ctx.amazonForestMatB);
    crown.scale.set(12, 10, 12);
    crown.position.y = ph + 6;
    crown.castShadow = false;
    palm.add(crown);

    palm.userData = {
      isLeft,
      normX: 0.15 + (p / 18) * 0.7,
      depthZ: -290 - (p % 4) * 55,
      offsetY: 0,
      seed: p * 15
    };
    group.add(palm);
    if (ctx.swayingTrees) ctx.swayingTrees.push(palm);
  }
}
