import { getLineMaterial } from './LineMaterial.js';
import { RopeConstraintSolver } from './RopeConstraintSolver.js';
import { evaluateStructuralLoad } from './LineStructuralModel.js';

/**
 * RopePhysics - Simulação Dinâmica de Linha de Pipa baseada em XPBD/Verlet
 * 
 * Modela a corda com 12 partículas encadeadas, respeitando:
 * - Comprimento real liberado (carretel/spoolLength).
 * - Restrições de distância elástica entre nós.
 * - Forças aerodinâmicas do vento e gravidade natural (barriga/sag).
 * - Tensão física emergente da deformação.
 * - Desgaste abrasivo localizado por segmento (segmentWear).
 */
export class RopePhysics {
  /**
   * @param {object} options Configurações iniciais
   * @param {number} options.nodeCount Número de nós (default: 12)
   * @param {string} options.lineType Tipo de linha ('algodao', 'cerol', 'chile', etc.)
   */
  constructor(options = {}) {
    this.nodeCount = Math.max(6, Math.min(24, Math.floor(options.nodeCount || 12)));
    this.material = getLineMaterial(options.lineType || 'algodao');
    this.nodes = [];
    this.segmentWear = new Float32Array(this.nodeCount - 1);
    this.spoolLength = 0;
    this.tension = 0.58;
    this.structuralLoad = 0;
    this.structuralFatigue = 0;
    this._structuralOverloadTime = 0;
    this.structuralFailure = null;
    this._directDistance = 0;
    this._spoolControlled = false;
    this._minSpoolRatio = 0.85;
    this.aabb = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 };
    this.isInitialized = false;

    this.initNodes();
  }

  initNodes() {
    this.nodes = [];
    for (let i = 0; i < this.nodeCount; i++) {
      this.nodes.push({
        x: 0,
        y: 0,
        z: 0,
        prevX: 0,
        prevY: 0,
        prevZ: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        invMass: (i === 0 || i === this.nodeCount - 1) ? 0 : 1.0,
        wear: 0
      });
    }
  }

  setMaterial(lineType) {
    this.material = getLineMaterial(lineType);
  }

  /**
   * Inicializa ou teletransporta os nós para alinhar entre mão e pipa
   */
  resetPositions(handPos, kitePos) {
    const hX = Number.isFinite(handPos?.x) ? handPos.x : 0;
    const hY = Number.isFinite(handPos?.y) ? handPos.y : 0;
    const hZ = Number.isFinite(handPos?.z) ? handPos.z : 0;

    const kX = Number.isFinite(kitePos?.x) ? kitePos.x : 0;
    const kY = Number.isFinite(kitePos?.y) ? kitePos.y : 0;
    const kZ = Number.isFinite(kitePos?.z) ? kitePos.z : 0;

    const dist = Math.hypot(kX - hX, kY - hY, kZ - hZ);
    this._directDistance = dist;
    this.spoolLength = Math.max(10, dist);
    this._spoolControlled = false;

    for (let i = 0; i < this.nodeCount; i++) {
      const t = i / (this.nodeCount - 1);
      const n = this.nodes[i];
      n.x = hX + (kX - hX) * t;
      n.y = hY + (kY - hY) * t;
      n.z = hZ + (kZ - hZ) * t;
      n.prevX = n.x;
      n.prevY = n.y;
      n.prevZ = n.z;
      n.vx = 0;
      n.vy = 0;
      n.vz = 0;
    }
    this.isInitialized = true;
    this.updateAABB();
  }

  /**
   * Executa um passo de integração física da corda
   * @param {number} dt Delta de tempo (segundos, ex: 1/60)
   * @param {object} handPos Posição da mão {x, y, z}
   * @param {object} kitePos Posição da pipa {x, y, z}
   * @param {object} wind Vetor de vento {x, y}
   * @param {object} control Controles de linha {lineSlack, lineTension, reelSpeed}
   */
  step(dt, handPos, kitePos, wind = null, control = {}) {
    const safeDt = Math.max(0.001, Math.min(0.1, Number(dt) || 1 / 60));

    const hX = Number.isFinite(handPos?.x) ? handPos.x : 0;
    const hY = Number.isFinite(handPos?.y) ? handPos.y : 0;
    const hZ = Number.isFinite(handPos?.z) ? handPos.z : 0;

    const kX = Number.isFinite(kitePos?.x) ? kitePos.x : 0;
    const kY = Number.isFinite(kitePos?.y) ? kitePos.y : 0;
    const kZ = Number.isFinite(kitePos?.z) ? kitePos.z : 0;

    if (!this.isInitialized) {
      this.resetPositions(handPos, kitePos);
    }

    const currentDist = Math.hypot(kX - hX, kY - hY, kZ - hZ);
    this._directDistance = currentDist;

    // Gestão do comprimento físico de linha (spoolLength)
    const slack = Number.isFinite(control.lineSlack) ? Math.max(0, control.lineSlack) : 0;
    const targetSpool = currentDist * (1.0 + slack * 0.32);
    if (!(this.spoolLength > 0)) this.spoolLength = Math.max(10, targetSpool);
    if (!this._spoolControlled) {
      this.spoolLength += (targetSpool - this.spoolLength) * Math.min(1.0, safeDt * 10);
    }
    const minSpool = Math.max(10, currentDist * this._minSpoolRatio);
    const maxSpool = Math.max(minSpool + 10, currentDist * 4, 1200);
    this.spoolLength = Math.max(minSpool, Math.min(maxSpool, Number.isFinite(this.spoolLength) ? this.spoolLength : currentDist));

    const restSegment = Math.max(0.1, this.spoolLength / (this.nodeCount - 1));

    // Forças ambientais
    const damping = this.material.damping;
    const grav = 140 * this.material.linearDensity * 100; // gravidade relativa da linha
    const wX = Number.isFinite(wind?.x) ? wind.x * 28 : 0;
    const wY = Number.isFinite(wind?.y) ? wind.y * 14 : 0;

    // 1. Guarda prevX/prevY dos EXTREMOS a partir de suas posições do frame anterior
    // Antes da fixação com pinNode, n0.x e nEnd.x contêm as posições do passo anterior.
    // Assim, após pinNode(hX/kX), a velocidade (n.x - n.prevX)/dt reflete o deslocamento real.
    const n0   = this.nodes[0];
    const nEnd = this.nodes[this.nodeCount - 1];
    n0.prevX   = n0.x; n0.prevY   = n0.y; n0.prevZ   = n0.z || 0;
    nEnd.prevX = nEnd.x; nEnd.prevY = nEnd.y; nEnd.prevZ = nEnd.z || 0;

    // 2. Integração de Verlet para nós intermediários (1 a N-2)
    for (let i = 1; i < this.nodeCount - 1; i++) {
      const n = this.nodes[i];
      const vx = (n.x - n.prevX) * damping;
      const vy = (n.y - n.prevY) * damping;
      const vz = (n.z - n.prevZ) * damping;

      n.prevX = n.x;
      n.prevY = n.y;
      n.prevZ = n.z;

      // Influência da curva e arrasto do vento
      const sagArc = Math.sin((i / (this.nodeCount - 1)) * Math.PI);
      const accX = wX * sagArc;
      const accY = grav * sagArc + wY * sagArc;

      n.x += vx + accX * safeDt * safeDt;
      n.y += vy + accY * safeDt * safeDt;
      n.z += vz;
    }

    // 3. Fixação dos extremos
    RopeConstraintSolver.pinNode(this.nodes[0], hX, hY, hZ);
    RopeConstraintSolver.pinNode(this.nodes[this.nodeCount - 1], kX, kY, kZ);

    // 4. XPBD com dt explícito — rigidez agora independe de FPS (Passo 3)
    RopeConstraintSolver.solveDistanceConstraints(
      this.nodes,
      restSegment,
      this.material.stiffness,
      4,
      safeDt  // <-- antes não era passado; dt=undefined causava rigidez variável
    );

    // 5. Re-fixação estrita das âncoras após relaxação
    RopeConstraintSolver.pinNode(this.nodes[0], hX, hY, hZ);
    RopeConstraintSolver.pinNode(this.nodes[this.nodeCount - 1], kX, kY, kZ);

    // 6. Atualização de velocidades (agora correta porque prevX dos extremos foi salvo antes)
    for (let i = 0; i < this.nodeCount; i++) {
      const n = this.nodes[i];
      n.vx = (n.x - n.prevX) / safeDt;
      n.vy = (n.y - n.prevY) / safeDt;
      n.vz = (n.z - n.prevZ) / safeDt;
    }

    // 6. Tensão emergente física: relação entre a distância direta e o comprimento liberado
    const strain = currentDist / Math.max(1, this.spoolLength);
    // strain >= 0.98 indica linha reta e esticada; strain < 0.85 indica bastante folga
    const rawTension = Math.max(0.08, Math.min(1.0, 0.12 + (strain - 0.75) * 3.5));
    this.tension = Math.max(0.08, Math.min(1.0, this.tension + (rawTension - this.tension) * Math.min(1.0, safeDt * 8)));
    const normalizedLoad = this.tension * 0.72 + Math.max(0, strain - 0.96) * 4.2;
    // Carga aplicada é propriedade do estado mecânico da corda, não da resistência do material.
    // `maxTension` entra somente em LineStructuralModel ao converter carga -> loadRatio.
    this.structuralLoad = Math.max(0, 50 * normalizedLoad);
    evaluateStructuralLoad(this, this.material, safeDt);

    this.updateAABB();
  }

  adjustSpoolLength(deltaPx = 0) {
    const delta = Number(deltaPx) || 0;
    const direct = Math.max(10, Number(this._directDistance) || 10);
    const minSpool = Math.max(10, direct * this._minSpoolRatio);
    const maxSpool = Math.max(minSpool + 10, direct * 4, 1200);
    const current = Number.isFinite(this.spoolLength) && this.spoolLength > 0 ? this.spoolLength : direct;
    this.spoolLength = Math.max(minSpool, Math.min(maxSpool, current + delta));
    this._spoolControlled = true;
    return this.spoolLength;
  }

  getSlackRatio(handPos = null, kitePos = null) {
    const direct = handPos && kitePos
      ? Math.hypot((kitePos.x || 0) - (handPos.x || 0), (kitePos.y || 0) - (handPos.y || 0), (kitePos.z || 0) - (handPos.z || 0))
      : Math.max(0, Number(this._directDistance) || 0);
    if (!(direct > 1e-6)) return 0;
    return Math.max(0, (this.spoolLength - direct) / direct);
  }

  getMechanicalState(handPos = null, kitePos = null) {
    const directLength = handPos && kitePos
      ? Math.hypot((kitePos.x || 0) - (handPos.x || 0), (kitePos.y || 0) - (handPos.y || 0), (kitePos.z || 0) - (handPos.z || 0))
      : Math.max(0, Number(this._directDistance) || 0);
    return { directLength, spoolLength:this.spoolLength, slackRatio:this.getSlackRatio(handPos,kitePos), strain:directLength/Math.max(1,this.spoolLength), tension:this.tension };
  }

  updateAABB() {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let i = 0; i < this.nodeCount; i++) {
      const n = this.nodes[i];
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
      if (n.z < minZ) minZ = n.z;
      if (n.z > maxZ) maxZ = n.z;
    }

    this.aabb = { minX, maxX, minY, maxY, minZ, maxZ };
    return this.aabb;
  }

  getAABB() {
    return this.aabb;
  }

  getNodes() {
    return this.nodes;
  }

  getSegments() {
    const list = [];
    for (let i = 0; i < this.nodeCount - 1; i++) {
      list.push({
        index: i,
        p1: this.nodes[i],
        p2: this.nodes[i + 1],
        wear: this.segmentWear[i] || 0
      });
    }
    return list;
  }

  /**
   * Aplica desgaste abrasivo em um trecho específico da linha
   * @param {number} segmentIndex Índice do segmento (0 a nodeCount - 2)
   * @param {number} amount Quantidade de desgaste [0, 1]
   * @returns {number} Novo desgaste do segmento
   */
  applySegmentWear(segmentIndex, amount = 0.05) {
    const idx = Math.max(0, Math.min(this.nodeCount - 2, Math.floor(segmentIndex || 0)));
    const amt = Math.max(0, Number(amount) || 0);
    this.segmentWear[idx] = Math.min(1.0, this.segmentWear[idx] + amt);
    this.nodes[idx].wear = this.segmentWear[idx];
    return this.segmentWear[idx];
  }

  applyAbrasionEnergy(segmentIndex, energy, cutResistance = 1, maxWearPerTick = 0.012) {
    const resistance = Math.max(0.001, Number(cutResistance) || 1);
    const cap = Math.max(0, Number(maxWearPerTick) || 0);
    const normalizedDelta = Math.min(cap, Math.max(0, Number(energy) || 0) / resistance);
    const wear = this.applySegmentWear(segmentIndex, normalizedDelta);
    return {
      delta: normalizedDelta,
      wear,
      integrity: Math.max(0, 1 - wear),
      broke: wear >= 1 - 1e-9
    };
  }

  /**
   * Retorna a integridade de um segmento específico [0, 1]
   */
  getSegmentIntegrity(segmentIndex) {
    const idx = Math.max(0, Math.min(this.nodeCount - 2, Math.floor(segmentIndex || 0)));
    return Math.max(0, 1.0 - (this.segmentWear[idx] || 0));
  }

  /**
   * Retorna a integridade do trecho mais gasto da linha [0, 1]
   */
  getWeakestSegmentIntegrity() {
    let maxWear = 0;
    for (let i = 0; i < this.segmentWear.length; i++) {
      if (this.segmentWear[i] > maxWear) maxWear = this.segmentWear[i];
    }
    return Math.max(0, 1.0 - maxWear);
  }

  getNaturalTension() {
    return this.tension;
  }

  /**
   * Puxa a linha no carretel (retão, puxão), encurtando o comprimento e elevando a tensão
   * @param {number} amount Quantidade de linha recolhida em pixels
   */
  pullIn(amount = 5) {
    const amt = Math.max(0, Number(amount) || 0);
    this.spoolLength = Math.max(10, this.spoolLength - amt);
    this.tension = Math.min(1.0, this.tension + 0.12);
  }

  /**
   * Libera linha do carretel (despicada, descarrego), aumentando a folga e criando barriga aerodinâmica
   * @param {number} amount Quantidade de linha liberada em pixels
   */
  releaseSpool(amount = 5) {
    const amt = Math.max(0, Number(amount) || 0);
    this.spoolLength += amt;
    this.tension = Math.max(0.08, this.tension - 0.08);
  }

  /**
   * Localiza o ponto mais próximo da corda física para sincronizar cortes remotos
   * sem assumir um segmento fixo.
   */
  findClosestSegmentToPoint(x, y) {
    const px = Number(x);
    const py = Number(y);
    if (!Number.isFinite(px) || !Number.isFinite(py) || !Array.isArray(this.nodes) || this.nodes.length < 2) {
      return { segmentIndex: 0, t: 0.5, distance: Infinity };
    }

    let best = { segmentIndex: 0, t: 0.5, distance: Infinity };
    for (let i = 0; i < this.nodes.length - 1; i++) {
      const a = this.nodes[i];
      const b = this.nodes[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      const t = len2 > 1e-9
        ? Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2))
        : 0;
      const cx = a.x + dx * t;
      const cy = a.y + dy * t;
      const distance = Math.hypot(px - cx, py - cy);
      if (distance < best.distance) best = { segmentIndex: i, t, distance };
    }
    return best;
  }

  /**
   * Divide a corda fisicamente no ponto exato de ruptura (P10/P15)
   * Retorna os nós da mão (HandRope) e os nós que continuam presos à pipa (FlyawayRope).
   * @param {number} segmentIndex Índice do segmento onde ocorreu o corte (0 a nodeCount - 2)
   * @param {number} t Posição interpolada dentro do segmento [0, 1]
   */
  breakAt(segmentIndex = 0, t = 0.5) {
    const idx = Math.max(0, Math.min(this.nodeCount - 2, Math.floor(segmentIndex || 0)));
    const frac = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0.5));
    const p1 = this.nodes[idx];
    const p2 = this.nodes[idx + 1];

    const breakPoint = {
      x: p1.x + (p2.x - p1.x) * frac,
      y: p1.y + (p2.y - p1.y) * frac,
      z: (p1.z || 0) + ((p2.z || 0) - (p1.z || 0)) * frac
    };

    // 1. Nós que ficam na mão do jogador (0 até idx, terminando no ponto exato de corte)
    const handNodes = [];
    for (let i = 0; i <= idx; i++) {
      handNodes.push({ ...this.nodes[i] });
    }
    handNodes.push({
      x: breakPoint.x,
      y: breakPoint.y,
      z: breakPoint.z,
      prevX: breakPoint.x,
      prevY: breakPoint.y,
      prevZ: breakPoint.z,
      vx: (p1.vx || 0) * (1 - frac) + (p2.vx || 0) * frac,
      vy: (p1.vy || 0) * (1 - frac) + (p2.vy || 0) * frac,
      vz: (p1.vz || 0) * (1 - frac) + (p2.vz || 0) * frac,
      invMass: 1.0,
      wear: 1.0
    });

    // 2. Nós que continuam pendurados na pipa voada (do ponto de corte até a pipa)
    const flyawayNodes = [];
    flyawayNodes.push({
      x: breakPoint.x,
      y: breakPoint.y,
      z: breakPoint.z,
      prevX: breakPoint.x,
      prevY: breakPoint.y,
      prevZ: breakPoint.z,
      vx: (p1.vx || 0) * (1 - frac) + (p2.vx || 0) * frac,
      vy: (p1.vy || 0) * (1 - frac) + (p2.vy || 0) * frac,
      vz: (p1.vz || 0) * (1 - frac) + (p2.vz || 0) * frac,
      invMass: 1.0,
      wear: 1.0
    });
    for (let i = idx + 1; i < this.nodeCount; i++) {
      flyawayNodes.push({ ...this.nodes[i] });
    }

    this.isBroken = true;
    this.breakInfo = {
      breakPoint,
      segmentIndex: idx,
      segmentT: frac,
      brokenAt: Date.now()
    };
    this.handNodes = handNodes;
    this.flyawayNodes = flyawayNodes;

    return {
      breakPoint,
      handNodes,
      flyawayNodes,
      segmentIndex: idx,
      segmentT: frac,
      remainingRatio: (this.nodeCount - 1 - idx) / (this.nodeCount - 1)
    };
  }
}

