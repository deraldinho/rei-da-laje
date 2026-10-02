const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const BuffManager=require('../backend/rules/buffManager');
const {GIFTS}=require('../backend/rules/giftConfig');
const source=fs.readFileSync(path.join(__dirname,'../frontend/src/engine/GiftBenefitTimer.js'),'utf8');
const timers=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('contagem absoluta continua correta após reload e zera quando expira',async()=>{
 const {benefitExpiry,benefitRemaining,formatBenefitTime,benefitLabels}=await timers;
 const now=100000;
 const end=benefitExpiry(now+120000,1,now);
 assert.equal(end,220000);
 assert.equal(benefitRemaining(end,now),120);
 assert.equal(benefitRemaining(end,now+61000),59);
 assert.equal(benefitRemaining(end,now+121000),0);
 assert.equal(formatBenefitTime(120),'02:00');
 assert.equal(formatBenefitTime(3661),'1:01:01');
 assert.equal(benefitLabels('chile',end,{tornado:now+3000},now).length,2);
 assert.equal(benefitLabels('chile',end,{tornado:now+3000},now+121000).length,0);
 assert.equal(benefitExpiry(null,0,now),0);
});

test('buff publica expiração real e combo acumula tempo; especiais têm timers independentes',()=>{
 const messages=[];const buffs=new BuffManager({emit:(event,payload)=>messages.push({event,payload})});
 try{
  const first=buffs.applyGiftUpgrade('a',GIFTS.ROSA);
  const second=buffs.applyGiftUpgrade('a',GIFTS.ROSA,2);
  assert.ok(second.expiresAt-first.expiresAt>=14000 && second.expiresAt-first.expiresAt<=15010);
  const emitted=messages.filter(m=>m.event==='player:buff_applied').at(-1).payload;
  assert.equal(emitted.expiresAt,second.expiresAt);
  buffs.applyGiftUpgrade('a',GIFTS.PERFUME);
  buffs.applyGiftUpgrade('a',GIFTS.LEAO);
  const specials=buffs.getPlayerSpecials('a');
  assert.equal(specials.length,2);
  assert.ok(specials.every(s=>s.expiresAt>Date.now() && s.durationSeconds>0));
  assert.equal(buffs.getPlayerBuff('a').expiresAt,second.expiresAt);
 }finally{buffs.removePlayer('a');}
});

test('presentes duram 30 ou 45 segundos e repetição respeita teto de 45 segundos',()=>{
 const expected={ROSA:[30,45],DONUT:[30,45],CAPIVARA:[45,45],PERFUME:[45,45],LEAO:[45,45]};
 const buffs=new BuffManager(null);
 try {
  for(const [key,[seconds,limit]] of Object.entries(expected)){
   const gift=GIFTS[key],id='timed-'+key;
   assert.equal(gift.durationSeconds,seconds,key);
   assert.equal(gift.maxDurationSeconds,limit,key);
   buffs.applyGiftUpgrade(id,gift);
   const special=['tornado','invulnerable'].includes(gift.specialAbility);
   const current=()=>special?buffs.getPlayerSpecials(id).find(s=>s.ability===gift.specialAbility):buffs.getPlayerBuff(id);
   const first=current();
   assert.ok(first.expiresAt-Date.now()<=seconds*1000 && first.expiresAt-Date.now()>=(seconds-1)*1000,key);
   buffs.applyGiftUpgrade(id,gift,1000);
   const stacked=current();
   assert.ok(stacked.expiresAt-Date.now()<=limit*1000 && stacked.expiresAt-Date.now()>=(limit-1)*1000,key);
   buffs.removePlayer(id);
  }
 }finally {for(const key of Object.keys(expected))buffs.removePlayer('timed-'+key);}
});

test('Flor e Universo reutilizam a duração e o teto dos presentes correspondentes',()=>{
 const {getGiftUpgrade}=require('../backend/rules/giftConfig');
 assert.equal(getGiftUpgrade('Flor'),GIFTS.ROSA);
 assert.equal(getGiftUpgrade('Universo'),GIFTS.LEAO);
});

test('cada manobra dura 30 ou 45 segundos, com teto de 45',async()=>{
 const {pathToFileURL}=require('node:url');
 const maneuverPath=path.join(__dirname,'../frontend/src/engine/Maneuvers.js');
 const {maneuverStats,selectGiftManeuver}=await import(pathToFileURL(maneuverPath).href+'?t='+Date.now());
 const examples={Rosa:[30,45],Flor:[30,45],Donut:[30,45],Capivara:[45,45],
   Perfume:[45,45],Leão:[45,45],Universo:[45,45]};
 for(const [gift,[seconds,maximum]] of Object.entries(examples)){
  const name=selectGiftManeuver(gift);
  assert.equal(maneuverStats(name,1,1).duration,seconds,gift);
  const combo=maneuverStats(name,1,1000);
  assert.equal(combo.duration,maximum,gift);
  assert.ok(combo.reach<=390 && combo.damage<=1.25 && combo.defense>=0.5);
 }
});

test('restaurar checkpoint antigo não reativa tempos acima dos novos limites',()=>{
 const now=Date.now(),buffs=new BuffManager(null);
 try{
  buffs.restoreState([{userId:'a',lineType:'cerol',expiresAt:now+60000,shieldCount:0}],
    [{userId:'a',ability:'invulnerable',expiresAt:now+60000}],new Set(['a']),now);
  assert.ok(buffs.getPlayerBuff('a').expiresAt-now<=45000);
  assert.ok(buffs.getPlayerSpecials('a')[0].expiresAt-now<=45000);
 }finally{buffs.removePlayer('a');}
});
