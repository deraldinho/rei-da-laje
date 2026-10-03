const test=require('node:test');
const assert=require('node:assert/strict');
const GameRules=require('../backend/rules/GameRules');
const TikTokService=require('../backend/tiktokService');

function fixture(){
  const events=[];
  const io={emit:(name,data)=>events.push({name,data})};
  const rules=new GameRules(40);
  const buffs={getActiveBuff:()=>null,applyGiftUpgrade:()=>({lineType:'algodao',powerMultiplier:1})};
  const service=new TikTokService(io,rules,buffs);
  return {events,io,rules,service};
}

test('qualquer interação cria a pipa e emite interaction para o autor',()=>{
  for(const type of ['like','share','follow','gift']){
    const {events,rules,service}=fixture();
    const data={userId:`u_${type}`,uniqueId:`@${type}`,nickname:type};
    if(type==='like') service.handleLike({...data,likeCount:7});
    if(type==='share') service.handleShare(data);
    if(type==='follow') service.handleFollow(data);
    if(type==='gift') service.handleGift({...data,giftName:'Presente sem poder',diamondCount:0,repeatCount:1});
    assert.ok(rules.activePlayers.has(`u_${type}`),`${type} não criou pipa`);
    const interaction=events.find(e=>e.name==='competition:interaction'&&e.data?.type===type);
    assert.ok(interaction,`${type} não emitiu competition:interaction`);
    assert.equal(interaction.data.userId,`u_${type}`);
  }
});

test('GameRules expõe entrada genérica preservando fila canônica',()=>{
  const rules=new GameRules(1,2);
  assert.equal(rules.handlePlayerInteraction({userId:'a',nickname:'A'}).status,'spawn');
  assert.equal(rules.handlePlayerInteraction({userId:'b',nickname:'B'}).status,'queued');
  assert.equal(rules.handlePlayerInteraction({userId:'b',nickname:'B2'}).status,'queued');
  assert.equal(rules.queue.length,1);
});