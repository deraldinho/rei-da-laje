import * as PIXI from 'pixi.js';
import { rooftopPlayerLayout, rooftopHandAnchor } from './RooftopLayout.js';

const isSafeAvatarUrl = value => {
  const url=String(value||'').trim();
  return /^https:\/\/[^\s]+$/i.test(url)
    || /^\/player-assets\/avatars\/[a-f0-9]{64}\.(?:jpg|png|webp)$/i.test(url);
};

/** Boneco na laje, preso à âncora da linha da pipa. */
export class RooftopPlayer extends PIXI.Container {
  constructor(kite) {
    super();
    this.kite = kite;
    this.celebrationRemaining = 0;
    this.celebrationDuration = 0;
    this.layoutIndex = 0;
    this.layoutTotal = 1;
    const body = new PIXI.Graphics();
    body.beginFill(0x18100c, 0.4); body.drawEllipse(0, 4, 15, 4); body.endFill();
    body.lineStyle(4.5, 0x152c40, 1);
    body.moveTo(0, -34); body.lineTo(0, -11);
    body.moveTo(0, -27); body.lineTo(-14, -19);
    body.moveTo(0, -27); body.lineTo(13, -39); // mão direita alinhada com rooftopHandAnchor
    body.moveTo(0, -11); body.lineTo(-13, 4);
    body.moveTo(0, -11); body.lineTo(13, 4);
    body.beginFill(0xffd5a8); body.drawCircle(0, -49, 19.5); body.endFill();
    this.addChild(body);
    const initial = new PIXI.Text(kite.nickname.slice(0, 1).toUpperCase(), {
      fontFamily: 'Outfit, Arial, sans-serif', fontSize: 18, fontWeight: '900', fill: 0x152c40
    });
    initial.anchor.set(0.5); initial.y = -49;
    this.addChild(initial);
    this.initial = initial;
    const profileUrl=String(kite.profilePictureUrl||'');
    if (isSafeAvatarUrl(profileUrl)) {
      // A rede fica fora do loader Pixi: erro da CDN é apenas fallback, nunca rejeição no ticker.
      const image=new Image();
      image.crossOrigin='anonymous';
      image.referrerPolicy='no-referrer';
      image.onload=()=>{
        if (this.destroyed) return;
        try {
          const texture=PIXI.Texture.from(image);
          const face=new PIXI.Sprite(texture);
          face.width=38; face.height=38;
          face.anchor.set(0.5); face.y=-49;
          const mask=new PIXI.Graphics();
          mask.beginFill(0xffffff);mask.drawCircle(0,-49,18.5);mask.endFill();
          face.mask=mask;
          const border=new PIXI.Graphics();
          border.lineStyle(2.5,0xffe07a,1);border.drawCircle(0,-49,19.5);
          this.addChild(face,mask,border);
          initial.visible=false;
          this.profileFace=face;
        } catch (_) { initial.visible=true; }
      };
      image.onerror=()=>{ if (!this.destroyed) initial.visible=true; };
      image.src=profileUrl;
    }
    const nameBadge = new PIXI.Container();
    const nickname = new PIXI.Text(String(kite.nickname || 'Jogador').slice(0, 13), {
      fontFamily: 'Outfit, Arial, sans-serif',
      fontSize: 9.5,
      fontWeight: '800',
      fill: 0xffffff
    });
    nickname.anchor.set(0.5, 0.5);

    const padX = 7, padY = 2.5;
    const nw = Math.max(28, nickname.width + padX * 2);
    const nh = nickname.height + padY * 2;

    const nameBg = new PIXI.Graphics();
    nameBg.beginFill(0x061521, 0.85);
    nameBg.lineStyle(1.2, 0xffe07a, 0.65);
    nameBg.drawRoundedRect(-nw / 2, -nh / 2, nw, nh, 5);
    nameBg.endFill();

    nameBadge.addChild(nameBg, nickname);
    nameBadge.y = 12; // Posicionado na laje/base do boneco: nunca atravessado pela linha!
    this.addChild(nameBadge);
    this.nameBadge = nameBadge;
    this.nicknameText = nickname;
    this.updatePosition();
  }

  celebrate(theme) {
    const tierSeconds={common:0.8,uncommon:0.95,rare:1.1,epic:1.3,legendary:1.55};
    this.celebrationDuration=tierSeconds[theme?.tier]||0.9;
    this.celebrationRemaining=this.celebrationDuration;
  }

  update(delta=1) {
    this.celebrationRemaining=Math.max(0,this.celebrationRemaining-Math.max(0,delta)/60);
    this.updatePosition();
    if(this.celebrationRemaining<=0){this.rotation=0;return;}
    const progress=1-this.celebrationRemaining/this.celebrationDuration;
    const jump=Math.abs(Math.sin(progress*Math.PI*2.2))*(12+8*(1-progress));
    this.y-=jump*this.scale.y;
    this.rotation=Math.sin(progress*Math.PI*4)*0.08*(1-progress);
    this.scale.set(this.scale.x*(1+0.08*Math.sin(progress*Math.PI)));
  }

  setLayout(index,total) {
    this.layoutIndex=Math.max(0,Number(index)||0);
    this.layoutTotal=Math.max(1,Number(total)||1);
    this.updatePosition();
  }

  getLineAnchor() {
    return rooftopHandAnchor(this.x, this.y, this.scale.x, this.scale.y, this.rotation);
  }

  getPhysicalLineAnchor() {
    const slot=rooftopPlayerLayout(this.layoutIndex,this.layoutTotal,this.kite.screenWidth,this.kite.screenHeight);
    return rooftopHandAnchor(slot.x,slot.y,slot.scale,slot.scale,0);
  }

  updatePosition() {
    const slot=rooftopPlayerLayout(this.layoutIndex,this.layoutTotal,this.kite.screenWidth,this.kite.screenHeight);
    this.x=slot.x;this.y=slot.y;this.scale.set(slot.scale);
    if(this.nicknameText)this.nicknameText.visible=slot.showNickname;
    if(this.nameBadge)this.nameBadge.visible=slot.showNickname;
  }

  destroy(options) {
    if (this.profileFace) {
      if (this.profileFace.texture) {
        try {
          if (PIXI.Texture.removeFromCache) PIXI.Texture.removeFromCache(this.profileFace.texture);
          if (this.profileFace.texture.baseTexture && PIXI.BaseTexture.removeFromCache) {
            PIXI.BaseTexture.removeFromCache(this.profileFace.texture.baseTexture);
          }
          this.profileFace.texture.destroy(true);
        } catch (_) {}
      }
      this.profileFace = null;
    }
    super.destroy(options);
  }
}

