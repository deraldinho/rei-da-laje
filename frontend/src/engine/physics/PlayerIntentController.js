/**
 * PlayerIntentController - Controlador de Intenções Físicas (P11)
 * 
 * Converte comandos clássicos de Pipa Combate e ações de live em INTENÇÃO FÍSICA:
 * - reelVelocity: velocidade do carretel (negativo = puxar, positivo = descarregar)
 * - liftIntent: arfagem / sustentação aerodinâmica (+1 = subir, -1 = mergulhar)
 * - steerIntent: guinada / rolagem lateral (-1 = esquerda, +1 = direita)
 * - tensionAssist: tração extra de linha aplicada por puxão
 * 
 * Elimina teletransporte ou alteração direta de coordenadas: a intenção alimenta
 * o KiteDynamics e o RopePhysics a 60 Hz.
 */
export class PlayerIntentController {
  constructor(kite) {
    this.kite = kite;
    this.reelVelocity = 0;      // px/s de carretel
    this.liftIntent = 0;        // [-1.5, 1.5]
    this.steerIntent = 0;       // [-1.0, 1.0]
    this.tensionAssist = 0;     // [0, 0.4]
    this.currentAction = null;  // Ação atual ativa
    this.actionTimer = 0;       // Tempo restante da ação
    this.actionDuration = 0;
    this.targetKite = null;     // Alvo para manobra de perseguição/ataque
    this.tenteioPulseTimer = 0; // Temporizador de ondas do tenteio
  }

  /**
   * Dispara uma ação clássica ou de chat baseada em intenção física
   * @param {string} actionName Nome da ação ('puxar', 'descarregar', 'despicar', 'tenteio', 'retao', etc.)
   * @param {number} duration Duração em segundos
   * @param {object} options Parâmetros extras { target, intensity, steerDir }
   */
  triggerAction(actionName, duration = 1.2, options = {}) {
    this.currentAction = String(actionName || '').toLowerCase();
    this.actionDuration = Math.max(0.2, Number(duration) || 1.2);
    this.actionTimer = this.actionDuration;
    this.targetKite = options.target || null;
    this.customSteer = Number.isFinite(options.steerDir) ? options.steerDir : null;
    this.intensity = Math.max(0.5, Math.min(2.5, Number(options.intensity) || 1.0));
  }

  /**
   * Atualiza as intenções físicas a cada passo do PhysicsClock (60 Hz)
   * @param {number} dt Delta de tempo fixo (segundos)
   * @param {object} wind Vetor de vento {x, y, gust}
   * @param {Array} allKites Lista de todas as pipas na arena (para perseguição e aparo)
   * @returns {object} Intenção consolidada { reelVelocity, liftIntent, steerIntent, tensionAssist }
   */
  update(dt = 1 / 60, wind = null, allKites = []) {
    const wX = Number.isFinite(wind?.x) ? wind.x : 0;

    // Decaimento natural das intenções
    this.reelVelocity *= Math.pow(0.85, dt * 60);
    this.liftIntent *= Math.pow(0.82, dt * 60);
    this.steerIntent *= Math.pow(0.80, dt * 60);
    this.tensionAssist *= Math.pow(0.78, dt * 60);

    if (this.actionTimer > 0 && this.currentAction) {
      this.actionTimer -= dt;
      const progress = 1.0 - (this.actionTimer / this.actionDuration);

      switch (this.currentAction) {
        case 'puxar':
        case 'puxao':
          // Puxar: carretilha recolhe velozmente, encurta linha, eleva tensão e arranca na direção do bico
          this.reelVelocity = -4.5 * this.intensity;
          this.liftIntent = 0.55 * this.intensity;
          this.tensionAssist = 0.22 * this.intensity;
          this.steerIntent = this.customSteer !== null ? this.customSteer : (Math.sin(progress * Math.PI) * 0.2);
          break;

        case 'descarregar':
        case 'descarrego':
          // Descarregar: solta linha rapidamente, zera a tensão, linha cria barriga (sag), menos atrito no relinho
          this.reelVelocity = 5.2 * this.intensity;
          this.liftIntent = -0.25;
          this.tensionAssist = -0.15;
          this.steerIntent = wX * 0.35; // Acompanha o vento suavemente
          break;

        case 'despicar':
        case 'desbicada':
          // Despicar: solta carretel, nariz aponta para baixo, mergulho veloz na direção do oponente
          this.reelVelocity = 1.8 * this.intensity;
          this.liftIntent = -1.1 * this.intensity;
          this.steerIntent = this.customSteer !== null ? this.customSteer : (this.kite.x < 540 ? 0.75 : -0.75);
          break;

        case 'tenteio':
          // Tenteio: pulsos rápidos de puxa-e-solta (ondas de tensão)
          this.tenteioPulseTimer += dt * 14;
          const pulse = Math.sin(this.tenteioPulseTimer);
          this.reelVelocity = pulse > 0 ? -3.5 : 2.5;
          this.liftIntent = pulse * 0.4;
          this.steerIntent = Math.cos(this.tenteioPulseTimer * 0.7) * 0.35;
          this.tensionAssist = pulse > 0 ? 0.18 : 0;
          break;

        case 'retao':
          // Retão (Presente Rosa / Especial): Tração agressiva contínua alinhada à linha inimiga
          this.reelVelocity = -6.2 * this.intensity;
          this.liftIntent = 0.85 * this.intensity;
          this.tensionAssist = 0.35 * this.intensity;
          const target = this.targetKite || this.findClosestTarget(allKites, 280);
          if (target) {
            const dirX = target.x >= this.kite.x ? 1 : -1;
            this.steerIntent = dirX * 0.85;
          } else {
            this.steerIntent = this.kite.x < 540 ? 0.7 : -0.7;
          }
          break;

        case 'perseguir':
          // Perseguir: calcula vetor em direção ao oponente mais próximo e manobra para cruzar
          const pTarget = this.targetKite || this.findClosestTarget(allKites, 320);
          if (pTarget) {
            const dx = pTarget.x - this.kite.x;
            const dy = pTarget.y - this.kite.y;
            this.steerIntent = Math.max(-1.0, Math.min(1.0, dx / 120));
            this.liftIntent = dy < 0 ? 0.7 : -0.5;
            this.reelVelocity = -3.2 * this.intensity;
          }
          break;

        case 'aparar_retao':
        case 'aparar_despicada':
        case 'aparar':
          // Aparar: alivia a pressão mecânica de ataque, reposiciona a pipa e reduz a força normal no contato
          this.reelVelocity = 2.8;
          this.liftIntent = -0.3;
          this.steerIntent = this.kite.x < 540 ? -0.6 : 0.6;
          this.tensionAssist = -0.10;
          break;

        default:
          break;
      }

      if (this.actionTimer <= 0) {
        this.currentAction = null;
      }
    } else {
      // AUTO FLIGHT: Voo natural contínuo por equilíbrio de vento e cabresto quando não há comando ativo
      this.applyAutoFlightTrim(dt, wind);
    }

    return {
      reelVelocity: this.reelVelocity,
      liftIntent: this.liftIntent,
      steerIntent: this.steerIntent,
      tensionAssist: this.tensionAssist
    };
  }

  /**
   * Voo automático estabilizado: mantém a pipa no céu oscilando suavemente com o vento
   */
  applyAutoFlightTrim(dt, wind) {
    const wX = Number.isFinite(wind?.x) ? wind.x : 0;
    const sway = Math.sin((this.kite.oscillationTimer || 0) * 1.8 + (this.kite.windPhase || 0));
    // Pequeno ajuste para manter a pipa centralizada no céu aberto
    const centerOffset = (this.kite.screenWidth * 0.5 - this.kite.x) / (this.kite.screenWidth * 0.5);
    this.steerIntent = sway * 0.25 + centerOffset * 0.15;
    this.liftIntent = Math.cos((this.kite.oscillationTimer || 0) * 1.4) * 0.18;
    this.reelVelocity = -0.2 * Math.sin((this.kite.oscillationTimer || 0) * 0.8);
  }

  findClosestTarget(allKites, maxReach = 300) {
    if (!Array.isArray(allKites) || allKites.length < 2) return null;
    let closest = null;
    let minDist = maxReach;
    for (const other of allKites) {
      if (other === this.kite || other.isAscending || other.spawnProtection > 0) continue;
      const d = Math.hypot(other.x - this.kite.x, other.y - this.kite.y);
      if (d < minDist) {
        minDist = d;
        closest = other;
      }
    }
    return closest;
  }
}
