const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const GiftCatalog=require('../backend/giftCatalog');
const GameRules=require('../backend/rules/gameRules');
const TikTokService=require('../backend/tiktokService');
const visual=fs.readFileSync(path.join(__dirname,'../frontend/src/engine/GiftAnimations.js'),'utf8');
const moduleVisual=import('data:text/javascript;base64,'+Buffer.from(visual).toString('base64'));

test('todo presente reconhecido ou novo recebe identidade visual estável e duração limitada',async()=>{
 const {giftAnimation}=await moduleVisual;
 const examples=['Rosa','Flor','Donut','Capivara','Perfume','Leão','Universo','Presente que ainda não está no catálogo'];
 for(const name of examples){const a=giftAnimation({giftId:name,giftName:name,diamondCount:49999,repeatCount:900});
   const b=giftAnimation({giftId:name,giftName:name,diamondCount:49999,repeatCount:900});
   assert.deepEqual(a,b);assert.ok(a.duration>=1 && a.duration<=3);assert.ok(a.particleCount<=22);
   assert.ok(a.label);assert.ok(a.symbol);assert.ok(a.style);assert.equal(a.count,900);
 }
 assert.notEqual(giftAnimation({giftName:'Rosa'}).style,giftAnimation({giftName:'Donut'}).style);
});

test('todos os presentes com valor são celebrados e recebem poder por faixa de diamantes',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-gift-catalog-'));
 const filename=path.join(dir,'gifts.json');
 const io={events:[],emit(event,payload){this.events.push({event,payload});}};
 const rules=new GameRules(2);
 rules.handlePlayerComment({userId:'a',nickname:'Alice'});
 const buffs={calls:0,applyGiftUpgrade(){this.calls++;return {lineType:'cerol',powerMultiplier:1};}};
 const catalog=new GiftCatalog(filename);
 const service=new TikTokService(io,rules,buffs);
 service.giftCatalog=catalog;
 try{
   service.handleGift({userId:'a',nickname:'Alice',giftId:998877,giftName:'Presente novo',diamondCount:45,repeatCount:2});
   assert.equal(io.events.filter(e=>e.event==='gift:celebration').length,1);
   assert.equal(io.events.filter(e=>e.event==='competition:maneuver').length,1);
   assert.equal(buffs.calls,1);
   assert.equal(rules.sessionStats.get('a').gifts,2);
   assert.equal(catalog.flush(),true);
   assert.equal(new GiftCatalog(filename).list().find(g=>g.id==='998877').name,'Presente novo');
   service.handleGift({userId:'a',nickname:'Alice',giftId:5655,giftName:'Rosa',repeatCount:1});
   assert.equal(io.events.filter(e=>e.event==='gift:celebration').length,2);
   assert.equal(io.events.filter(e=>e.event==='competition:maneuver').length,2);
   assert.equal(buffs.calls,2);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('animação preserva ícone HTTPS do presente e rejeita URL insegura',async()=>{
 const {giftAnimation}=await moduleVisual;
 assert.equal(giftAnimation({giftName:'Rosa',iconUrl:'https://cdn.test/rosa.png'}).iconUrl,'https://cdn.test/rosa.png');
 assert.equal(giftAnimation({giftName:'Rosa',iconUrl:'javascript:alert(1)'}).iconUrl,'');
});

test('catálogo reconhece Flor e Universo observados mesmo com ID novo',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-gift-alias-'));
 const filename=path.join(dir,'gifts.json');
 try{
  const catalog=new GiftCatalog(filename);
  catalog.observe({giftId:910001,giftName:'Flor',diamondCount:3,repeatCount:1});
  catalog.observe({giftId:910002,giftName:'Universo',diamondCount:1200,repeatCount:1});
  catalog.flush();
  const flor=catalog.list().find(g=>g.id==='910001');
  const universo=catalog.list().find(g=>g.id==='910002');
  assert.equal(flor.known,true);assert.equal(flor.durationSeconds,30);assert.equal(flor.maxDurationSeconds,45);
  assert.equal(universo.known,true);assert.equal(universo.durationSeconds,45);assert.equal(universo.maxDurationSeconds,45);
  assert.match(flor.benefit,/Cerol/i);assert.match(universo.benefit,/Mestre do Céu/i);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

test('presentes desconhecidos usam valor em diamantes para escolher poder de 30 ou 45 segundos',()=>{
 const {getGiftUpgradeByValue}=require('../backend/rules/giftConfig');
 const cheap=getGiftUpgradeByValue('Finger Heart',5),medium=getGiftUpgradeByValue('Novo Presente',30),high=getGiftUpgradeByValue('Presente Forte',100);
 assert.equal(cheap.lineType,'cerol');assert.equal(cheap.durationSeconds,30);assert.equal(cheap.maneuverGiftName,'Rosa');
 assert.equal(medium.lineType,'chile');assert.equal(medium.durationSeconds,30);assert.equal(medium.maneuverGiftName,'Donut');
 assert.equal(high.lineType,'kevlar');assert.equal(high.durationSeconds,45);assert.equal(high.maneuverGiftName,'Capivara');
});