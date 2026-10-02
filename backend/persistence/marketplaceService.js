function clean(value,max){return String(value??'').trim().slice(0,max);}
function positiveInt(value,max=1_000_000_000){const n=Math.floor(Number(value)||0);return n>0?Math.min(max,n):0;}

class MarketplaceService {
  constructor({db,inventory,customKiteMinCoins}={}){
    if(!db)throw new Error('MarketplaceService requires db');
    if(!inventory)throw new Error('MarketplaceService requires inventory');
    this.db=db;
    this.inventory=inventory;
    this.customKiteMinCoins=positiveInt(customKiteMinCoins)||null;
  }

  applyGiftEntitlements({userId,totalCoinValue,ledgerId}={},dbOverride=null){
    const db=dbOverride||this.db;
    const id=clean(userId,128),total=positiveInt(totalCoinValue),sourceId=positiveInt(ledgerId,Number.MAX_SAFE_INTEGER);
    if(!id||!sourceId||!this.customKiteMinCoins||total<this.customKiteMinCoins)return [];
    const result=db.prepare(`INSERT INTO custom_kite_orders(user_id,source_ledger_id,status,requested_at)
      VALUES(?,?,'pending',?) ON CONFLICT(source_ledger_id) DO NOTHING`).run(id,sourceId,Date.now());
    if(Number(result.changes)===0)return [];
    return [{type:'custom_kite_order',orderId:Number(result.lastInsertRowid),userId:id,sourceLedgerId:sourceId,status:'pending'}];
  }

  listCustomKiteOrders(userId=null,dbOverride=null){
    const db=dbOverride||this.db,id=clean(userId,128);
    const rows=id
      ? db.prepare('SELECT * FROM custom_kite_orders WHERE user_id=? ORDER BY id').all(id)
      : db.prepare('SELECT * FROM custom_kite_orders ORDER BY id').all();
    return rows.map(row=>({
      id:Number(row.id),userId:row.user_id,sourceLedgerId:Number(row.source_ledger_id),status:row.status,
      requestedAt:Number(row.requested_at),approvedAt:row.approved_at==null?null:Number(row.approved_at),
      kiteKey:row.kite_key||null,name:row.display_name||'',assetPath:row.asset_path||''
    }));
  }

  approveCustomKiteOrder(orderId,{kiteKey,name,assetPath}={}){
    const id=positiveInt(orderId,Number.MAX_SAFE_INTEGER),key=clean(kiteKey,120);
    if(!id||!key)throw new Error('orderId and kiteKey are required');
    this.db.exec('BEGIN IMMEDIATE');
    try{
      const order=this.db.prepare('SELECT * FROM custom_kite_orders WHERE id=?').get(id);
      if(!order)throw new Error('custom kite order not found');
      if(order.status!=='pending')throw new Error('custom kite order is not pending');
      this.inventory.grantKite(order.user_id,key,{
        displayName:clean(name,120),assetPath:clean(assetPath,500),sourceLedgerId:Number(order.source_ledger_id),custom:true
      },this.db);
      const approvedAt=Date.now();
      this.db.prepare(`UPDATE custom_kite_orders SET status='approved',approved_at=?,kite_key=?,display_name=?,asset_path=? WHERE id=? AND status='pending'`)
        .run(approvedAt,key,clean(name,120),clean(assetPath,500),id);
      this.db.exec('COMMIT');
      return {userId:order.user_id,kiteKey:key,name:clean(name,120),assetPath:clean(assetPath,500),approvedAt};
    }catch(error){
      try{this.db.exec('ROLLBACK');}catch(_){}
      throw error;
    }
  }
}

module.exports=MarketplaceService;
