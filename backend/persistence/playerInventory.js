function clean(value,max){return String(value??'').trim().slice(0,max);}
function int(value,min=0,max=1_000_000_000){const n=Math.floor(Number(value)||0);return Math.max(min,Math.min(max,n));}
function json(value){try{return JSON.stringify(value||{}).slice(0,4000)||'{}';}catch(_){return '{}';}}
function parseJson(value){try{return JSON.parse(value||'{}');}catch(_){return {};}}

class PlayerInventory {
  constructor(db){if(!db)throw new Error('PlayerInventory requires db');this.db=db;}

  addProgress(userId,delta={},dbOverride=null){
    const db=dbOverride||this.db,id=clean(userId,128);
    if(!id)throw new Error('userId is required');
    const giftPoints=int(delta.giftPoints),coinValue=int(delta.coinValue),now=Date.now();
    db.prepare(`
      INSERT INTO progression(user_id,gift_points,lifetime_coin_value,level,updated_at)
      VALUES(?,?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET
        gift_points=progression.gift_points+excluded.gift_points,
        lifetime_coin_value=progression.lifetime_coin_value+excluded.lifetime_coin_value,
        updated_at=excluded.updated_at
    `).run(id,giftPoints,coinValue,1,now);
    return this._progression(id,db);
  }

  grantKite(userId,kiteKey,metadata={},dbOverride=null){
    const db=dbOverride||this.db,id=clean(userId,128),key=clean(kiteKey,120);
    if(!id||!key)throw new Error('userId and kiteKey are required');
    const result=db.prepare(`INSERT INTO owned_kites(user_id,kite_key,display_name,asset_path,metadata_json,source_ledger_id,owned_at)
      VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id,kite_key) DO NOTHING`).run(
      id,key,clean(metadata.displayName,120),clean(metadata.assetPath,500),json(metadata),metadata.sourceLedgerId||null,Date.now());
    return {granted:Number(result.changes)>0,kiteKey:key};
  }
  grantSkin(userId,skinKey,metadata={},dbOverride=null){
    const db=dbOverride||this.db,id=clean(userId,128),key=clean(skinKey,120);
    if(!id||!key)throw new Error('userId and skinKey are required');
    const result=db.prepare(`INSERT INTO owned_skins(user_id,skin_key,display_name,metadata_json,source_ledger_id,owned_at)
      VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,skin_key) DO NOTHING`).run(
      id,key,clean(metadata.displayName,120),json(metadata),metadata.sourceLedgerId||null,Date.now());
    return {granted:Number(result.changes)>0,skinKey:key};
  }

  equip(userId,selection={},dbOverride=null){
    const db=dbOverride||this.db,id=clean(userId,128);
    if(!id)throw new Error('userId is required');
    const current=db.prepare('SELECT equipped_kite_key,equipped_skin_key FROM loadouts WHERE user_id=?').get(id);
    const kiteKey=Object.prototype.hasOwnProperty.call(selection,'kiteKey')?(selection.kiteKey?clean(selection.kiteKey,120):null):(current?.equipped_kite_key||null);
    const skinKey=Object.prototype.hasOwnProperty.call(selection,'skinKey')?(selection.skinKey?clean(selection.skinKey,120):null):(current?.equipped_skin_key||null);
    if(kiteKey&&!db.prepare('SELECT 1 FROM owned_kites WHERE user_id=? AND kite_key=?').get(id,kiteKey)) throw new Error('kite not owned');
    if(skinKey&&!db.prepare('SELECT 1 FROM owned_skins WHERE user_id=? AND skin_key=?').get(id,skinKey)) throw new Error('skin not owned');
    db.prepare(`INSERT INTO loadouts(user_id,equipped_kite_key,equipped_skin_key,updated_at) VALUES(?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET equipped_kite_key=excluded.equipped_kite_key,equipped_skin_key=excluded.equipped_skin_key,updated_at=excluded.updated_at`)
      .run(id,kiteKey,skinKey,Date.now());
    return {kiteKey,skinKey};
  }

  _progression(userId,db=this.db){
    const row=db.prepare('SELECT gift_points,lifetime_coin_value,level FROM progression WHERE user_id=?').get(userId);
    return row?{giftPoints:Number(row.gift_points),lifetimeCoinValue:Number(row.lifetime_coin_value),level:Number(row.level)}
      :{giftPoints:0,lifetimeCoinValue:0,level:1};
  }
  snapshot(userId,dbOverride=null){
    const db=dbOverride||this.db,id=clean(userId,128);
    const ownedKites=db.prepare('SELECT kite_key,display_name,asset_path,metadata_json,owned_at FROM owned_kites WHERE user_id=? ORDER BY owned_at,id').all(id)
      .map(row=>({kiteKey:row.kite_key,displayName:row.display_name,assetPath:row.asset_path,metadata:parseJson(row.metadata_json),ownedAt:Number(row.owned_at)}));
    const ownedSkins=db.prepare('SELECT skin_key,display_name,metadata_json,owned_at FROM owned_skins WHERE user_id=? ORDER BY owned_at,id').all(id)
      .map(row=>({skinKey:row.skin_key,displayName:row.display_name,metadata:parseJson(row.metadata_json),ownedAt:Number(row.owned_at)}));
    const loadoutRow=db.prepare('SELECT equipped_kite_key,equipped_skin_key FROM loadouts WHERE user_id=?').get(id);
    return {
      progression:this._progression(id,db),
      ownedKites,
      ownedSkins,
      loadout:{kiteKey:loadoutRow?.equipped_kite_key||null,skinKey:loadoutRow?.equipped_skin_key||null}
    };
  }
}

module.exports=PlayerInventory;
