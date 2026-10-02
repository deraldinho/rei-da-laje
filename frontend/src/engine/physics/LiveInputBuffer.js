import { createCommentGesture } from './CommentGestureEngine.js';

/**
 * Amortece entradas da live sem criar um segundo controlador físico.
 * Comentários viram envelopes curtos; a fila existente continua limitada.
 */
export class LiveInputBuffer {
  constructor(kite) {
    this.kite = kite;
    this.commentEnergy = 0;
    this.likeEnergy = 0;
    this.pendingCommands = []; // nome legado; agora contém gestos físicos.
    this.lastCommandTime = 0;
  }

  addComment(text = '', user = null, context = {}) {
    const clean = String(text || '').trim().toLowerCase();
    if (!clean) return null;
    this.commentEnergy = Math.min(50, this.commentEnergy + 1.2);
    const userId = String(user || this.kite?.userId || 'anon');
    const gesture = createCommentGesture({ text: clean, userId, kite: this.kite,
      wind: context.wind || null, lineDensity: context.lineDensity || null,
      engagement: Number(context.engagement) || 0 });
    if (!gesture) return null;
    const now = Number(context.nowMs) || Date.now();
    const last = this.pendingCommands[this.pendingCommands.length - 1];
    if (last && last.userId === userId && last.text === clean && now - last.at < 220) {
      last.gesture = gesture;
      last.at = now;
      return gesture;
    }
    this.pendingCommands.push({ gesture, at: now, text: clean, userId });
    if (this.pendingCommands.length > 5) this.pendingCommands.shift();
    return gesture;
  }

  addLikes(count = 1) {
    const safeCount = Math.max(1, Math.min(100, Number(count) || 1));
    this.likeEnergy = Math.min(40, this.likeEnergy + safeCount * 0.4);
  }

  step(dt = 1 / 60, intentController = null, context = {}) {
    const seconds = Math.max(0, Math.min(.1, Number(dt) || 1 / 60));
    this.commentEnergy *= Math.pow(0.92, seconds * 60);
    this.likeEnergy *= Math.pow(0.94, seconds * 60);
    if (!intentController) return;

    const now = Number(context.nowMs) || Date.now();
    const free = !intentController.currentAction || intentController.actionTimer <= .15;
    if (this.pendingCommands.length > 0 && free && now - this.lastCommandTime >= 160) {
      const next = this.pendingCommands.shift();
      intentController.triggerIntentEnvelope?.(next.gesture);
      this.lastCommandTime = now;
    }

    // Curtidas continuam como influência leve; comentários já possuem gesto próprio.
    if (this.likeEnergy > 1 && !intentController.currentAction) {
      const lift = Math.min(.35, this.likeEnergy * .02);
      intentController.trimPitch -= lift * .12;
      intentController.tensionAssist += lift * .08;
    }
  }
}
