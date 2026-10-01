/**
 * PhysicsClock - Relógio de Integração com Passo de Tempo Fixo (Fixed Timestep)
 * 
 * Garante determinismo físico estrito em qualquer taxa de quadros (30, 60, 120, 144, 240 FPS).
 * Acumula o tempo real decorrido e executa substeps fixos com clamp contra death spiral.
 */
export class PhysicsClock {
  /**
   * @param {number} fixedDt Intervalo fixo em segundos (default: 1/60s ≈ 0.01667s)
   * @param {number} maxSubsteps Número máximo de passos por frame (default: 4)
   */
  constructor(fixedDt = 1 / 60, maxSubsteps = 4) {
    this.fixedDt = Number.isFinite(fixedDt) && fixedDt > 0 ? fixedDt : 1 / 60;
    this.maxSubsteps = Math.max(1, Math.min(10, Math.floor(maxSubsteps || 4)));
    this.accumulator = 0;
    this.time = 0;
    this.lastDelta = 0;
  }

  /**
   * Avança o relógio físico com o delta do frame atual
   * @param {number} deltaSeconds Tempo decorrido em segundos
   * @param {Function} stepCallback Função chamada para cada substep: stepCallback(dt, currentTime)
   * @returns {{ steps: number, alpha: number, time: number }}
   */
  update(deltaSeconds, stepCallback) {
    // Clamping de segurança para prevenir saltos gigantes se a aba pausar ou travar
    const dt = Math.max(0, Math.min(0.2, Number(deltaSeconds) || 0));
    this.lastDelta = dt;
    this.accumulator += dt;

    let steps = 0;
    const eps = 1e-5;
    while (this.accumulator >= this.fixedDt - eps && steps < this.maxSubsteps) {
      if (typeof stepCallback === 'function') {
        stepCallback(this.fixedDt, this.time);
      }
      this.time += this.fixedDt;
      this.accumulator = Math.max(0, this.accumulator - this.fixedDt);
      steps++;
    }

    // Se o acumulador ainda exceder 2x o fixedDt após maxSubsteps, zera o resíduo para evitar lag infinito
    if (this.accumulator > this.fixedDt * 2) {
      this.accumulator = 0;
    }

    // Fator de interpolação entre o passo anterior e o atual (para renderização visualmente suave)
    const alpha = this.fixedDt > 0 ? Math.max(0, Math.min(1, this.accumulator / this.fixedDt)) : 1.0;
    return { steps, alpha, time: this.time };
  }

  reset() {
    this.accumulator = 0;
    this.time = 0;
  }
}
