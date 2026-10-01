import { FlyawayKite } from './FlyawayKite.js';

/** Pipa cortada: queda visual cinematográfica e física real de voada (P10/P15). */
export class FallingKite extends FlyawayKite {
  constructor(kiteData, startXOrBreakInfo, startY) {
    const isBreakInfo = (startXOrBreakInfo && typeof startXOrBreakInfo === 'object' && !Number.isFinite(startXOrBreakInfo));
    const breakInfo = isBreakInfo ? startXOrBreakInfo : {
      breakPoint: {
        x: Number.isFinite(startXOrBreakInfo) ? startXOrBreakInfo : (kiteData?.x || 540),
        y: Number.isFinite(startY) ? startY : (kiteData?.y || 400),
        z: kiteData?.z || 120
      }
    };
    super(kiteData, breakInfo);

    // Propriedades explícitas para compatibilidade e auditoria de memória
    this.userId = kiteData?.userId || null;
    this.id = 'fk_' + (this.userId || Math.random().toString(36).slice(2)) + '_' + Date.now();
    this.bodyColor = kiteData?.bodyColor || 0xff6633;
    this.life = 3.5;
    if (isBreakInfo) {
      this.life = 25.0; // Pipa voada física fica até 25s no ar para disputa autêntica de aparo
    }
    this.catchInterval = null;
  }

  update(delta = 1, screenHeight = 1920, lajeY = null, wind = null) {
    const floorLimit = Number.isFinite(lajeY) ? (lajeY - 40) : (screenHeight * 0.72);
    if (this.y >= floorLimit) {
      this.y = floorLimit;
      this.life = 0;
      this.alpha = 0;
      return;
    }
    super.update(delta, screenHeight, lajeY, wind);
  }

  catch(catcherNick) {
    this.isCaught = true;
    if (this.tagText) {
      this.tagText.text = 'APARADA POR ' + String(catcherNick || 'JOGADOR').slice(0, 16) + '!';
      this.tagText.style.fill = '#ffd700';
    }
    this.life = Math.min(this.life, 3.0);
  }

  destroy(options) {
    if (this.catchInterval) {
      clearInterval(this.catchInterval);
      this.catchInterval = null;
    }
    super.destroy(options);
  }
}
