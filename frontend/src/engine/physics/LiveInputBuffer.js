/**
 * LiveInputBuffer - Amortecedor de Entradas de Chat e Curtidas (P12)
 * 
 * Resolve o problema de rajadas de comentários do TikTok:
 * - Evita aplicar 30 impulsos pontuais bruscos que fariam a pipa quebrar ou teleportar.
 * - Acumula commentEnergy e drena suavemente a 60 Hz.
 * - Transforma a intensidade da torcida em aceleração contínua da carretilha.
 */
export class LiveInputBuffer {
  constructor(kite) {
    this.kite = kite;
    this.commentEnergy = 0;       // Energia acumulada de comentários
    this.likeEnergy = 0;          // Energia acumulada de curtidas
    this.pendingCommands = [];    // Fila rápida de comandos com despike
    this.lastCommandTime = 0;
  }

  /**
   * Registra um comentário recebido do público
   * @param {string} text Texto do comentário ou comando
   * @param {string} user Identificador do usuário
   */
  addComment(text = '', user = null) {
    const clean = String(text || '').trim().toLowerCase();
    this.commentEnergy = Math.min(50.0, this.commentEnergy + 1.2);

    // Identifica comandos clássicos no texto
    let cmd = null;
    if (clean.includes('puxar') || clean.includes('#puxar') || clean.includes('puxa') || clean === '1') {
      cmd = 'puxar';
    } else if (clean.includes('descarregar') || clean.includes('#descarregar') || clean.includes('solta') || clean === '2') {
      cmd = 'descarregar';
    } else if (clean.includes('despicar') || clean.includes('#despicar') || clean.includes('desbica') || clean === '3') {
      cmd = 'despicar';
    } else if (clean.includes('tenteio') || clean.includes('#tenteio') || clean.includes('tenteia') || clean === '4') {
      cmd = 'tenteio';
    }

    if (cmd) {
      this.pendingCommands.push({ cmd, at: Date.now() });
      if (this.pendingCommands.length > 5) this.pendingCommands.shift();
    }
  }

  /**
   * Registra rajada de curtidas (likes)
   * @param {number} count Quantidade de curtidas
   */
  addLikes(count = 1) {
    const safeCount = Math.max(1, Math.min(100, Number(count) || 1));
    this.likeEnergy = Math.min(40.0, this.likeEnergy + safeCount * 0.4);
  }

  /**
   * Atualização determinística no ciclo físico de 60 Hz
   * Drena a energia suavemente e aciona o PlayerIntentController
   * @param {number} dt Delta de tempo fixo (segundos)
   * @param {PlayerIntentController} intentController Controlador de intenção da pipa
   */
  step(dt = 1 / 60, intentController = null) {
    // Decaimento suave exponencial da energia
    this.commentEnergy *= Math.pow(0.92, dt * 60);
    this.likeEnergy *= Math.pow(0.94, dt * 60);

    if (!intentController) return;

    // Se houver comando explícito pendente e o controlador estiver livre
    const now = Date.now();
    if (this.pendingCommands.length > 0 && (!intentController.currentAction || intentController.actionTimer <= 0.15)) {
      if (now - this.lastCommandTime >= 280) {
        const next = this.pendingCommands.shift();
        intentController.triggerAction(next.cmd, 1.1, { intensity: 1.0 + Math.min(1.0, this.commentEnergy * 0.05) });
        this.lastCommandTime = now;
      }
    }

    // Energia de chat geral (torcida) gera tensão e aceleração leve da carretilha
    if (this.commentEnergy > 1.0 && !intentController.currentAction) {
      const cheerPull = Math.min(2.5, this.commentEnergy * 0.12);
      intentController.reelVelocity -= cheerPull;
      intentController.liftIntent += cheerPull * 0.15;
      intentController.tensionAssist += cheerPull * 0.04;
    }

    // Energia de curtidas gera sustentação e estabilidade
    if (this.likeEnergy > 1.0) {
      intentController.liftIntent += Math.min(0.35, this.likeEnergy * 0.02);
    }
  }
}
