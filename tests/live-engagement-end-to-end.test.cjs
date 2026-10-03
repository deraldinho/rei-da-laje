const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const GameRules=require('../backend/rules/gameRules');const BuffManager=require('../backend/rules/buffManager');const TikTokService=require('../backend/tiktokService');

test('cinco usuários entram por cinco interações e só gift mapeado acrescenta manobra',()=>{
 const events=[];const io={emit:(name,data)=>events.push({name,data})};const rules=new GameRules(40);const buffs=new BuffManager(io);const service=new TikTokService(io,rules,buffs);
 service.handleChatMessage({userId:'u_comment',nickname:'Comment',comment:'bora'});service.handleLike({userId:'u_like',nickname:'Like',likeCount:20});
 service.handleShare({userId:'u_share',nickname:'Share'});service.handleFollow({userId:'u_follow',nickname:'Follow'});
 service.handleGift({userId:'u_gift',nickname:'Gift',giftName:'Rosa',diamondCount:1,repeatCount:1});
 assert.equal(rules.activePlayers.size,5);const types=new Set(events.filter(e=>e.name==='competition:interaction').map(e=>e.data.type));
 for(const type of ['comment','like','share','follow','gift'])assert.ok(types.has(type),`faltou ${type}`);
 const maneuvers=events.filter(e=>e.name==='competition:maneuver');assert.equal(maneuvers.length,1);assert.equal(maneuvers[0].data.userId,'u_gift');
 for(const id of rules.activePlayers.keys())buffs.removePlayer(id);
});

test('replay e rotas admin usam os handlers canônicos de interação',()=>{
 const server=fs.readFileSync(path.join(__dirname,'../backend/server.js'),'utf8');const service=fs.readFileSync(path.join(__dirname,'../backend/tiktokService.js'),'utf8');
 assert.match(server,/like:data=>tiktokService\.handleLike/);assert.match(server,/share:data=>tiktokService\.handleShare/);
 assert.match(service,/replayStore\?\.record\('share'/);
 assert.match(server,/api\/simulate\/likes[\s\S]{0,500}tiktokService\.handleLike/);
 assert.match(server,/api\/simulate\/share[\s\S]{0,500}tiktokService\.handleShare/);
 assert.match(server,/api\/simulate\/follow[\s\S]{0,500}tiktokService\.handleFollow/);
});