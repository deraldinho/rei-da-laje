function clean(value,max){ return String(value??'').trim().slice(0,max); }
function int(value,min=0,max=1_000_000_000){
  const n=Math.floor(Number(value)||0); return Math.max(min,Math.min(max,n));
}

function buildGiftEventKey(gift={}){
  const messageId=clean(gift.messageId,64);
  if(!messageId)return null;
  const roomId=clean(gift.roomId,40)||'_';
  return `tiktok:${roomId}:${messageId}`;
}

class GiftLedger {
  constructor(db){
    if(!db) throw new Error('GiftLedger requires db');
    this.db=db;
    this.insertStmt=db.prepare(`
      INSERT INTO gift_ledger(
        event_key,room_id,message_id,user_id,gift_id,gift_name,repeat_count,
        unit_coin_value,total_coin_value,tier_key,effect_json,maneuver_name,created_at
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(event_key) DO NOTHING
    `);
  }

  claim(entry={},persistentGrant=null){
    const eventKey=clean(entry.eventKey,180)||buildGiftEventKey(entry);
    if(!eventKey) return {accepted:true,duplicate:false,persistent:false,ledgerId:null};
    const userId=clean(entry.userId,128);
    if(!userId) throw new Error('gift ledger requires userId');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result=this.insertStmt.run(
        eventKey,
        clean(entry.roomId,40),
        clean(entry.messageId,64),
        userId,
        clean(entry.giftId,80),
        clean(entry.giftName,90),
        int(entry.repeatCount,1,1000),
        int(entry.unitCoinValue),
        int(entry.totalCoinValue),
        clean(entry.tierKey,80),
        clean(JSON.stringify(entry.effect||{}),4000) || '{}',
        clean(entry.maneuverName,80),
        int(entry.createdAt,1,Number.MAX_SAFE_INTEGER)
      );
      if(Number(result.changes)===0){
        this.db.exec('COMMIT');
        return {accepted:false,duplicate:true,persistent:true,ledgerId:null};
      }
      const ledgerId=Number(result.lastInsertRowid);
      if(typeof persistentGrant==='function') persistentGrant(this.db,ledgerId);
      this.db.exec('COMMIT');
      return {accepted:true,duplicate:false,persistent:true,ledgerId};
    } catch(error){
      try{this.db.exec('ROLLBACK');}catch(_){/* transaction already closed */}
      throw error;
    }
  }
}

module.exports=GiftLedger;
module.exports.buildGiftEventKey=buildGiftEventKey;
