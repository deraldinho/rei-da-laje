/**
 * RopeConstraintSolver - Solucionador XPBD (Extended Position-Based Dynamics)
 *
 * Implementa XPBD verdadeiro com compliance e lambda acumulado por segmento.
 * A rigidez resultante é INDEPENDENTE de FPS e do número de iterações,
 * ao contrário do PBD clássico.
 *
 * Referência: Müller et al. 2020 — «Small Steps in Physics Simulation»
 *   compliance C = 1 / stiffness
 *   alpha       = C / dt²        (compliance normalizado)
 *   Δλ          = (−C − α·λ) / (w1 + w2 + α)
 *   correção    = Δλ / currentDist × [dx, dy, dz]
 */
export class RopeConstraintSolver {
  /**
   * Resolve as restrições de distância entre nós vizinhos da linha.
   * @param {Array}  nodes      Partículas [{x, y, z, invMass}, ...]
   * @param {number} restLength Comprimento de repouso por segmento
   * @param {number} stiffness  Rigidez [0.1, 1.0]  (1.0 = inextensível)
   * @param {number} iterations Iterações de Gauss-Seidel (default: 4)
   * @param {number} dt         Timestep físico em segundos (default: 1/60)
   */
  static solveDistanceConstraints(nodes, restLength, stiffness = 0.9, iterations = 4, dt = 1 / 60) {
    if (!nodes || nodes.length < 2) return;
    const numSegments = nodes.length - 1;
    const targetRest = Math.max(0.001, Number(restLength) || 1.0);
    const iters      = Math.max(1, Math.min(10, Math.floor(iterations || 4)));
    const safeDt     = Math.max(1e-4, Number(dt) || 1 / 60);

    // XPBD verdadeiro: compliance física α é a complacência elástica (inverso da rigidez).
    // stiffness = 1.0 significa corpo rígido/inextensível (compliance = 0, alpha = 0).
    // Conforme stiffness diminui, a complacência aumenta (material mais elástico/macio).
    const s = Math.max(0.01, Math.min(1.0, Number(stiffness) || 0.9));
    const compliance = (1.0 - s) * 1e-4;
    // alpha: compliance normalizado pelo quadrado do timestep (XPBD)
    const alpha = compliance / (safeDt * safeDt);

    // Acumula multiplicadores de Lagrange por segmento (resetado a cada chamada)
    const lambda = new Float32Array(numSegments);

    for (let iter = 0; iter < iters; iter++) {
      for (let i = 0; i < numSegments; i++) {
        const p1 = nodes[i];
        const p2 = nodes[i + 1];

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = (p2.z || 0) - (p1.z || 0);

        const currentDist = Math.hypot(dx, dy, dz);
        if (currentDist < 1e-6) continue;

        // Violação de restrição: C = |p2 - p1| - restLength
        const C = currentDist - targetRest;

        const w1 = p1.invMass || 0;
        const w2 = p2.invMass || 0;
        const totalW = w1 + w2;
        if (totalW < 1e-9) continue;

        // XPBD: Δλ = (−C − α·λ) / (totalW + α)
        const dLambda = (-C - alpha * lambda[i]) / (totalW + alpha);
        lambda[i] += dLambda;

        // Gradiente normalizado da restrição
        const nx = dx / currentDist;
        const ny = dy / currentDist;
        const nz = dz / currentDist;

        if (w1 > 0) {
          p1.x -= w1 * dLambda * nx;
          p1.y -= w1 * dLambda * ny;
          if (p1.z !== undefined) p1.z -= w1 * dLambda * nz;
        }
        if (w2 > 0) {
          p2.x += w2 * dLambda * nx;
          p2.y += w2 * dLambda * ny;
          if (p2.z !== undefined) p2.z += w2 * dLambda * nz;
        }
      }
    }
  }

  /**
   * Fixa nó com âncora rígida (mão do boneco ou cabresto da pipa).
   * Atribui invMass = 0 para que o XPBD o trate como corpo de massa infinita.
   */
  static pinNode(node, targetX, targetY, targetZ = 0) {
    if (!node) return;
    node.x = targetX;
    node.y = targetY;
    if (node.z !== undefined || targetZ !== 0) node.z = targetZ;
    node.invMass = 0;
  }
}
