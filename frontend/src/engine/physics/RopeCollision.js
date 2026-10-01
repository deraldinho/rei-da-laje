/**
 * RopeCollision - Detecção Contínua de Contato entre Cordas Físicas (Cápsula vs Cápsula)
 * 
 * Substitui o modelo de linhas retas infinitamente finas por:
 * 1. Broad-phase AABB da corda inteira com padding de espessura.
 * 2. Narrow-phase que busca o par de segmentos mais próximo entre as duas cordas.
 * 3. Cálculo da menor distância entre segmentos 2D/3D com espessura de cápsula (raioA + raioB).
 * 4. Ponto exato de contato, tangentes, ângulo relativo e velocidade de deslizamento abrasivo.
 */
export class RopeCollision {
  /**
   * Calcula a menor distância e os pontos mais próximos entre dois segmentos de reta 3D/2D
   * Segmento 1: p1 -> q1
   * Segmento 2: p2 -> q2
   * @returns {{ distance: number, s: number, t: number, c1: object, c2: object, contactPoint: object }}
   */
  static closestPointsBetweenSegments(p1, q1, p2, q2, out = null) {
    const ux = q1.x - p1.x, uy = q1.y - p1.y, uz = (q1.z || 0) - (p1.z || 0);
    const vx = q2.x - p2.x, vy = q2.y - p2.y, vz = (q2.z || 0) - (p2.z || 0);
    const wx = p1.x - p2.x, wy = p1.y - p2.y, wz = (p1.z || 0) - (p2.z || 0);

    const a = ux * ux + uy * uy + uz * uz;
    const b = ux * vx + uy * vy + uz * vz;
    const c = vx * vx + vy * vy + vz * vz;
    const d = ux * wx + uy * wy + uz * wz;
    const e = vx * wx + vy * wy + vz * wz;

    const denom = a * c - b * b;
    let sN, sD = denom;
    let tN, tD = denom;

    if (denom < 1e-7) {
      sN = 0.0; sD = 1.0; tN = e; tD = c || 1.0;
    } else {
      sN = (b * e - c * d);
      tN = (a * e - b * d);
      if (sN < 0.0) {
        sN = 0.0; tN = e; tD = c || 1.0;
      } else if (sN > sD) {
        sN = sD; tN = e + b; tD = c || 1.0;
      }
    }

    if (tN < 0.0) {
      tN = 0.0;
      if (-d < 0.0) sN = 0.0;
      else if (-d > a) sN = sD;
      else { sN = -d; sD = a || 1.0; }
    } else if (tN > tD) {
      tN = tD;
      if ((-d + b) < 0.0) sN = 0.0;
      else if ((-d + b) > a) sN = sD;
      else { sN = (-d + b); sD = a || 1.0; }
    }

    const s = Math.abs(sN) < 1e-7 ? 0.0 : Math.max(0, Math.min(1, sN / (sD || 1.0)));
    const t = Math.abs(tN) < 1e-7 ? 0.0 : Math.max(0, Math.min(1, tN / (tD || 1.0)));

    // No hot path, o chamador fornece um objeto scratch reutilizável. Isso evita
    // milhares de c1/c2/contactPoint/result temporários por frame quando várias
    // cordas ocupam a mesma região e todos os AABBs entram no narrow-phase.
    const result = out || { c1: {}, c2: {}, contactPoint: {} };
    const c1 = result.c1 || (result.c1 = {});
    const c2 = result.c2 || (result.c2 = {});
    const contactPoint = result.contactPoint || (result.contactPoint = {});

    c1.x = p1.x + s * ux; c1.y = p1.y + s * uy; c1.z = (p1.z || 0) + s * uz;
    c2.x = p2.x + t * vx; c2.y = p2.y + t * vy; c2.z = (p2.z || 0) + t * vz;

    const dist = Math.hypot(c1.x - c2.x, c1.y - c2.y, c1.z - c2.z);
    contactPoint.x = (c1.x + c2.x) * 0.5;
    contactPoint.y = (c1.y + c2.y) * 0.5;
    contactPoint.z = (c1.z + c2.z) * 0.5;
    result.distance = dist; result.s = s; result.t = t;
    return result;
  }

  /**
   * Checa se duas cordas físicas colidem/entram em relinho
   * @param {RopePhysics} ropeA Corda da pipa A
   * @param {RopePhysics} ropeB Corda da pipa B
   * @param {number} thicknessMultiplier Fator de espessura de tolerância (default: 4.5px)
   * @param {object} options Opções de filtragem { minSinAngle, maxZDistance }
   * @returns {object} { hit: boolean, ...detalhes do contato }
   */
  static _finalizeContact(nodesA, nodesB, bestIndexA, bestIndexB, closestInfo, contactRadius, options = {}) {
    const deltaZ = Number.isFinite(options.deltaZ)
      ? options.deltaZ
      : Math.abs((closestInfo.c1.z || 0) - (closestInfo.c2.z || 0));
    const dx2 = closestInfo.c1.x - closestInfo.c2.x;
    const dy2 = closestInfo.c1.y - closestInfo.c2.y;
    const dist2D = Math.sqrt(dx2 * dx2 + dy2 * dy2);

    if (Number.isFinite(options.maxZDistance) && deltaZ > options.maxZDistance) {
      return { hit: false, minDistance: closestInfo.distance, deltaZ, dist2D, reason: 'Z_SEPARATION' };
    }

    const effectiveDist = Number.isFinite(options.maxZDistance) ? dist2D : closestInfo.distance;
    if (effectiveDist > contactRadius) {
      return { hit: false, minDistance: closestInfo.distance, deltaZ, dist2D };
    }

    const s = closestInfo.s;
    const t = closestInfo.t;
    const segA1 = nodesA[bestIndexA], segA2 = nodesA[bestIndexA + 1];
    const segB1 = nodesB[bestIndexB], segB2 = nodesB[bestIndexB + 1];

    const vxA = (segA1.vx || 0) * (1 - s) + (segA2.vx || 0) * s;
    const vyA = (segA1.vy || 0) * (1 - s) + (segA2.vy || 0) * s;
    const vxB = (segB1.vx || 0) * (1 - t) + (segB2.vx || 0) * t;
    const vyB = (segB1.vy || 0) * (1 - t) + (segB2.vy || 0) * t;
    const rvx = vxA - vxB;
    const rvy = vyA - vyB;
    const relativeSpeed = Math.sqrt(rvx * rvx + rvy * rvy);

    const dax = segA2.x - segA1.x, day = segA2.y - segA1.y;
    const dbx = segB2.x - segB1.x, dby = segB2.y - segB1.y;
    const lenA = Math.sqrt(dax * dax + day * day) || 1;
    const lenB = Math.sqrt(dbx * dbx + dby * dby) || 1;
    const tanAx = dax / lenA, tanAy = day / lenA;
    const tanBx = dbx / lenB, tanBy = dby / lenB;
    const dot = Math.max(-1, Math.min(1, tanAx * tanBx + tanAy * tanBy));
    const sinAngle = Math.sqrt(Math.max(0, 1 - dot * dot));
    const minSinAngle = Number.isFinite(options.minSinAngle) ? options.minSinAngle : 0.15;
    const isXCrossing = sinAngle >= minSinAngle;
    if (Number.isFinite(options.minSinAngle) && !isXCrossing) {
      return {
        hit: false,
        minDistance: closestInfo.distance,
        sinAngle,
        isXCrossing: false,
        reason: 'PARALLEL_OR_GLANCING'
      };
    }

    const slideA = Math.abs(rvx * tanAx + rvy * tanAy);
    const slideB = Math.abs(rvx * tanBx + rvy * tanBy);
    const slidingSpeed = Math.max(slideA, slideB, relativeSpeed * sinAngle);

    return {
      hit: true,
      x: closestInfo.contactPoint.x,
      y: closestInfo.contactPoint.y,
      z: closestInfo.contactPoint.z,
      distance: closestInfo.distance,
      segmentIndexA: bestIndexA,
      segmentIndexB: bestIndexB,
      s,
      t,
      relativeSpeed,
      slidingSpeed,
      sinAngle,
      isXCrossing,
      deltaZ,
      contactRadius,
      c1: { x: closestInfo.c1.x, y: closestInfo.c1.y, z: closestInfo.c1.z },
      c2: { x: closestInfo.c2.x, y: closestInfo.c2.y, z: closestInfo.c2.z }
    };
  }

  static checkRopeCollision(ropeA, ropeB, thicknessMultiplier = 4.5, options = {}) {
    if (!ropeA || !ropeB) return { hit: false };

    const radiusA = Math.max(0.5, (ropeA.material?.diameter || 1.0) * thicknessMultiplier);
    const radiusB = Math.max(0.5, (ropeB.material?.diameter || 1.0) * thicknessMultiplier);
    const contactRadius = radiusA + radiusB;

    // Broad-phase da corda inteira. O AABB já é atualizado pelo RopePhysics,
    // portanto esta etapa é O(1) e não cria listas de segmentos.
    const aabbA = ropeA.getAABB();
    const aabbB = ropeB.getAABB();
    if (
      aabbA.minX - contactRadius > aabbB.maxX ||
      aabbA.maxX + contactRadius < aabbB.minX ||
      aabbA.minY - contactRadius > aabbB.maxY ||
      aabbA.maxY + contactRadius < aabbB.minY
    ) {
      return { hit: false };
    }

    const nodesA = ropeA.nodes;
    const nodesB = ropeB.nodes;
    if (!Array.isArray(nodesA) || nodesA.length < 2 || !Array.isArray(nodesB) || nodesB.length < 2) {
      return { hit: false };
    }

    const scratch = { c1: {}, c2: {}, contactPoint: {}, distance: Infinity, s: 0, t: 0 };

    const pairOverlaps = (i, j) => {
      const a1 = nodesA[i], a2 = nodesA[i + 1];
      const b1 = nodesB[j], b2 = nodesB[j + 1];
      const minAx = Math.min(a1.x, a2.x) - contactRadius;
      const maxAx = Math.max(a1.x, a2.x) + contactRadius;
      const minAy = Math.min(a1.y, a2.y) - contactRadius;
      const maxAy = Math.max(a1.y, a2.y) + contactRadius;
      const minBx = Math.min(b1.x, b2.x);
      const maxBx = Math.max(b1.x, b2.x);
      const minBy = Math.min(b1.y, b2.y);
      const maxBy = Math.max(b1.y, b2.y);
      return !(minAx > maxBx || maxAx < minBx || minAy > maxBy || maxAy < minBy);
    };

    // HOT PATH: um relinho persistente quase sempre continua nos mesmos segmentos
    // (ou nos vizinhos imediatos). Revalidar uma janela 3x3 evita o scan 11x11
    // completo a cada fixed step quando 3+ relinhos estão ativos simultaneamente.
    const hint = options && options.hint;
    if (hint && Number.isFinite(hint.segmentIndexA) && Number.isFinite(hint.segmentIndexB)) {
      const centerA = Math.max(0, Math.min(nodesA.length - 2, Math.floor(hint.segmentIndexA)));
      const centerB = Math.max(0, Math.min(nodesB.length - 2, Math.floor(hint.segmentIndexB)));
      let bestDistance = Infinity;
      let bestIndexA = -1, bestIndexB = -1, bestS = 0, bestT = 0;
      const c1 = { x: 0, y: 0, z: 0 }, c2 = { x: 0, y: 0, z: 0 }, cp = { x: 0, y: 0, z: 0 };
      const offsets = [0, -1, 1];
      for (const da of offsets) {
        const i = centerA + da;
        if (i < 0 || i >= nodesA.length - 1) continue;
        for (const db of offsets) {
          const j = centerB + db;
          if (j < 0 || j >= nodesB.length - 1 || !pairOverlaps(i, j)) continue;
          const info = this.closestPointsBetweenSegments(nodesA[i], nodesA[i + 1], nodesB[j], nodesB[j + 1], scratch);
          if (info.distance < bestDistance) {
            bestDistance = info.distance; bestIndexA = i; bestIndexB = j; bestS = info.s; bestT = info.t;
            c1.x = info.c1.x; c1.y = info.c1.y; c1.z = info.c1.z;
            c2.x = info.c2.x; c2.y = info.c2.y; c2.z = info.c2.z;
            cp.x = info.contactPoint.x; cp.y = info.contactPoint.y; cp.z = info.contactPoint.z;
          }
        }
      }
      if (bestIndexA >= 0) {
        const hinted = this._finalizeContact(nodesA, nodesB, bestIndexA, bestIndexB, {
          distance: bestDistance, s: bestS, t: bestT, c1, c2, contactPoint: cp
        }, contactRadius, options);
        if (hinted.hit) return hinted;
      }
    }

    // COLD PATH: contato novo ou hint deixou de ser válido. Procura o par global
    // mais próximo, mas sem criar arrays/objetos por segmento.
    let minDistance = Infinity;
    let bestIndexA = -1;
    let bestIndexB = -1;
    let bestS = 0;
    let bestT = 0;
    const bestC1 = { x: 0, y: 0, z: 0 };
    const bestC2 = { x: 0, y: 0, z: 0 };
    const bestContact = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < nodesA.length - 1; i++) {
      for (let j = 0; j < nodesB.length - 1; j++) {
        if (!pairOverlaps(i, j)) continue;
        const info = this.closestPointsBetweenSegments(nodesA[i], nodesA[i + 1], nodesB[j], nodesB[j + 1], scratch);
        if (info.distance < minDistance) {
          minDistance = info.distance;
          bestIndexA = i; bestIndexB = j; bestS = info.s; bestT = info.t;
          bestC1.x = info.c1.x; bestC1.y = info.c1.y; bestC1.z = info.c1.z;
          bestC2.x = info.c2.x; bestC2.y = info.c2.y; bestC2.z = info.c2.z;
          bestContact.x = info.contactPoint.x; bestContact.y = info.contactPoint.y; bestContact.z = info.contactPoint.z;
        }
      }
    }

    if (bestIndexA < 0 || bestIndexB < 0) return { hit: false, minDistance: Infinity };
    return this._finalizeContact(nodesA, nodesB, bestIndexA, bestIndexB, {
      distance: minDistance,
      s: bestS,
      t: bestT,
      c1: bestC1,
      c2: bestC2,
      contactPoint: bestContact
    }, contactRadius, options);
  }

  /**
   * Item 4: Aplica força mútua e acoplamento posicional elástico (Two-Way Coupling)
   * nos nós atingidos durante o contato, de modo que as linhas sintam a tração uma da outra
   * e fiquem mecanicamente engatadas até o corte ou manobra de desengate.
   * 
   * @param {RopePhysics} ropeA Corda da pipa A
   * @param {RopePhysics} ropeB Corda da pipa B
   * @param {object} contactInfo Dados de contato retornados por checkRopeCollision
   * @param {number} couplingStrength Força elástica de atração mútua (0.0 a 1.0, default: 0.35)
   */
  static applyMutualContactCoupling(ropeA, ropeB, contactInfo, couplingStrength = 0.22) {
    if (!ropeA || !ropeB || !contactInfo || !contactInfo.hit) return;

    const nodesA = ropeA.nodes;
    const nodesB = ropeB.nodes;
    if (!Array.isArray(nodesA) || !Array.isArray(nodesB)) return;

    const idxA = Math.floor(contactInfo.segmentIndexA);
    const idxB = Math.floor(contactInfo.segmentIndexB);
    if (!Number.isFinite(idxA) || idxA < 0 || idxA >= nodesA.length - 1) return;
    if (!Number.isFinite(idxB) || idxB < 0 || idxB >= nodesB.length - 1) return;

    const a1 = nodesA[idxA], a2 = nodesA[idxA + 1];
    const b1 = nodesB[idxB], b2 = nodesB[idxB + 1];
    const s = Math.max(0, Math.min(1, Number.isFinite(contactInfo.s) ? contactInfo.s : 0.5));
    const t = Math.max(0, Math.min(1, Number.isFinite(contactInfo.t) ? contactInfo.t : 0.5));

    // Recalcula os pontos de contato na geometria ATUAL. Um mesmo nó pode
    // participar de mais de um relinho no substep; usar c1/c2 antigos faria a
    // segunda constraint corrigir uma geometria que já mudou.
    const c1x = a1.x + (a2.x - a1.x) * s;
    const c1y = a1.y + (a2.y - a1.y) * s;
    const c1z = (a1.z || 0) + ((a2.z || 0) - (a1.z || 0)) * s;
    const c2x = b1.x + (b2.x - b1.x) * t;
    const c2y = b1.y + (b2.y - b1.y) * t;
    const c2z = (b1.z || 0) + ((b2.z || 0) - (b1.z || 0)) * t;

    let nx = c1x - c2x;
    let ny = c1y - c2y;
    let nz = c1z - c2z;
    let distance = Math.hypot(nx, ny, nz);

    const contactRadius = Math.max(0, Number(contactInfo.contactRadius) || 0);
    if (contactRadius <= 0) return;

    // Pequena folga evita chatter quando o contato está exatamente na borda.
    const slop = Math.min(1.25, contactRadius * 0.08);
    const penetration = contactRadius - distance - slop;
    if (penetration <= 0) return;

    // Em cruzamento exato c1==c2 não existe normal definida. Usa a normal do
    // segmento A e orienta para o lado oposto ao segmento B. Isso mantém a
    // resposta determinística sem atrair ambas as linhas para o mesmo ponto.
    if (distance > 1e-6) {
      nx /= distance; ny /= distance; nz /= distance;
    } else {
      const adx = a2.x - a1.x, ady = a2.y - a1.y;
      const alen = Math.hypot(adx, ady) || 1;
      let nnx = -ady / alen;
      let nny = adx / alen;
      const amidX = (a1.x + a2.x) * 0.5, amidY = (a1.y + a2.y) * 0.5;
      const bmidX = (b1.x + b2.x) * 0.5, bmidY = (b1.y + b2.y) * 0.5;
      const side = (bmidX - amidX) * nnx + (bmidY - amidY) * nny;
      if (side >= 0) { nnx = -nnx; nny = -nny; }
      nx = nnx; ny = nny; nz = 0;
      distance = 0;
    }

    // Corrige somente uma fração pequena da penetração por fixed step.
    // É uma constraint de NÃO-PENETRAÇÃO, não um acoplamento de atração.
    const strength = Math.max(0.05, Math.min(0.28, Number(couplingStrength) || 0.22));
    const correction = Math.min(contactRadius * 0.18, penetration * strength);
    const half = correction * 0.5;

    const moveContact = (nodes, idx, u, dx, dy, dz) => {
      const n1 = nodes[idx], n2 = nodes[idx + 1];
      const inv1 = Math.max(0, Number(n1.invMass) || 0);
      const inv2 = Math.max(0, Number(n2.invMass) || 0);
      const w1 = 1 - u, w2 = u;
      const denom = w1 * w1 * inv1 + w2 * w2 * inv2;
      if (denom <= 1e-9) return;

      const applyNode = (node, factor) => {
        if (!node || factor === 0) return;
        const mx = dx * factor, my = dy * factor, mz = dz * factor;
        node.x += mx; node.y += my;
        if (Number.isFinite(node.z)) node.z += mz;
        // Move prev junto: a constraint não deve criar velocidade fictícia no Verlet.
        if (Number.isFinite(node.prevX)) node.prevX += mx;
        if (Number.isFinite(node.prevY)) node.prevY += my;
        if (Number.isFinite(node.prevZ)) node.prevZ += mz;
      };

      applyNode(n1, (w1 * inv1) / denom);
      applyNode(n2, (w2 * inv2) / denom);
    };

    // nx aponta de B para A: separa A em +N e B em -N.
    moveContact(nodesA, idxA, s, nx * half, ny * half, nz * half);
    moveContact(nodesB, idxB, t, -nx * half, -ny * half, -nz * half);
  }
}
