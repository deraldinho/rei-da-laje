/**
 * Agrega apenas a carga lógica de múltiplos relinhos.
 *
 * IMPORTANTE: contato entre LINHAS não pode puxar/teletransportar os corpos das
 * pipas para o ponto médio do grupo. A reação mecânica deve nascer da corda
 * (RopePhysics/KiteDynamics), não de uma força artificial par-a-par.
 *
 * A versão anterior somava pullX/pullY e aplicava drag ao corpo. Com 3+ contatos
 * isso criava um "ímã coletivo": todas as pipas convergiam, tremiam juntas e
 * mantinham todos os pares presos no narrow-phase, elevando o custo do frame.
 */
export class CombatContactAccumulator {
  constructor() {
    this.responses = new Map();
  }

  _state(kite) {
    const key = String(kite?.userId ?? '');
    if (!this.responses.has(key)) {
      this.responses.set(key, { kite, contacts: 0, maxLoad: 0 });
    }
    return this.responses.get(key);
  }

  addPair(kiteA, kiteB) {
    if (!kiteA || !kiteB) return;
    const tensionA = Math.max(0.12, Math.min(1, Number(kiteA.lineTension) || 0.58));
    const tensionB = Math.max(0.12, Math.min(1, Number(kiteB.lineTension) || 0.58));
    const load = Math.min(1.2, tensionA + tensionB);

    const a = this._state(kiteA);
    a.contacts += 1;
    a.maxLoad = Math.max(a.maxLoad, load);

    const b = this._state(kiteB);
    b.contacts += 1;
    b.maxLoad = Math.max(b.maxLoad, load);
  }

  apply() {
    // Não altera x/y/vx/vy. A força física do contato chega ao corpo através da
    // geometria da corda e da tensão lida por KiteDynamics no próximo fixed step.
    // Mantemos apenas um indicador saturado opcional para UI/telemetria.
    for (const state of this.responses.values()) {
      const kite = state.kite;
      if (!kite || state.contacts <= 0) continue;
      kite.combatContactLoad = Math.min(1, 0.35 + state.maxLoad * 0.35 + Math.min(3, state.contacts - 1) * 0.08);
    }
    this.responses.clear();
  }
}
