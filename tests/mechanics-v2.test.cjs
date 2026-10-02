const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const GameRules=require('../backend/rules/gameRules');
const TikTokService=require('../backend/tiktokService');
const {validateCutClaim}=require('../backend/cutClaimValidator');
const {GIFTS}=require('../backend/rules/giftConfig');

async function esm(rel){ return import(pathToFileURL(path.join(__dirname,'..',rel)).href+`?t=${Date.now()}-${Math.random()}`); }
const kite=()=>({x:300,y:300,baseX:100,baseY:700,screenWidth:1080,screenHeight:1920,
 isAscending:false,spawnProtection:0,lineSlack:0,rotation:0,lineTension:.58,targetLineTension:.58,
 likeSpool:0,likeSpoolRemaining:0,defenseWindowRemaining:0,contactSpeed:0});

test('tensão física responde aos comandos canônicos e retorna ao repouso',async()=>{
 const [{startChatAction},{PlayerIntentController},{updateLineControl}]=await Promise.all([
  esm('frontend/src/engine/ChatControls.js'),esm('frontend/src/engine/physics/PlayerIntentController.js'),esm('frontend/src/engine/RelinhoMechanics.js')]);
 const k=kite();k.intentController=new PlayerIntentController(k);startChatAction(k,'puxar');
 let intent=k.intentController.update(1/60,{x:.4,y:0,z:0},[]);assert.ok(intent.spoolCommand<0);assert.ok(intent.tensionAssist>0);
 k.targetLineTension=1;for(let i=0;i<20;i++)updateLineControl(k,1);assert.ok(k.lineTension>.58);
 k.chatAction=null;k.targetLineTension=.58;k.likeSpoolRemaining=0;for(let i=0;i<80;i++)updateLineControl(k,1);
 assert.ok(Math.abs(k.lineTension-.58)<.03);
});

test('contato evolui de toque para relinho com fricção',async()=>{
 const {evolveRelinhoContact}=await esm('frontend/src/engine/RelinhoMechanics.js');
 const a=kite(),b={...kite(),x:500,baseX:700};
 let s=evolveRelinhoContact(null,a,b,1000);assert.equal(s.phase,'CONTACT');
 for(let i=1;i<=5;i++)s=evolveRelinhoContact(s,a,b,1000+i*40);
 assert.equal(s.phase,'GRINDING');assert.ok(s.friction>0);
 const again=evolveRelinhoContact({...s,phase:'RELEASE'},a,b,2000);
 assert.equal(again.phase,'CONTACT');
});

test('ângulo de cruzamento influencia a fricção',async()=>{
 const {lineAngleFactor}=await esm('frontend/src/engine/RelinhoMechanics.js');
 const a={baseX:0,baseY:0,x:100,y:0};
 const parallel={baseX:0,baseY:20,x:100,y:20};
 const cross={baseX:50,baseY:-50,x:50,y:50};
 assert.ok(lineAngleFactor(a,cross)>lineAngleFactor(a,parallel));
});

test('combos de chat reconhecem estilingue, trava e puxada seca',async()=>{
 const {startChatAction}=await esm('frontend/src/engine/ChatControls.js');
 const k=kite();startChatAction(k,'descarregar');startChatAction(k,'embicar');startChatAction(k,'puxar');
 assert.equal(k.chatCombo.name,'estilingue');
 const d=kite();startChatAction(d,'puxar');startChatAction(d,'pegar');assert.equal(d.chatCombo.name,'trava');
 const p=kite();startChatAction(p,'descarregar');startChatAction(p,'puxar');assert.equal(p.chatCombo.name,'puxada_seca');
});

test('curtidas acumulam carretel e aliviam a tensão',async()=>{
 const {applyLikeSpool,updateLineControl}=await esm('frontend/src/engine/RelinhoMechanics.js');
 const k=kite();const s1=applyLikeSpool(k,2),s2=applyLikeSpool(k,8);
 assert.ok(s2>s1);assert.ok(k.targetLineTension<.58);assert.ok(k.lineSlack>0);
 const before=k.likeSpool;for(let i=0;i<240;i++)updateLineControl(k,1);
 assert.ok(k.likeSpool<before);assert.ok(k.lineTension>.2);
});

test('existe uma única coroa e ela é transferida ao derrubar o rei',()=>{
 const r=new GameRules(3);for(const id of ['a','b','c'])r.handlePlayerComment({userId:id});
 for(let i=0;i<5;i++){if(!r.activePlayers.has('b'))r.handlePlayerComment({userId:'b'});r.recordCut('a','b');}
 assert.equal(r.kingId,'a');assert.equal([...r.activePlayers.values()].filter(p=>p.isKing).length,1);
 if(!r.activePlayers.has('c'))r.handlePlayerComment({userId:'c'});
 r.recordCut('c','a');assert.equal(r.kingId,'c');
 assert.equal([...r.activePlayers.values()].filter(p=>p.isKing).length,1);
 assert.equal(r.sessionStats.get('c').kingCuts,1);
});

test('Mestre do Céu é épico sem vitória automática',()=>{
 assert.equal(GIFTS.LEAO.powerMultiplier,6);
 assert.equal(GIFTS.LEAO.shieldCount,3);
 assert.equal(GIFTS.LEAO.durationSeconds,45);
 assert.match(GIFTS.LEAO.description,/resistência/i);
});

test('anti-spam mantém uma fila curta e entrega o comando mais recente',async()=>{
 const io={events:[],emit(event,data){this.events.push({event,data});}};
 const rules=new GameRules(2);rules.handlePlayerComment({userId:'a',nickname:'A'});
 const service=new TikTokService(io,rules,{});
 service.emitChatActionThrottled('a','A','puxar');
 service.emitChatActionThrottled('a','A','embicar');
 service.emitChatActionThrottled('a','A','pegar');
 assert.equal(io.events.filter(e=>e.event==='competition:chat_action').length,1);
 await new Promise(r=>setTimeout(r,330));
 const actions=io.events.filter(e=>e.event==='competition:chat_action').map(e=>e.data.action);
 assert.deepEqual(actions,['puxar','pegar']);
});

test('backend valida corte pela geometria recente e rejeita estado velho',()=>{
 const rules=new GameRules(2);rules.handlePlayerComment({userId:'a'});rules.handlePlayerComment({userId:'b'});
 const now=10000,states=new Map([
  ['a',{userId:'a',updatedAt:now,baseX:0,baseY:100,x:100,y:0}],
  ['b',{userId:'b',updatedAt:now,baseX:100,baseY:100,x:0,y:0}]
 ]);
 const ok=validateCutClaim({winnerId:'a',loserId:'b',cutX:50,cutY:50},rules,states,now);
 assert.equal(ok.ok,true);assert.ok(Math.abs(ok.cutX-50)<.001);
 states.get('b').updatedAt=now-3000;
 assert.equal(validateCutClaim({winnerId:'a',loserId:'b',cutX:50,cutY:50},rules,states,now).reason,'STALE_STATE');
});

test('Mestre do Céu usa HP finito no estado oficial',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../backend/arenaLiveState.js'),'utf8');
 assert.ok(source.includes('mestre_do_ceu:320'));
 assert.equal(source.includes('mestre_do_ceu:9999'),false);
});
