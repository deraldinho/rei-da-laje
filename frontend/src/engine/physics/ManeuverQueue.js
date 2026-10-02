/**
 * ManeuverQueue - Fila Inteligente de Manobras e Presentes (P12)
 * 
 * Evita o conflito caótico de presentes simultâneos:
 * - Se a pipa receber RETÃO e depois DESPICADA, a despicada aguarda na fila.
 * - Presentes lendários (ex: Mestre do Céu) têm prioridade alta e assumem imediatamente.
 * - Transições suaves entre manobras consecutivas.
 */
export class ManeuverQueue {
  constructor(kite) {
    this.kite = kite;
    this.activeManeuver = null;
    this.queue = [];
  }

  /**
   * Enfileira uma manobra com prioridade
   * @param {object} maneuverData Dados da manobra { name, duration, reach, speed, damage, priority }
   * @param {PlayerIntentController} intentController Controlador de intenção
   */
  enqueue(maneuverData, intentController = null) {
    if (!maneuverData) return;

    const m = {
      name: String(maneuverData.name || 'retao').toLowerCase(),
      duration: Math.max(1.0, Number(maneuverData.duration) || 15.0),
      remaining: Math.max(1.0, Number(maneuverData.duration) || 15.0),
      reach: Number(maneuverData.reach) || 240,
      speed: Number(maneuverData.speed) || 1.3,
      priority: Number(maneuverData.priority) || (maneuverData.name === 'mestre_do_ceu' ? 10 : 1),
      data: maneuverData
    };

    // Se for manobra de prioridade máxima (ex: lendário), interrompe a atual
    if (m.priority >= 10 || !this.activeManeuver) {
      if (this.activeManeuver && this.activeManeuver.remaining > 1.0) {
        this.queue.unshift(this.activeManeuver); // guarda a anterior para terminar depois
      }
      this.activate(m, intentController);
    } else {
      // Adiciona na fila com limite máximo de 4 manobras
      if (this.queue.length < 4) {
        this.queue.push(m);
      }
    }
  }

  activate(maneuver, intentController = null) {
    this.activeManeuver = maneuver;
    this.kite.setManeuver?.(maneuver.data);
    if (intentController) {
      const plan=maneuver.data?.plan;
      intentController.triggerAction(maneuver.name, Math.min(2.4, plan?.duration || maneuver.duration), {
        intensity: plan?.intensity || Math.min(2.0, (maneuver.speed || 1.3) * 1.1),
        steerDir: Number.isFinite(plan?.steerDir) ? plan.steerDir : undefined
      });
    }
  }

  /**
   * Atualização a cada passo físico (60 Hz)
   * @param {number} dt Delta de tempo fixo (segundos)
   * @param {PlayerIntentController} intentController Controlador de intenção
   */
  step(dt = 1 / 60, intentController = null) {
    if (!this.activeManeuver) {
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        this.activate(next, intentController);
      }
      return;
    }

    this.activeManeuver.remaining -= dt;

    if (this.activeManeuver.remaining <= 0) {
      this.activeManeuver = null;
      if (this.queue.length > 0) {
        const next = this.queue.shift();
        this.activate(next, intentController);
      } else {
        this.kite.maneuver = null;
      }
    }
  }
}
