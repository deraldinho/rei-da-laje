import * as PIXI from 'pixi.js';
import { giftAnimation } from './GiftAnimations.js';

/** Efeitos visuais limitados a quatro presentes simultâneos, sem afetar a física. */
export class GiftShowcase extends PIXI.Container {
  constructor() { super(); this.effects=[]; this.maxEffects=4; }
  celebrate(gift,kites,width,height) {
    const theme=giftAnimation(gift);
    const kite=kites.get(theme.userId);
    const graphic=new PIXI.Graphics();
    const label=new PIXI.Text(theme.symbol+' '+theme.name.slice(0,26),{
      fontFamily:'Arial',fontSize:17*theme.size,fontWeight:'bold',fill:theme.color,
      stroke:0x102e43,strokeThickness:5,align:'center'});
    label.anchor.set(0.5,1);
    const effect={theme,userId:kite?.userId||null,x:kite?.x??width/2,y:kite?.y??height*0.4,
      elapsed:0,graphic,label,icon:null};
    this.addChild(graphic,label);
    if (theme.iconUrl && typeof Image!=='undefined') {
      const image=new Image();image.crossOrigin='anonymous';image.referrerPolicy='no-referrer';
      image.onload=()=>{
        if(!this.effects.includes(effect) || this.destroyed)return;
        try{
          const sprite=new PIXI.Sprite(PIXI.Texture.from(image));sprite.anchor.set(0.5);
          sprite.width=42*theme.size;sprite.height=42*theme.size;effect.icon=sprite;this.addChild(sprite);
        }catch(_){/* partículas continuam sem o ícone */}
      };
      image.onerror=()=>{};image.src=theme.iconUrl;
    }
    this.effects.push(effect);
    while(this.effects.length>this.maxEffects)this.removeEffect(this.effects[0]);
    return theme;
  }
  removeEffect(effect) {
    this.effects=this.effects.filter(e=>e!==effect);
    this.removeChild(effect.graphic,effect.label);
    if(effect.icon){
      this.removeChild(effect.icon);
      if (effect.icon.texture) {
        try {
          if (PIXI.Texture.removeFromCache) PIXI.Texture.removeFromCache(effect.icon.texture);
          if (effect.icon.texture.baseTexture && PIXI.BaseTexture.removeFromCache) {
            PIXI.BaseTexture.removeFromCache(effect.icon.texture.baseTexture);
          }
          effect.icon.texture.destroy(true);
        } catch (_) {}
      }
      effect.icon.destroy({ children: true, texture: true, baseTexture: true });
    }
    effect.graphic.destroy();effect.label.destroy();
  }
  update(delta,kites,width,height) {
    const dt=Math.min(0.05,Math.max(0,delta)/60);
    for(const e of [...this.effects]) {
      e.elapsed+=dt;
      if(e.elapsed>=e.theme.duration){this.removeEffect(e);continue;}
      const kite=e.userId?kites.get(e.userId):null;
      e.x+=((kite?.x??width/2)-e.x)*Math.min(1,dt*10);
      e.y+=((kite?.y??height*0.4)-e.y)*Math.min(1,dt*10);
      const t=e.theme,graphic=e.graphic,progress=e.elapsed/t.duration;
      const alpha=Math.max(0,Math.min(1,e.elapsed*5,(t.duration-e.elapsed)*2.2));
      graphic.clear();
      for(let i=0;i<t.particleCount;i++) {
        const phase=i*2.39996+(t.seed%360)*Math.PI/180;
        const angle=phase+(t.style==='spiral'||t.style==='cosmos'?e.elapsed*2.7:0);
        const dist=24+e.elapsed*(28+(i%5)*5)*t.size;
        let x=e.x+Math.cos(angle)*dist,y=e.y+Math.sin(angle)*dist;
        if(t.style==='petals'){x=e.x+Math.sin(angle)*dist*0.7;y=e.y-48+e.elapsed*(22+i%5*8);}
        if(t.style==='comets'||t.style==='ribbons')y+=Math.sin(e.elapsed*8+i)*12;
        const radius=(2.5+i%4)*t.size*(1-0.48*progress);
        graphic.beginFill(t.color,alpha*0.8);
        if(['petals','confetti'].includes(t.style))graphic.drawEllipse(x,y,radius*1.5,radius*0.65);
        else if(['crown','stars','cosmos'].includes(t.style)){
          for(let point=0;point<10;point++){
            const angle=point*Math.PI/5-Math.PI/2,ray=point%2===0?radius*1.5:radius*0.6;
            const px=x+Math.cos(angle)*ray,py=y+Math.sin(angle)*ray;
            if(point===0)graphic.moveTo(px,py);else graphic.lineTo(px,py);
          }
          graphic.closePath();
        }
        else graphic.drawCircle(x,y,radius);
        graphic.endFill();
      }
      graphic.lineStyle(2.5*t.size,t.color,alpha*0.85);
      if(t.style==='rings'||t.style==='orbits')graphic.drawCircle(e.x,e.y,(34+e.elapsed*22)*t.size);
      if(t.style==='shield')graphic.drawRoundedRect(e.x-38*t.size,e.y-44*t.size,76*t.size,82*t.size,18*t.size);
      if(t.style==='spiral'){
        graphic.moveTo(e.x,e.y);
        for(let i=1;i<=16;i++){const a=i*0.44+e.elapsed*5,r=i*3*t.size;
          graphic.lineTo(e.x+Math.cos(a)*r,e.y+Math.sin(a)*r);}
      }
      if(t.style==='crown'){
        graphic.moveTo(e.x-33,e.y-23);graphic.lineTo(e.x-27,e.y-52);
        graphic.lineTo(e.x-9,e.y-37);graphic.lineTo(e.x,e.y-62);
        graphic.lineTo(e.x+9,e.y-37);graphic.lineTo(e.x+27,e.y-52);
        graphic.lineTo(e.x+33,e.y-23);graphic.lineTo(e.x-33,e.y-23);
      }
      if(e.icon){
        e.icon.x=e.x;e.icon.y=e.y-8-Math.sin(e.elapsed*7)*7;
        e.icon.alpha=alpha;e.icon.rotation=Math.sin(e.elapsed*5)*0.12;
        const pulse=1+0.1*Math.sin(e.elapsed*9);
        e.icon.width=42*t.size*pulse;e.icon.height=42*t.size*pulse;
      }
      e.label.x=e.x;e.label.y=e.y-(57+Math.sin(e.elapsed*5)*5)*t.size;
      e.label.alpha=alpha;
    }
  }
}
