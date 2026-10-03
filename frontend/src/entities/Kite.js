import * as PIXI from 'pixi.js';
import { Tail } from './Tail.js';
import { Line } from './Line.js';
import { Wind } from '../engine/Wind.js';
import { liveVisualScale } from '../ui/LiveLayout.js';
import { rooftopAnchorY } from '../ui/RooftopLayout.js';
import { maneuverPose } from '../engine/ManeuverVisuals.js';
import { benefitExpiry, benefitLabels, formatBenefitTime } from '../engine/GiftBenefitTimer.js';
import { updateLineControl } from '../engine/RelinhoMechanics.js';
import { RopePhysics } from '../engine/physics/RopePhysics.js';
import { KiteDynamics } from '../engine/physics/KiteDynamics.js';
import { PlayerIntentController } from '../engine/physics/PlayerIntentController.js';
import { LiveInputBuffer } from '../engine/physics/LiveInputBuffer.js';
import { ManeuverQueue } from '../engine/physics/ManeuverQueue.js';
import { physicsWorldScale } from '../engine/physics/PhysicsScale.js';

const isSafeAvatarUrl = value => {
  const url=String(value||'').trim();
  return /^https:\/\/[^\s]+$/i.test(url)
    || /^\/player-assets\/avatars\/[a-f0-9]{64}\.(?:jpg|png|webp)$/i.test(url);
};

/**
 * Entidade Principal da Pipa:
 * - Corpo geométrico clássico (Peixinho, Raiada, Carrapeta)
 * - Avatar recortado em círculo com máscara
 * - Nick do jogador flutuando
 * - Rabiola dinâmica (Verlet)
 * - Linha conectada à laje
 * - Movimento vivo com drift e vento forte
 */
export class Kite extends PIXI.Container {
  static hpRegenEnabled = true;
  static hpRegenSpeed = 'normal';
  static spawnProtectionSec = 3;

  static setRegenSettings(settings = {}) {
    if (settings.hpRegenEnabled !== undefined) {
      Kite.hpRegenEnabled = Boolean(settings.hpRegenEnabled);
    }
    if (settings.hpRegenSpeed !== undefined) {
      const spd = String(settings.hpRegenSpeed).toLowerCase();
      if (['lenta', 'normal', 'rapida'].includes(spd)) {
        Kite.hpRegenSpeed = spd;
      }
    }
  }

  static setSpawnProtection(sec) {
    const val = Number(sec);
    if (Number.isFinite(val) && val >= 1 && val <= 30) {
      Kite.spawnProtectionSec = val;
    }
  }

  constructor(playerData, screenWidth = 1080, screenHeight = 1920) {
    super();
    this.userId = playerData.userId;
    this.uniqueId = playerData.uniqueId;
    this.nickname = playerData.nickname || 'Jogador';
    this.profilePictureUrl = playerData.profilePictureUrl;
    this.avatarLoadToken = 0;
    this.kiteType = playerData.kiteType || 'peixinho';
    this.lineType = playerData.lineType || 'algodao';
    this.powerMultiplier = playerData.power || 1.0;
    this.shieldCount = playerData.shield || 0;
    this.score = playerData.score || 0;
    this.streak = playerData.streak || 0;
    this.isKing = !!playerData.isKing;
    this.isLeader = false;
    this.spawnProtection = Number.isFinite(playerData.spawnProtection)
      ? playerData.spawnProtection
      : (Kite.spawnProtectionSec || 3);
    this.likeBoostRemaining = 0;
    this.shieldPulse = 0;
    this.maneuver = null;
    this.chatAction = null;
    this.commandHistory = [];
    this.chatCombo = null;
    this.lineTension = .58;
    this.targetLineTension = .58;
    this.defenseWindowRemaining = 0;
    this.likeSpool = 0;
    this.likeSpoolRemaining = 0;
    this.contactSpeed = 0;
    this.buffExpiresAt = 0;
    this.specialExpiresAt = {};
    this.lastBenefitText = '';
    this.lastBenefitSecond = -1;
    this.criticalLine = false;

    // Sistema de Vida da Linha (HP)
    this.maxLineHP = this.getMaxHPForLine(this.lineType);
    this.lineHP = this.maxLineHP;
    this.isInCombat = false; // true enquanto linhas cruzadas
    this.combatCooldown = 0; // tempo desde último combate (para regen)
    this._hpBarDirty = false; // redraw Pixi da barra apenas uma vez por frame

    // Dimensões da tela e âncora na laje
    this.screenWidth = screenWidth;
    this.screenHeight = screenHeight;
    this.physicsScale = physicsWorldScale(screenWidth, screenHeight);
    this.visualScale = liveVisualScale(screenWidth, screenHeight);
    this.baseX = screenWidth * (0.15 + Math.random() * 0.7);
    this.baseY = rooftopAnchorY(screenWidth, screenHeight); // âncora compartilhada com a laje

    // Posição inicial no ar para decolagem (sempre no alto do céu aberto)
    this.targetX = screenWidth * (0.15 + Math.random() * 0.70);
    this.targetY = screenHeight * (0.18 + Math.random() * 0.16);
    this.x = this.targetX;
    this.y = Math.min(screenHeight * 0.58, this.targetY + 45);

    this.vx = 0;
    this.vy = 0;
    this.oscillationTimer = Math.random() * 100;
    this.specials = {};
    this.windPhase = Math.random() * Math.PI * 2;
    this.isAscending = true;
    this.z = Number.isFinite(playerData?.z) ? playerData.z : 0;
    this.baseZ = Number.isFinite(playerData?.baseZ) ? playerData.baseZ : 0;

    // Sensibilidade individual às correntes compartilhadas.
    this.windInfluence = 0.8 + Math.random() * 0.6; // sensibilidade ao vento

    // Componentes Visuais e Físicos
    this.rope = new RopePhysics({ nodeCount: 12, lineType: this.lineType,
      totalLineLength: 1800 * this.physicsScale, minSpoolLength: 80 * this.physicsScale, worldScale: this.physicsScale });
    this.intentController = new PlayerIntentController(this);
    this.inputBuffer = new LiveInputBuffer(this);
    this.maneuverQueue = new ManeuverQueue(this);
    this.line = new Line(this.baseX, this.baseY);
    this.tail = new Tail(14, 8);
    this.bodyGraphic = new PIXI.Graphics();
    this.avatarContainer = new PIXI.Container();
    this.hpBarContainer = new PIXI.Container();
    this.benefitText = new PIXI.Text('', {fontFamily:'Arial',fontSize:10,fontWeight:'bold',fill:0xffe07a,
      stroke:0x102e43,strokeThickness:3,align:'center'});
    this.benefitText.anchor.set(0.5,0);this.benefitText.y=44;this.benefitText.visible=false;
    this.maneuverGlow = new PIXI.Graphics();
    this.maneuverTrail = new PIXI.Graphics();
    this.maneuverLabel = new PIXI.Text('',{fontFamily:'Arial',fontSize:11,fontWeight:'900',fill:0xffe07a,
      stroke:0x102e43,strokeThickness:4,align:'center'});
    this.maneuverLabel.anchor.set(0.5,1);
    this.maneuverLabel.y = -60;
    this.maneuverLabel.visible = false;

    // Montagem na ordem de profundidade
    this.leaderGlow = new PIXI.Graphics();
    this.leaderGlow.lineStyle(3, 0xffd56a, 0.9);
    this.leaderGlow.drawCircle(0, 0, 39);
    this.leaderGlow.visible = false;
    this.addChild(this.leaderGlow);
    this.addChild(this.maneuverTrail);
    this.addChild(this.maneuverGlow);
    this.addChild(this.bodyGraphic);
    this.addChild(this.avatarContainer);
    this.addChild(this.hpBarContainer);
    this.addChild(this.benefitText);
    this.addChild(this.maneuverLabel);
    this.createNickText();
    this.createHPBar();

    this.renderKite();
    this.loadAvatar();
  }

  createNickText() {
    this.tagContainer = new PIXI.Container();
    this.tagBg = new PIXI.Graphics();
    this.tagContainer.addChild(this.tagBg);

    const displayName = this.nickname.length > 11 ? this.nickname.slice(0, 10) + '…' : this.nickname;
    this.nickText = new PIXI.Text(displayName, {
      fontFamily: 'Outfit, sans-serif',
      fontSize: 10,
      fontWeight: '800',
      fill: '#ffffff',
      align: 'center'
    });
    this.nickText.anchor.set(0.5, 0.5);
    this.tagContainer.addChild(this.nickText);

    this.stateIconText = new PIXI.Text('', { fontSize: 9.5 });
    this.stateIconText.anchor.set(0.5, 0.5);
    this.tagContainer.addChild(this.stateIconText);

    this.tagContainer.y = -36;
    this.tagContainer.visible = !this.isAscending && (this.y < this.baseY - 70);
    this.addChild(this.tagContainer);

    // Coroa do Rei da Laje
    this.crownText = new PIXI.Text('👑', { fontSize: 16 });
    this.crownText.anchor.set(0.5, 1);
    this.crownText.y = -48;
    this.crownText.visible = false;
    this.addChild(this.crownText);

    this.renderTag();
  }

  renderTag() {
    if (!this.tagBg || !this.nickText) return;
    if (this.isAscending || this.y >= this.baseY - 70) {
      if (this.tagContainer) this.tagContainer.visible = false;
      return;
    }
    if (this.tagContainer) this.tagContainer.visible = true;
    const isKing = this.isKing || this.isLeader;
    const hasShield = this.shieldCount > 0 || this.isInvulnerable;
    const hasManeuver = Boolean(this.maneuver && this.maneuver.remaining > 0);

    let stateIcon = '';
    if (isKing) stateIcon = '👑';
    else if (hasShield) stateIcon = '🛡️';
    else if (hasManeuver) {
      if (this.maneuver.name === 'retao') stateIcon = '⚡';
      else if (this.maneuver.name === 'despicar') stateIcon = '↘';
      else if (this.maneuver.name.startsWith('aparar')) stateIcon = '◆';
      else stateIcon = '◎';
    }

    this.stateIconText.text = stateIcon;
    this.stateIconText.visible = Boolean(stateIcon);

    const textWidth = this.nickText.width || 36;
    const iconWidth = stateIcon ? 13 : 0;
    const padding = 12;
    const totalW = Math.max(38, textWidth + iconWidth + padding);
    const totalH = 17;

    this.tagBg.clear();
    this.tagBg.beginFill(0x061521, 0.82);
    if (isKing) {
      this.tagBg.lineStyle(1.5, 0xffe07a, 0.95);
    } else if (hasManeuver) {
      this.tagBg.lineStyle(1.5, 0xf43f5e, 0.9);
    } else {
      this.tagBg.lineStyle(1, 0xffffff, 0.28);
    }
    this.tagBg.drawRoundedRect(-totalW / 2, -totalH / 2, totalW, totalH, totalH / 2);
    this.tagBg.endFill();

    if (stateIcon) {
      this.stateIconText.x = -totalW / 2 + 7;
      this.nickText.x = 4;
    } else {
      this.nickText.x = 0;
    }
  }

  /**
   * Retorna o HP máximo da linha baseado no tipo
   */
  getMaxHPForLine(lineType) {
    const hpTable = {
      algodao: 100,    // linha básica — frágil
      cerol: 140,      // rosa — mais resistente
      chile: 200,      // donut — muito forte
      kevlar: 250,     // capivara — blindada
      tornado: 180,    // perfume — média
      mestre_do_ceu: 320 // épica, mas ainda pode ser cortada
    };
    return hpTable[lineType] || 100;
  }

  /**
   * Cria a barra de vida visual abaixo da pipa
   */
  createHPBar() {
    this.hpBarBg = new PIXI.Graphics();
    this.hpBarFill = new PIXI.Graphics();
    this.hpBarContainer.addChild(this.hpBarBg);
    this.hpBarContainer.addChild(this.hpBarFill);
    this.hpBarContainer.y = 38;
    this.updateHPBar();
  }

  /**
   * Atualiza visual da barra de HP
   */
  updateHPBar() {
    this._hpBarDirty = false;
    const barWidth = 36;
    const barHeight = 4;
    const hpRatio = Math.max(0, this.lineHP / this.maxLineHP);

    // Fundo escuro
    this.hpBarBg.clear();
    this.hpBarBg.beginFill(0x000000, 0.6);
    this.hpBarBg.drawRoundedRect(-barWidth / 2, 0, barWidth, barHeight, 2);
    this.hpBarBg.endFill();

    // Barra de vida colorida (verde > amarelo > vermelho)
    this.hpBarFill.clear();
    let fillColor;
    if (hpRatio > 0.6) fillColor = 0x2ea043; // verde
    else if (hpRatio > 0.3) fillColor = 0xffcc00; // amarelo
    else fillColor = 0xff0055; // vermelho crítico

    this.hpBarFill.beginFill(fillColor, 0.95);
    this.hpBarFill.drawRoundedRect(-barWidth / 2, 0, barWidth * hpRatio, barHeight, 2);
    this.hpBarFill.endFill();

    // Barra de sangue sempre visível em voo normal ou combate (nunca desaparece)
    this.hpBarContainer.visible = !this.isAscending;
  }

  flushHPBarVisual() {
    if (this._hpBarDirty) this.updateHPBar();
  }

  /**
   * Recebe dano na linha durante relinho
   * Retorna true se a linha estourou (HP <= 0)
   */
  takeDamage(amount) {
    this.lineHP -= amount;
    this.isInCombat = true;
    this.combatCooldown = 0;
    this._hpBarDirty = true;
    return this.lineHP <= 0;
  }

  /**
   * Regenera HP da linha quando fora de combate
   */
  regenHP(delta) {
    if (this.isInCombat) return;
    const enabled = this.hpRegenEnabled !== undefined ? this.hpRegenEnabled : (typeof Kite !== 'undefined' ? Kite.hpRegenEnabled : true);
    if (!enabled) return;
    if (this.lineHP < this.maxLineHP) {
      // Base: 'normal' = 100 HP em 10 minutos a 60 FPS: 1/6 HP/s (delta / 360).
      // 'lenta' = 0.5x (delta / 720, 20 minutos).
      // 'rapida' = 2.5x (delta / 144, 4 minutos).
      const speed = this.hpRegenSpeed || (typeof Kite !== 'undefined' ? Kite.hpRegenSpeed : 'normal');
      let divisor = 360;
      if (speed === 'lenta') divisor = 720;
      else if (speed === 'rapida') divisor = 144;

      const hpGain = delta / divisor;
      this.lineHP = Math.min(this.maxLineHP, this.lineHP + hpGain);
      this._hpBarDirty = true;

      // Regenera proporcionalmente o desgaste localizado por segmento da corda física
      if (this.rope && this.rope.segmentWear) {
        const regenRatio = hpGain / Math.max(1, this.maxLineHP);
        for (let i = 0; i < this.rope.segmentWear.length; i++) {
          if (this.rope.segmentWear[i] > 0) {
            this.rope.segmentWear[i] = Math.max(0, this.rope.segmentWear[i] - regenRatio);
            if (this.rope.nodes && this.rope.nodes[i]) {
              this.rope.nodes[i].wear = this.rope.segmentWear[i];
            }
          }
        }
      }
    }
  }

  renderKite() {
    this.bodyGraphic.clear();

    const colors = {
      peixinho: { primary: 0x00f0ff, secondary: 0x0077b6 },
      raiada: { primary: 0xff0055, secondary: 0xffcc00 },
      carrapeta: { primary: 0x7928ca, secondary: 0xff0080 }
    };

    const c = colors[this.kiteType] || colors.peixinho;
    this.bodyColor = c.primary;

    // Corpo Losango
    this.bodyGraphic.beginFill(c.primary, 0.95);
    this.bodyGraphic.lineStyle(2, 0xffffff, 0.8);
    this.bodyGraphic.moveTo(0, -28);
    this.bodyGraphic.lineTo(24, 0);
    this.bodyGraphic.lineTo(0, 32);
    this.bodyGraphic.lineTo(-24, 0);
    this.bodyGraphic.closePath();
    this.bodyGraphic.endFill();

    // Vareta central e envergação (cruzeta)
    this.bodyGraphic.lineStyle(1.5, 0x3d2817, 0.9);
    this.bodyGraphic.moveTo(0, -28);
    this.bodyGraphic.lineTo(0, 32);

    this.bodyGraphic.moveTo(-24, 0);
    this.bodyGraphic.lineTo(24, 0);
  }

  loadAvatar() {
    const token=++this.avatarLoadToken;
    const url=String(this.profilePictureUrl||'');
    if (!isSafeAvatarUrl(url)) return;
    const image=new Image();
    image.crossOrigin='anonymous';
    image.referrerPolicy='no-referrer';
    image.onload=()=>{
      if (this.destroyed || token!==this.avatarLoadToken) return;
      try {
        const texture=PIXI.Texture.from(image);
        const sprite=new PIXI.Sprite(texture);
        sprite.width=24;sprite.height=24;sprite.anchor.set(0.5);
        const mask=new PIXI.Graphics();
        mask.beginFill(0xffffff);mask.drawCircle(0,0,12);mask.endFill();
        sprite.mask=mask;
        const border=new PIXI.Graphics();
        border.lineStyle(2,0x00f0ff,1);border.drawCircle(0,0,12);
        this.avatarContainer.addChild(sprite,mask,border);
        this.avatarSprite=sprite;
      } catch (_) { /* corpo da pipa continua visível sem avatar */ }
    };
    image.onerror=()=>{};
    image.src=url;
  }

  setProfile(nickname, profilePictureUrl) {
    if (nickname) {
      this.nickname=String(nickname).slice(0,60);
      const displayName = this.nickname.length > 11 ? this.nickname.slice(0, 10) + '…' : this.nickname;
      if (this.nickText) this.nickText.text=displayName;
      this.renderTag();
    }
    const next=String(profilePictureUrl||'');
    if (!isSafeAvatarUrl(next) || next===this.profilePictureUrl) return;
    this.profilePictureUrl=next;
    this.avatarLoadToken++;
    if (this.avatarSprite) {
      if (this.avatarSprite.texture) {
        try {
          if (PIXI.Texture.removeFromCache) PIXI.Texture.removeFromCache(this.avatarSprite.texture);
          if (this.avatarSprite.texture.baseTexture && PIXI.BaseTexture.removeFromCache) {
            PIXI.BaseTexture.removeFromCache(this.avatarSprite.texture.baseTexture);
          }
          this.avatarSprite.texture.destroy(true);
        } catch (_) {}
      }
      this.avatarSprite = null;
    }
    for(const child of this.avatarContainer.removeChildren()) {
      if (child.destroy) child.destroy({ children: true, texture: true, baseTexture: true });
    }
    this.loadAvatar();
  }

  destroy(options) {
    if (this.avatarSprite) {
      if (this.avatarSprite.texture) {
        try {
          if (PIXI.Texture.removeFromCache) PIXI.Texture.removeFromCache(this.avatarSprite.texture);
          if (this.avatarSprite.texture.baseTexture && PIXI.BaseTexture.removeFromCache) {
            PIXI.BaseTexture.removeFromCache(this.avatarSprite.texture.baseTexture);
          }
          this.avatarSprite.texture.destroy(true);
        } catch (_) {}
      }
      this.avatarSprite = null;
    }
    super.destroy(options);
  }

  setBuff(lineType, powerMultiplier, color, lineWidth, shieldCount, expiresAt = null) {
    this.buffExpiresAt = lineType==='algodao' ? 0 : benefitExpiry(expiresAt,0);
    this.lastBenefitSecond = -1;
    this.lineType = lineType;
    this.powerMultiplier = powerMultiplier;
    this.shieldCount = shieldCount || 0;
    this.line.setAppearance(color, lineWidth);
    if (this.rope) this.rope.setMaterial(lineType);

    // Buff modifica a resistência da linha sem apagar desgaste já sofrido.
    // Ao perder a melhoria, o dano acumulado permanece, limitado à nova capacidade.
    const missingHP = Math.max(0, this.maxLineHP - this.lineHP);
    this.maxLineHP = this.getMaxHPForLine(lineType);
    this.lineHP = Math.max(1, this.maxLineHP - missingHP);
    this.updateHPBar();

    this.tail.setBoost(lineType === 'chile' || lineType === 'cerol' || this.likeBoostRemaining > 0);
  }

  triggerShieldAbsorb() {
    // Efeito de pulso dourado
    this.shieldPulse = 0.2;
    // Restaura a integridade mecânica de todos os segmentos da corda física
    if (this.rope && this.rope.segmentWear) {
      this.rope.segmentWear.fill(0);
      if (Array.isArray(this.rope.nodes)) {
        for (let i = 0; i < this.rope.nodes.length; i++) {
          this.rope.nodes[i].wear = 0;
        }
      }
    }
  }

  resize(width, height) {
    const oldScale = this.physicsScale || physicsWorldScale(this.screenWidth, this.screenHeight);
    const nextScale = physicsWorldScale(width, height);
    const sx = width / this.screenWidth, sy = height / this.screenHeight;
    const sz = nextScale / Math.max(.001, oldScale);
    this.x *= sx; this.y *= sy; this.z *= sz; this.targetX *= sx; this.targetY *= sy;
    this.vx *= sx; this.vy *= sy; this.vz *= sz;
    this.baseX *= sx; this.baseY = rooftopAnchorY(width, height); this.baseZ *= sz;
    this.line.baseX = this.baseX; this.line.baseY = this.baseY;
    if (this.rope) {
      const releasedRatio = this.rope.totalLineLength > 0 ? this.rope.spoolLength / this.rope.totalLineLength : 1;
      this.rope.totalLineLength = 1800 * nextScale; this.rope.spoolCapacity = this.rope.totalLineLength;
      this.rope.minSpoolLength = 80 * nextScale; this.rope.worldScale = nextScale;
      this.rope.spoolLength = Math.max(this.rope.minSpoolLength, Math.min(this.rope.totalLineLength, releasedRatio * this.rope.totalLineLength));
      if (this.rope.isInitialized && Array.isArray(this.rope.nodes)) {
        for (const n of this.rope.nodes) { n.x *= sx; n.prevX *= sx; n.y *= sy; n.prevY *= sy; n.z *= sz; n.prevZ *= sz; }
        this.rope.updateAABB();
      } else this.rope.resetPositions({ x:this.baseX,y:this.baseY,z:this.baseZ },{ x:this.x,y:this.y,z:this.z });
    }
    this.screenWidth = width; this.screenHeight = height; this.physicsScale = nextScale;
    this.visualScale = liveVisualScale(width, height);
  }

  setManeuver(stats) {
    if (!stats) return;
    if (this.maneuverQueue) {
      this.maneuverQueue.enqueue(stats, this.intentController);
    }
    const now = Date.now();
    const limit = Math.max(0, Number(stats.maxDuration) || Number(stats.duration) || 0);
    const previous = this.maneuver?.name === stats.name
      ? Math.max(0, (Number(this.maneuver.expiresAt) || now) - now) / 1000 : 0;
    const duration = Math.min(limit, previous + Math.max(0, Number(stats.duration) || 0));
    this.maneuver = duration > 0 ? { ...stats, duration, remaining: duration,
      expiresAt: now + duration * 1000 } : null;
    // Curtidas durante o mesmo despique alimentam a manobra sem reiniciar a fase visual.
    if (!(previous > 0 && stats.name === 'despicar')) this.maneuverVisualTime = 0;
    this.lastBenefitSecond = -1;
  }

  updateManeuverVisual(delta = 1) {
    if (!this.visible) return;
    // Sem manobra nem resíduo visual: não redesenhar Graphics de 40 pipas a cada frame.
    if (!this.maneuver && !this.maneuverLabel.visible) return;
    this.maneuverVisualTime = (this.maneuverVisualTime || 0) + delta / 60;
    const pose = maneuverPose(this.maneuver,this.maneuverVisualTime);
    this.bodyGraphic.rotation = pose.angle;
    this.avatarContainer.rotation = pose.angle;
    this.bodyGraphic.scale.set(pose.scale);
    this.avatarContainer.scale.set(pose.scale);
    this.maneuverGlow.clear();
    this.maneuverTrail.clear();
    this.maneuverLabel.visible = Boolean(pose.label);
    const labels = {
      retao: '⚡ RETÃO',
      despicar: '↘ DESPICADA',
      perseguir: '◎ PERSEGUINDO',
      aparar_retao: '◆ APARADA',
      aparar_despicada: '◇ CONTRA-APARADA',
      mergulho: '⬇️ MERGULHO',
      relo_lateral: '↔️ RELO LATERAL',
      mestre_do_ceu: '🦁 MESTRE DO CÉU'
    };
    const targetLabel = labels[pose.label] || labels[this.maneuver?.name] || '⚡ MANOBRA';
    if (this.maneuverLabel.text !== targetLabel) this.maneuverLabel.text = targetLabel;
    if (this.maneuverLabel.style.fill !== pose.color) this.maneuverLabel.style.fill = pose.color;
    this.maneuverGlow.lineStyle(3,pose.color,pose.glow);
    this.maneuverGlow.drawCircle(0,0,36+3*Math.sin(this.maneuverVisualTime*14));
    if (pose.trail > 0) {
      this.maneuverTrail.lineStyle(4,pose.color,pose.trail*0.7);
      this.maneuverTrail.moveTo(-12,16);this.maneuverTrail.lineTo(-26-pose.tail*23,45+pose.tail*20);
      this.maneuverTrail.moveTo(12,16);this.maneuverTrail.lineTo(26+pose.tail*23,45+pose.tail*20);
    }
  }

  setSpecial(ability, seconds, expiresAt = null) {
    if (!['tornado', 'invulnerable'].includes(ability)) return;
    const end=benefitExpiry(expiresAt,seconds);
    this.specialExpiresAt[ability]=seconds>0?end:0;
    this.specials[ability]=Math.max(0,Number(seconds)||0);
    this.lastBenefitSecond=-1;
  }

  updateBenefitCountdown(now = Date.now()) {
    const second=Math.floor(now/1000);
    if (second===this.lastBenefitSecond) return;
    this.lastBenefitSecond=second;
    const lines=benefitLabels(this.lineType,this.buffExpiresAt,this.specialExpiresAt,now)
      .map(effect=>`${effect.name} ${formatBenefitTime(effect.seconds)}`);
    if(this.maneuver?.remaining>0){
      const names={retao:'RETÃO',despicar:'DESPICADA',perseguir:'PERSEGUIR',
        aparar_retao:'APARAR',aparar_despicada:'CONTRA-APARAR'};
      lines.push('⚡ '+(names[this.maneuver.name]||'MANOBRA')+' '+formatBenefitTime(Math.ceil(this.maneuver.remaining)));
    }
    const next=lines.join('\n');
    if(next!==this.lastBenefitText){this.benefitText.text=next;this.lastBenefitText=next;}
    this.benefitText.visible=Boolean(next);
  }

  get isInvulnerable() { return this.specials.invulnerable > 0; }

  calculateCombatPower() {
    const base=this.isInvulnerable ? Math.max(6,this.powerMultiplier)
      : this.specials.tornado > 0 ? Math.max(4,this.powerMultiplier) : this.powerMultiplier;
    const tension=.82+Math.max(.12,Math.min(1,this.lineTension??.58))*.34;
    const combo=Math.max(1,this.chatCombo?.attack||1);
    return base*tension*combo;
  }

  update(delta, windTime = 0, population = 2, physicsKites = null) {
    if (!Number.isFinite(this.x)) this.x = Number.isFinite(this.targetX) ? this.targetX : (this.screenWidth * 0.5);
    if (!Number.isFinite(this.y)) this.y = Number.isFinite(this.targetY) ? this.targetY : (this.screenHeight * 0.35);
    const windX = (typeof windTime === 'object' && windTime !== null && 'x' in windTime) ? (Number.isFinite(windTime.x) ? windTime.x : 0) : (Wind.sample(windTime).x || 0);

    const now=Date.now();
    if (this.buffExpiresAt > 0 && now >= this.buffExpiresAt)
      this.setBuff('algodao',1.0,'#ffffff',1.2,0);
    for (const ability of Object.keys(this.specials)) {
      const expiresAt=this.specialExpiresAt[ability];
      this.specials[ability] = expiresAt ? Math.max(0,Math.min((expiresAt-now)/1000,
        this.specials[ability]-delta/60)) : Math.max(0,this.specials[ability]-delta/60);
    }
    this.spawnProtection = Math.max(0, this.spawnProtection - delta / 60);
    this.likeBoostRemaining = Math.max(0, this.likeBoostRemaining - delta / 60);
    this.shieldPulse = Math.max(0, this.shieldPulse - delta / 60);
    if (this.maneuver) {
      if (!Number.isFinite(this.maneuver.expiresAt))
        this.maneuver.expiresAt=now+Math.max(0,this.maneuver.remaining)*1000;
      this.maneuver.remaining=Math.max(0,Math.min(this.maneuver.remaining-delta/60,
        (this.maneuver.expiresAt-now)/1000));
      if (this.maneuver.remaining <= 0) this.maneuver = null;
    }
    this.criticalLine = this.lineHP > 0 && this.lineHP / this.maxLineHP <= 0.2;
    this.scale.set(this.visualScale * (this.isInvulnerable ? 1.4 : this.shieldPulse > 0 ? 1.2 : 1));
    this.bodyGraphic.tint = this.isInvulnerable ? 0xffe07a : this.criticalLine ? 0xff7799 : this.specials.tornado > 0 ? 0xdbadff : 0xffffff;
    this.tail.setBoost(this.likeBoostRemaining > 0 || ['chile', 'cerol'].includes(this.lineType));
    this.oscillationTimer += 0.03 * delta;
    this.updateBenefitCountdown();
    updateLineControl(this,delta);
    this.contactSpeed=Math.max(0,(this.contactSpeed||0)-delta*.18);
    this.lineSlack=Math.max(0,(this.lineSlack||0)-delta/28);
    this.updateManeuverVisual(delta);

    // Física autoritativa desde o primeiro frame; proteção de spawn bloqueia combate, não movimento.
    const safeDt = Math.max(0.2, Number.isFinite(delta) ? delta : 1);
    const safeDtSec = Math.max(0.002, safeDt / 60);
    const curWind = (typeof windTime === 'object' && windTime !== null) ? windTime : { x: windX, y: 0 };
    KiteDynamics.step(this, safeDtSec, curWind, population, physicsKites);
    this.contactSpeed = Math.hypot(this.vx, this.vy, this.vz || 0);
    if (this.isAscending && this.spawnProtection <= 0) this.isAscending = false;

    if (!Number.isFinite(this.x)) this.x = Number.isFinite(this.targetX) ? this.targetX : (this.screenWidth * 0.5);
    if (!Number.isFinite(this.y)) this.y = Number.isFinite(this.targetY) ? this.targetY : (this.screenHeight * 0.35);

    this.speed = Math.hypot(this.vx, this.vy);

    // Mantém todas as tags e textos 100% horizontais e alinhados (nada segue o ângulo da linha)
    if (this.tagContainer) {
      this.tagContainer.rotation = -this.rotation;
      this.tagContainer.visible = !this.isAscending && (this.y < this.baseY - 70);
    }
    if (this.maneuverLabel) this.maneuverLabel.rotation = -this.rotation;
    if (this.benefitText) this.benefitText.rotation = -this.rotation;
    if (this.hpBarContainer) this.hpBarContainer.rotation = -this.rotation;

    const windObj = (typeof windTime === 'object' && windTime !== null && 'x' in windTime)
      ? windTime
      : { x: windX, y: 0 };

    if (this.rope) {
      const startX = Number.isFinite(this.line?.visualBaseX) ? this.line.visualBaseX : this.baseX;
      const startY = Number.isFinite(this.line?.visualBaseY) ? this.line.visualBaseY : this.baseY;
      const startZ = Number.isFinite(this.baseZ) ? this.baseZ : 0;
      const kiteZ = Number.isFinite(this.z) ? this.z : 0;
      const handPos = { x: startX, y: startY, z: startZ };
      const kitePos = { x: this.x, y: this.y, z: kiteZ };
      this.rope.step(safeDt / 60, handPos, kitePos, this._localPhysicsWind || windObj, {
        lineSlack: this.lineSlack,
        lineTension: this.lineTension
      });
    }

    // Render de linha/rabiola é executado uma única vez por frame em App.gameLoop.
    // O fixed step deve permanecer estritamente físico para não entrar em death spiral
    // quando vários relinhos exigirem 2 substeps no mesmo frame.

    // Atualiza estado visual do Rei da Laje
    this.crownText.visible = this.isKing || this.isLeader;
    this.crownText.y = -48 + (this.crownText.visible ? 2.5*Math.sin(this.oscillationTimer * 1.9) : 0);
    this.crownText.scale.set(this.crownText.visible ? 1+0.07*Math.sin(this.oscillationTimer * 2) : 1);
    this.leaderGlow.visible = this.isLeader || this.streak >= 3;
    if (this.leaderGlow.visible) {
      this.leaderGlow.tint = this.isLeader ? 0xffd56a : 0xff7755;
      this.leaderGlow.alpha = (this.isLeader ? 0.58 : 0.3) + 0.3 * (1 + Math.sin(this.oscillationTimer * 2)) / 2;
      this.leaderGlow.scale.set(1+0.045*Math.sin(this.oscillationTimer * 2));
    }

    // Regeneração de HP fora de combate
    this.combatCooldown += 0.016 * delta;
    if (this.combatCooldown > 2.0) { // 2s sem levar dano = sai do combate
      this.isInCombat = false;
      this.regenHP(delta);
    }

  }

  /**
   * Sincroniza o render visual da linha 2D (PixiJS) com os nós da corda física XPBD
   * e aplica destaques de combate/manobra de forma consistente sem flicker/tremor.
   */
  syncLineVisual() {
    const isManeuver = Boolean(this.maneuver && this.maneuver.remaining > 0);
    const isHighlighted = isManeuver || this.isInCombat || this.isInvulnerable || this.criticalLine;
    let highlightColor = null;
    if (this.criticalLine) highlightColor = 0xff3b5c;
    else if (this.isInvulnerable) highlightColor = 0xffe07a;
    else if (isManeuver) {
      const mName = String(this.maneuver?.name || '').toLowerCase();
      if (mName === 'retao') highlightColor = 0xf43f5e;
      else if (mName === 'despicar') highlightColor = 0xf59e0b;
      else if (mName.startsWith('aparar')) highlightColor = 0x34d399;
      else if (mName === 'mergulho') highlightColor = 0x00f0ff;
      else if (mName === 'relo_lateral') highlightColor = 0xffcc00;
      else if (mName === 'mestre_do_ceu') highlightColor = 0xffffff;
      else if (mName === 'perseguir') highlightColor = 0xa855f7;
    } else if (this.isInCombat) highlightColor = 0xffffff;

    let targetAlpha = 0.28;
    if (this.criticalLine) {
      targetAlpha = 0.56 + 0.42 * Math.abs(Math.sin(this.oscillationTimer * 2));
    } else if (typeof this.maneuver?.name === 'string' && this.maneuver.name.startsWith('aparar')) {
      targetAlpha = 0.75 + 0.25 * Math.abs(Math.sin(this.maneuverVisualTime * 24));
    } else if (isManeuver || this.isInCombat) {
      targetAlpha = 0.92;
    } else {
      targetAlpha = 0.28;
    }

    const effectiveNodes = (this.rope?.isBroken && this.rope.handNodes)
      ? this.rope.handNodes
      : this.rope?.getNodes();

    this.line.update(
      this.x,
      this.y,
      this.visualScale,
      isHighlighted,
      highlightColor,
      targetAlpha,
      effectiveNodes
    );
  }
}

