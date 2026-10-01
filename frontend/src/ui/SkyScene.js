import * as PIXI from 'pixi.js';
import { rooftopHeight } from './RooftopLayout.js';
import { backdropLayout, backdropHousePalette } from './BackdropLayout.js';
import { brazilTheme, nextBrazilTheme, rotationThemeCode, STATE_ROTATION_MS } from './BrazilThemes.js';

export class SkyScene extends PIXI.Container {
  constructor(width,height){
    super();
    this.screenWidth=width; this.screenHeight=height; this.isTransparent=false;
    this.themeCode=String(localStorage.getItem('rei-da-laje-state')||'RJ').toUpperCase();
    this.theme=brazilTheme(this.themeCode);
    this.rotationStartCode=this.themeCode; this.rotationStartedAt=Date.now(); this.nextRotationAt=this.rotationStartedAt+STATE_ROTATION_MS;
    this.backgroundGraphic=new PIXI.Graphics();
    this.cityGraphic=new PIXI.Graphics();
    this.hillsGraphic=new PIXI.Graphics();
    this.cloudsContainer=new PIXI.Container();
    this.detailsGraphic=new PIXI.Graphics();
    this.rooftopGraphic=new PIXI.Graphics();
    this.ambientKites=new PIXI.Container();
    this.mode3D=false;
    this.addChild(this.backgroundGraphic,this.cityGraphic,this.hillsGraphic,
      this.cloudsContainer,this.ambientKites,this.detailsGraphic,this.rooftopGraphic);
    this.clouds=[]; this.createClouds(); this.createAmbientKites(); this.renderScene();
  }

  setMode3D(enabled){
    this.mode3D=Boolean(enabled);
    this.renderScene();
  }

  hash(n){ const x=Math.sin(n*12.9898)*43758.5453; return x-Math.floor(x); }

  createClouds(){
    for(let i=0;i<7;i++){
      const c=new PIXI.Graphics(); c.beginFill(0xffffff,0.52);
      c.drawEllipse(0,0,48+i*4,18+i*1.4); c.drawEllipse(-24,-7,30,17);
      c.drawEllipse(22,-9,34,19); c.endFill(); c.speed=0.08+i*0.025;
      this.clouds.push(c); this.cloudsContainer.addChild(c);
    }
  }  createAmbientKites(){
    const spots=[[.18,.22,.55],[.30,.36,.32],[.62,.28,.42],[.77,.39,.34],[.86,.18,.45]];
    spots.forEach(([x,y,s],i)=>{
      const g=new PIXI.Graphics(), colors=[0xff5a4f,0xffcf3e,0x4b79d8,0x7d4bd8];
      g.beginFill(colors[i%colors.length],.9);
      g.drawPolygon([0,-18*s,14*s,0,0,18*s,-14*s,0]); g.endFill();
      g.lineStyle(Math.max(1,s*2),0xffffff,.75); g.moveTo(0,18*s); g.lineTo(0,35*s);
      g.x=x*this.screenWidth; g.y=y*this.screenHeight; g._nx=x; g._ny=y; g._s=s;
      this.ambientKites.addChild(g);
    });
  }

  toggleMode(){ this.isTransparent=!this.isTransparent; this.renderScene();
    return this.isTransparent?'Transparente':this.theme.name; }

  setTransparent(transparent) {
    this.isTransparent = Boolean(transparent);
    this.renderScene();
    return this.isTransparent ? 'Transparente' : this.theme.name;
  }

  setTheme(code){ this.themeCode=String(code||'RJ').toUpperCase();this.theme=brazilTheme(this.themeCode);
    localStorage.setItem('rei-da-laje-state',this.themeCode);this.renderScene();return this.theme; }
  cycleTheme(){return this.setTheme(nextBrazilTheme(this.themeCode));}
  rotateByClock(now=Date.now()){
    if(now<this.nextRotationAt)return null;
    const code=rotationThemeCode(this.rotationStartCode,now-this.rotationStartedAt);
    this.nextRotationAt=this.rotationStartedAt+(Math.floor((now-this.rotationStartedAt)/STATE_ROTATION_MS)+1)*STATE_ROTATION_MS;
    if(code===this.themeCode)return null; return this.setTheme(code);
  }
  rotationRemaining(now=Date.now()){return Math.max(0,this.nextRotationAt-now);}

  drawHouse(g,x,y,w,h,color,seed){
    g.beginFill(color); g.drawRect(x,y,w,h); g.endFill();
    g.beginFill(0x17384a,.18); g.drawRect(x,y,w,Math.max(3,h*.06)); g.endFill();
    const cols=Math.max(1,Math.floor(w/20)), rows=Math.max(1,Math.floor(h/25));
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      if(this.hash(seed+r*17+c*29)<.18) continue;
      const ww=Math.max(4,w*.12), wh=Math.max(5,h*.11);
      g.beginFill(this.hash(seed+c*7+r*13)>.48?0xffdf8c:0x20485b,.72);
      g.drawRect(x+7+c*(w-14)/cols,y+10+r*(h-16)/rows,ww,wh); g.endFill();
    }
    if(this.hash(seed+91)>.62){
      g.beginFill(0x135f83); g.drawRoundedRect(x+w*.2,y-7,w*.32,9,3); g.endFill();
    }
  }

  hillRidgeY(side,L,t){
    const left=side==='left';
    const start=left?L.leftTopY:L.rightTopY, end=left?L.leftFootY:L.rightFootY;
    const curve=Math.pow(Math.max(0,Math.min(1,t)),left?0.72:0.88);
    const wobble=Math.sin(t*8.2+(left?0.4:1.8))*L.height*.012
      +Math.sin(t*19.7+(left?1.1:2.7))*L.height*.005;
    return start+(end-start)*curve+wobble;
  }

  drawHill(side,L){
    const g=this.hillsGraphic,palette=backdropHousePalette(),left=side==='left';
    const hillW=left?L.leftHillWidth:L.rightHillWidth;
    const points=[],segments=16;
    for(let i=0;i<=segments;i++){
      const t=i/segments,x=left?t*hillW:L.width-t*hillW;
      points.push(x,this.hillRidgeY(side,L,t)+L.height*.018);
    }
    points.push(left?hillW: L.width-hillW,L.height,left?0:L.width,L.height);
    g.beginFill(this.theme.terrain,.54);g.drawPolygon(points);g.endFill();

    const houseW=Math.max(22,L.width*(L.portrait?.032:.027));
    const houseH=Math.max(26,L.height*(L.portrait?.028:.036));
    const cols=Math.ceil(hillW/(houseW*.76))+2;
    for(let c=0;c<cols;c++){
      const t=Math.min(1,c/Math.max(1,cols-1));
      const baseX=left?c*houseW*.76-10:L.width-c*houseW*.76-houseW+10;
      const ridge=this.hillRidgeY(side,L,t);
      const depth=4+Math.floor(this.hash(c+(left?31:97))*3);
      for(let row=0;row<depth;row++){
        const seed=(left?70:470)+c*29+row*53;
        const scale=.72+this.hash(seed)*.38;
        const w=houseW*scale,h=houseH*(.72+this.hash(seed+2)*.72);
        const jitter=(this.hash(seed+5)-.5)*houseW*.38;
        const x=baseX+jitter+(row%2?houseW*.22:0);
        const y=ridge+row*houseH*.54-h;
        this.drawHouse(g,x,y,w,h,palette[(c+row*2+(left?0:3))%palette.length],seed);
        if(this.hash(seed+9)>.78){
          g.lineStyle(Math.max(1,L.width*.0008),0x293e42,.65);
          const ax=x+w*.72;g.moveTo(ax,y);g.lineTo(ax,y-h*.42);
          g.lineStyle(0);
        }
      }
    }
  }

  drawNeighborhoodDepth(L){
    const g=this.cityGraphic,w=L.width,h=L.height;
    const layers=[
      {base:L.skylineBase,color:0x397c8c,alpha:.18,min:.025,max:.09},
      {base:L.skylineBase+h*.035,color:0x2d7180,alpha:.18,min:.035,max:.12},
      {base:L.skylineBase+h*.075,color:0x245f70,alpha:.16,min:.045,max:.14}
    ];
    layers.forEach((layer,li)=>{
      const bw=Math.max(9,w*(.014+li*.004));
      for(let x=-bw;x<w+bw;x+=bw*.9){
        const n=this.hash(x*.13+li*131),bh=h*(layer.min+n*(layer.max-layer.min));
        g.beginFill(layer.color,layer.alpha);g.drawRect(x,layer.base-bh,bw,bh);g.endFill();
      }
    });
  }
  renderScene(){
    for(const g of [this.backgroundGraphic,this.cityGraphic,this.hillsGraphic,this.detailsGraphic,this.rooftopGraphic]) g.clear();
    if(this.isTransparent || this.mode3D){
      this.cloudsContainer.visible=false; this.ambientKites.visible=false; return;
    }
    this.cloudsContainer.visible=true; this.ambientKites.visible=true;
    const L=backdropLayout(this.screenWidth,this.screenHeight), w=L.width,h=L.height;

    const top=this.theme.sky[0],bottom=this.theme.sky[1];
    for(let i=0;i<48;i++){
      const t=i/47, mix=(a,b)=>Math.round(a+(b-a)*t);
      const r=mix((top>>16)&255,(bottom>>16)&255),gr=mix((top>>8)&255,(bottom>>8)&255),b=mix(top&255,bottom&255);
      this.backgroundGraphic.beginFill((r<<16)|(gr<<8)|b);
      this.backgroundGraphic.drawRect(0,Math.floor(h*i/48),w,Math.ceil(h/48)+1);this.backgroundGraphic.endFill();
    }
    this.backgroundGraphic.beginFill(0xfff0b0,.86);
    this.backgroundGraphic.drawCircle(w*.82,h*.16,Math.min(w,h)*.065); this.backgroundGraphic.endFill();

    this.clouds.forEach((c,i)=>{ c.x=((.08+i*.16)%1)*w; c.y=(.10+(i%4)*.105)*h; c.scale.set(Math.max(.65,w/1400)); });
    this.ambientKites.children.forEach(k=>{ k.x=k._nx*w; k.y=k._ny*h; k.scale.set(Math.max(.75,Math.min(1.35,w/1200))); });

    this.drawNeighborhoodDepth(L);
    this.drawHill('left',L); this.drawHill('right',L);

    const d=this.detailsGraphic, roof=rooftopHeight(w,h), poleY=h-roof-24;
    d.beginFill(this.theme.accent,.34);
    const f=this.theme.feature;
    if(['floresta','amazonia','mangue'].includes(f)) for(let x=0;x<w;x+=w*.09){d.drawCircle(x,poleY-h*.035,18);d.drawRect(x-3,poleY-h*.035,6,h*.035);}
    if(['dunas','lencois','jalapao','sertao'].includes(f)){d.moveTo(0,poleY);d.bezierCurveTo(w*.22,poleY-h*.06,w*.35,poleY+h*.01,w*.55,poleY-h*.035);d.bezierCurveTo(w*.72,poleY-h*.08,w*.9,poleY,w,poleY-h*.025);d.lineTo(w,poleY);d.closePath();}
    if(['serras','serra','montanha'].includes(f)) d.drawPolygon([0,poleY,w*.15,poleY-h*.08,w*.28,poleY-h*.025,w*.43,poleY-h*.11,w*.62,poleY-h*.03,w*.8,poleY-h*.09,w,poleY,0,poleY]);
    if(f==='pampa') d.drawRect(0,poleY-h*.018,w,h*.018);
    if(f==='rio'||f==='pantanal'||f==='litoral'||f==='recife'){d.beginFill(0x3a9fc4,.28);d.drawEllipse(w*.5,poleY+h*.025,w*.58,h*.035);d.endFill();d.beginFill(this.theme.accent,.34);}
    if(f==='araucarias')for(let x=w*.05;x<w;x+=w*.11){d.drawRect(x-2,poleY-h*.055,4,h*.055);d.drawPolygon([x-18,poleY-h*.045,x,poleY-h*.09,x+18,poleY-h*.045]);}
    // Metrópole já aparece nas camadas distantes; sem torres no primeiro plano da laje.
    if(f==='casario')for(let x=w*.08;x<w*.92;x+=w*.1){d.drawRect(x,poleY-h*.045,w*.07,h*.045);d.drawPolygon([x,poleY-h*.045,x+w*.035,poleY-h*.07,x+w*.07,poleY-h*.045]);}
    if(f==='cerrado'||f==='lavrado')for(let x=w*.08;x<w;x+=w*.16){d.drawRect(x-2,poleY-h*.035,4,h*.035);d.drawEllipse(x,poleY-h*.04,w*.035,h*.012);}
    if(f==='morro')d.drawPolygon([0,poleY,w*.12,poleY-h*.09,w*.24,poleY-h*.025,w*.38,poleY-h*.12,w*.52,poleY-h*.03,w*.68,poleY-h*.1,w*.84,poleY-h*.02,w,poleY,0,poleY]);
    d.endFill();
    d.lineStyle(Math.max(2,w*.0018),0x1d2933,.72);
    const poles=[w*.08,w*.22,w*.76,w*.91];
    poles.forEach((px,i)=>{ d.moveTo(px,poleY); d.lineTo(px,poleY-h*(.08+(i%2)*.025)); });
    d.lineStyle(Math.max(1.5,w*.0012),0x1b252c,.62);
    for(let j=0;j<3;j++){
      const y=poleY-h*(.068+j*.014);
      d.moveTo(-20,y); d.bezierCurveTo(w*.28,y+h*.028,w*.62,y-h*.018,w+20,y+h*.018);
    }

    // Base da laje enriquecida com textura, mureta e caixas d'água robustas
    const slabY = h - roof;
    const slabH = Math.max(12, roof * 0.16);

    // Corpo da parede / fachada da laje (tijolo e concreto)
    this.rooftopGraphic.beginFill(0x42352d);
    this.rooftopGraphic.drawRect(0, slabY, w, roof);
    this.rooftopGraphic.endFill();

    // Faixas de tijolos aparentes na fachada da laje
    const brickRowH = Math.max(14, roof * 0.12);
    const brickRows = Math.floor((roof - slabH) / brickRowH);
    for (let r = 0; r < brickRows; r++) {
      const by = slabY + slabH + r * brickRowH;
      const brickW = Math.max(38, w * 0.045);
      const offset = (r % 2) * (brickW * 0.5);
      for (let bx = -brickW; bx < w + brickW; bx += brickW) {
        const seed = (r * 19 + Math.floor(bx * 0.1)) % 5;
        const brickColor = [0x8c4632, 0x9e523b, 0x7a3a29, 0xa85b42, 0x6e3324][seed];
        this.rooftopGraphic.beginFill(brickColor, 0.85);
        this.rooftopGraphic.drawRect(bx + offset + 1, by + 1, brickW - 2, brickRowH - 2);
        this.rooftopGraphic.endFill();
      }
    }

    // Beiral de concreto (piso superior da laje) com acabamento cerâmico
    this.rooftopGraphic.beginFill(0xd98c68);
    this.rooftopGraphic.drawRect(0, slabY, w, slabH);
    this.rooftopGraphic.endFill();

    // Brilho do sol na borda superior do beiral
    this.rooftopGraphic.lineStyle(2.5, 0xffe2b8, 0.7);
    this.rooftopGraphic.moveTo(0, slabY);
    this.rooftopGraphic.lineTo(w, slabY);

    // Sombra suave sob o beiral
    this.rooftopGraphic.lineStyle(2, 0x221813, 0.45);
    this.rooftopGraphic.moveTo(0, slabY + slabH);
    this.rooftopGraphic.lineTo(w, slabY + slabH);

    // Divisões verticais dos ladrilhos do beiral
    this.rooftopGraphic.lineStyle(1.5, 0xb86c4a, 0.5);
    for (let x = 0; x < w; x += Math.max(32, w * 0.035)) {
      this.rooftopGraphic.moveTo(x, slabY);
      this.rooftopGraphic.lineTo(x, slabY + slabH);
    }
    this.rooftopGraphic.lineStyle(0);

    // Mureta protetora nos cantos da laje (parapet)
    const parapetW = Math.max(26, w * 0.05);
    const parapetH = Math.max(16, roof * 0.18);
    this.rooftopGraphic.beginFill(0x8c4632);
    this.rooftopGraphic.drawRect(0, slabY - parapetH, parapetW, parapetH);
    this.rooftopGraphic.drawRect(w - parapetW, slabY - parapetH, parapetW, parapetH);
    this.rooftopGraphic.endFill();
    this.rooftopGraphic.beginFill(0xd98c68);
    this.rooftopGraphic.drawRect(0, slabY - parapetH - 4, parapetW + 3, 5);
    this.rooftopGraphic.drawRect(w - parapetW - 3, slabY - parapetH - 4, parapetW + 3, 5);
    this.rooftopGraphic.endFill();

    // Caixas d'água azuis (estilo Fortlev brasileira, ampliadas e detalhadas)
    const drawWaterTank = (x, y, tankW, tankH) => {
      this.rooftopGraphic.beginFill(0x1a120e, 0.35);
      this.rooftopGraphic.drawEllipse(x + tankW * 0.5, y + tankH + 2, tankW * 0.55, 4);
      this.rooftopGraphic.endFill();
      this.rooftopGraphic.beginFill(0x0077b6);
      this.rooftopGraphic.drawRoundedRect(x, y, tankW, tankH, 4);
      this.rooftopGraphic.endFill();
      this.rooftopGraphic.lineStyle(1.5, 0x0096c7, 0.8);
      this.rooftopGraphic.moveTo(x + 2, y + tankH * 0.38);
      this.rooftopGraphic.lineTo(x + tankW - 2, y + tankH * 0.38);
      this.rooftopGraphic.moveTo(x + 2, y + tankH * 0.7);
      this.rooftopGraphic.lineTo(x + tankW - 2, y + tankH * 0.7);
      this.rooftopGraphic.lineStyle(0);
      this.rooftopGraphic.beginFill(0x023e8a);
      this.rooftopGraphic.drawRoundedRect(x - 2, y - 5, tankW + 4, 7, 3);
      this.rooftopGraphic.endFill();
      this.rooftopGraphic.beginFill(0x48cae4, 0.5);
      this.rooftopGraphic.drawRoundedRect(x + 3, y - 4, tankW * 0.4, 2.5, 1);
      this.rooftopGraphic.endFill();
    };

    const tank1W = Math.max(48, w * 0.065), tank1H = Math.max(28, roof * 0.22);
    drawWaterTank(w * 0.07, slabY - tank1H, tank1W, tank1H);

    const tank2W = Math.max(42, w * 0.055), tank2H = Math.max(24, roof * 0.19);
    drawWaterTank(w * 0.86, slabY - tank2H, tank2W, tank2H);

    // Carretilha de pipa no canto direito
    const spoolX = w * 0.94, spoolY = slabY - 8;
    this.rooftopGraphic.beginFill(0xd4a373);
    this.rooftopGraphic.drawCircle(spoolX, spoolY, 8);
    this.rooftopGraphic.endFill();
    this.rooftopGraphic.beginFill(0xff3b30);
    this.rooftopGraphic.drawCircle(spoolX, spoolY, 5);
    this.rooftopGraphic.endFill();
    this.rooftopGraphic.beginFill(0x4a3525);
    this.rooftopGraphic.drawCircle(spoolX, spoolY, 2);
    this.rooftopGraphic.endFill();
  }

  update(delta){
    const rotated = this.rotateByClock();
    if(this.isTransparent || this.mode3D) return rotated;
    this.clouds.forEach((c,i)=>{ c.x+=c.speed*delta; if(c.x>this.screenWidth+120)c.x=-120; });
    const t=performance.now()*.001;
    this.ambientKites.children.forEach((k,i)=>{ k.rotation=Math.sin(t*.55+i)*.035; });
    return rotated;
  }

  resize(w,h){
    this.screenWidth=w; this.screenHeight=h;
    this.renderScene();
  }
}
