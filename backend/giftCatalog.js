const fs = require('node:fs');
const path = require('node:path');
const { GIFTS, getGiftUpgrade, getGiftUpgradeByValue } = require('./rules/giftConfig');
const FILE = path.join(__dirname,'data','observed-gifts.json');
const MAX_GIFTS = 600;
const cleanText = (value, max=90) => String(value ?? '').trim().slice(0,max);
const positive = (value,max=1000000) => Math.min(max,Math.max(0,Number(value)||0));

/** Catálogo observacional: TikTok pode mudar presentes por país, usuário e data. */
class GiftCatalog {
  constructor(file=FILE) {
    this.file=file;
    this.observed=new Map();
    this.dirty=false;
    this.saveTimer=null;
    try {
      const rows=JSON.parse(fs.readFileSync(file,'utf8'));
      if (Array.isArray(rows)) for (const row of rows.slice(0,MAX_GIFTS)) {
        const id=cleanText(row.id,36);
        if (id) this.observed.set(id,{id,name:cleanText(row.name),diamonds:positive(row.diamonds),
          count:positive(row.count,100000000),lastSeen:Number(row.lastSeen)||0,iconUrl:cleanText(row.iconUrl,500)});
      }
    } catch (error) { if (error.code!=='ENOENT') console.warn('[GiftCatalog] Catálogo anterior indisponível; preservado.'); }
  }
  observe(gift) {
    const id=cleanText(gift?.giftId || gift?.giftName,36);
    if (!id) return null;
    const previous=this.observed.get(id);
    const item={id,name:cleanText(gift.giftName)||previous?.name||'Presente TikTok',
      diamonds:positive(gift.diamondCount)||previous?.diamonds||0,
      count:(previous?.count||0)+positive(gift.repeatCount||1,1000),lastSeen:Date.now(),
      iconUrl:cleanText(gift.iconUrl,500)||previous?.iconUrl||''};
    if (!this.observed.has(id) && this.observed.size >= MAX_GIFTS) {
      const oldest=[...this.observed.values()].sort((a,b)=>a.lastSeen-b.lastSeen)[0];
      if(oldest)this.observed.delete(oldest.id);
    }
    this.observed.set(id,item);
    this.scheduleSave();
    return item;
  }
  scheduleSave() {
    this.dirty=true;
    if(this.saveTimer)return;
    this.saveTimer=setTimeout(()=>{this.saveTimer=null;this.flush();},100);
    this.saveTimer.unref?.();
  }
  flush() {
    if(this.saveTimer){clearTimeout(this.saveTimer);this.saveTimer=null;}
    if(!this.dirty)return true;
    try{
      fs.mkdirSync(path.dirname(this.file),{recursive:true});
      const temp=this.file+'.tmp';
      fs.writeFileSync(temp,JSON.stringify([...this.observed.values()]),'utf8');
      fs.renameSync(temp,this.file);this.dirty=false;return true;
    }catch(error){console.warn('[GiftCatalog] Falha ao salvar catálogo; animação da Live continua.');return false;}
  }
  list(){
    const enrich = gift => {
      const upgrade=(Number(gift.diamonds)>0 ? getGiftUpgradeByValue(gift.name,gift.diamonds) : null) || getGiftUpgrade(gift.id) || getGiftUpgrade(gift.name);
      return { ...gift, known:Boolean(upgrade), animation:'individual',
        durationSeconds:upgrade?.durationSeconds || 0,
        maxDurationSeconds:upgrade?.maxDurationSeconds || 0,
        lineType:upgrade?.lineType || null,
        specialAbility:upgrade?.specialAbility || null,
        benefit:upgrade?.description || 'Animação automática sem benefício de combate' };
    };
    const builtIn=Object.values(GIFTS).map(g=>enrich({id:String(g.id),name:g.name,diamonds:g.cost,
      count:0,observed:false}));
    const byId=new Map(builtIn.map(g=>[g.id,g]));
    for(const gift of this.observed.values()) byId.set(gift.id,enrich({...byId.get(gift.id),...gift,observed:true}));
    return [...byId.values()].sort((a,b)=>b.diamonds-a.diamonds||a.name.localeCompare(b.name,'pt-BR'));
  }
}
module.exports=GiftCatalog;
