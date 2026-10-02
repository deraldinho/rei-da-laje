function clean(value,max){return String(value??'').trim().slice(0,max);}
function positiveInt(value,max=1_000_000_000){
  const n=Math.floor(Number(value)||0);return n>0?Math.min(max,n):0;
}

class PlayerPlatform {
  constructor({db,repository,ledger,inventory,avatarCache,marketplace}={}){
    if(!db||!repository||!ledger||!inventory)throw new Error('PlayerPlatform requires persistence services');
    this.db=db;this.repository=repository;this.ledger=ledger;this.inventory=inventory;
    this.avatarCache=avatarCache||null;this.marketplace=marketplace||null;
  }

  observeProfile(profile={}){
    const userId=clean(profile.userId,128);
    if(!userId)return null;
    this.repository.upsertProfile({...profile,userId});
    const remoteUrl=clean(profile.profilePictureUrl,1000);
    if(remoteUrl&&this.avatarCache?.refresh){
      Promise.resolve(this.avatarCache.refresh({userId,remoteUrl})).catch(()=>{});
    }
    return this.spawnSnapshot(userId);
  }

  resolveGift(gift={},resolution={},applyTemporary=null){
    const userId=clean(gift.userId,128);
    if(!userId){
      if(typeof applyTemporary==='function')applyTemporary();
      return {accepted:true,duplicate:false,persistent:false,ledgerId:null,grants:[]};
    }
    if(!this.repository.getProfile(userId)){
      this.observeProfile({userId,uniqueId:gift.uniqueId,nickname:gift.nickname,profilePictureUrl:gift.profilePictureUrl});
    }
    const entry={
      ...gift,userId,
      unitCoinValue:positiveInt(resolution.unitCoinValue),
      totalCoinValue:positiveInt(resolution.totalCoinValue),
      tierKey:clean(resolution.tierKey,80),
      maneuverName:clean(resolution.maneuverName,80),
      effect:resolution.effect||{},createdAt:Date.now()
    };
    let grants=[];
    let claim;
    try{
      claim=this.ledger.claim(entry,(tx,ledgerId)=>{
        this.inventory.addProgress(userId,{
          coinValue:entry.totalCoinValue,
          giftPoints:positiveInt(resolution.giftPoints)||entry.totalCoinValue
        },tx);
        grants=this.marketplace?.applyGiftEntitlements({
          userId,totalCoinValue:entry.totalCoinValue,ledgerId
        },tx)||[];
      });
    }catch(error){
      if(typeof applyTemporary==='function')applyTemporary();
      return {accepted:true,duplicate:false,persistent:false,ledgerId:null,grants:[],persistenceError:true};
    }
    if(claim.accepted&&typeof applyTemporary==='function')applyTemporary();
    return {...claim,grants};
  }

  spawnSnapshot(userId){
    const profile=this.repository.getPersistentSnapshot(userId);
    if(!profile)return null;
    const inventory=this.inventory.snapshot(profile.userId);
    const cachedAvatar=this.avatarCache?.cachedUrl?.(profile.userId)||null;
    const equippedKite=inventory.loadout.kiteKey
      ? inventory.ownedKites.find(item=>item.kiteKey===inventory.loadout.kiteKey)||null:null;
    const equippedSkin=inventory.loadout.skinKey
      ? inventory.ownedSkins.find(item=>item.skinKey===inventory.loadout.skinKey)||null:null;
    return {
      userId:profile.userId,uniqueId:profile.uniqueId,nickname:profile.nickname,
      profilePictureUrl:cachedAvatar||profile.profilePictureUrl||'',
      progression:inventory.progression,
      loadout:inventory.loadout,
      ownedKites:inventory.ownedKites,
      ownedSkins:inventory.ownedSkins,
      equippedKite,equippedSkin
    };
  }
}

module.exports=PlayerPlatform;
