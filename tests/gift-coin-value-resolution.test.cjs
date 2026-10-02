const test=require('node:test');
const assert=require('node:assert/strict');
const TikTokService=require('../backend/tiktokService');
const GameRules=require('../backend/rules/gameRules');

function setup(){
  const io={events:[],emit(event,payload){this.events.push({event,payload});}};
  const rules=new GameRules(4);rules.handlePlayerComment({userId:'u',nickname:'U'});
  const buffs={calls:[],applyGiftUpgrade(userId,upgrade,count){this.calls.push({userId,upgrade,count});return {lineType:upgrade.lineType,powerMultiplier:upgrade.powerMultiplier};}};
  return {io,rules,buffs,service:new TikTokService(io,rules,buffs)};
}

function outcome(input){
  const x=setup();x.service.handleGift({userId:'u',nickname:'U',...input});
  return {x,maneuver:x.io.events.find(e=>e.event==='competition:maneuver')?.payload,
    received:x.io.events.find(e=>e.event==='gift:received')?.payload,
    celebration:x.io.events.find(e=>e.event==='gift:celebration')?.payload};
}

test('30 rosas de valor 1 promovem para o mesmo tier de um presente único de valor 30',()=>{
  const roses=outcome({giftId:5655,giftName:'Rosa',diamondCount:1,repeatCount:30});
  const thirty=outcome({giftId:999001,giftName:'Presente 30',diamondCount:30,repeatCount:1});
  assert.equal(roses.x.buffs.calls.length,1);assert.equal(thirty.x.buffs.calls.length,1);
  assert.equal(roses.x.buffs.calls[0].upgrade.lineType,'chile');
  assert.equal(roses.x.buffs.calls[0].upgrade.lineType,thirty.x.buffs.calls[0].upgrade.lineType);
  assert.equal(roses.maneuver.giftCost,30);assert.equal(thirty.maneuver.giftCost,30);
  assert.equal(roses.maneuver.giftName,thirty.maneuver.giftName);
  assert.equal(roses.x.buffs.calls[0].count,1,'tier promovido é aplicado uma vez');
  assert.equal(roses.maneuver.repeatCount,1,'manobra promovida não duplica duração pelo combo original');
});

test('celebração preserva quantidade original e expõe valor unitário/total separados',()=>{
  const {x,celebration,received}=outcome({giftId:5655,giftName:'Rosa',diamondCount:1,repeatCount:30});
  assert.equal(celebration.repeatCount,30);assert.equal(celebration.unitCoinValue,1);assert.equal(celebration.totalCoinValue,30);
  assert.equal(received.unitCoinValue,1);assert.equal(received.totalCoinValue,30);
  assert.equal(x.rules.sessionStats.get('u').diamonds,30);
});

test('fronteiras de tier seguem os custos configurados e não números mágicos',()=>{
  const {getGiftUpgradeByValue}=require('../backend/rules/giftConfig');
  const cases=[[1,'cerol'],[29,'cerol'],[30,'chile'],[99,'chile'],[100,'kevlar'],
    [499,'kevlar'],[500,'tornado'],[29998,'tornado'],[29999,'mestre_do_ceu']];
  for(const [value,lineType] of cases) assert.equal(getGiftUpgradeByValue('qualquer',value).lineType,lineType,`valor ${value}`);
});

test('repetição no mesmo tier preserva stacking, promoção de tier não duplica benefício',()=>{
  const capivara=outcome({giftId:6064,giftName:'Capivara',diamondCount:100,repeatCount:3});
  assert.equal(capivara.x.buffs.calls.length,1);
  assert.equal(capivara.x.buffs.calls[0].count,3);
  assert.equal(capivara.maneuver.repeatCount,3);

  const roses=outcome({giftId:5655,giftName:'Rosa',diamondCount:1,repeatCount:30});
  assert.equal(roses.x.buffs.calls.length,1);
  assert.equal(roses.x.buffs.calls[0].count,1);
  assert.equal(roses.maneuver.repeatCount,1);
});
