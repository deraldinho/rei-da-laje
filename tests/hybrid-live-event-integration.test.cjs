const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const GameRules=require('../backend/rules/gameRules');
const TikTokService=require('../backend/tiktokService');
function setup(){const events=[];const io={emit:(name,data)=>events.push({name,data})};const rules=new GameRules(40);return {events,rules,service:new TikTokService(io,rules,{})};}

test('comentário aceito é encaminhado como texto sem comando mágico ou spawn duplicado',()=>{
  const {service,events,rules}=setup();
  service.handleChatMessage({userId:'u1',nickname:'Ana',comment:'bora cortar geral 🔥'});
  service.handleChatMessage({userId:'u1',nickname:'Ana',comment:'1'});
  const comments=events.filter(e=>e.name==='competition:comment');
  assert.equal(comments.length,2);assert.equal(comments[0].data.text,'bora cortar geral 🔥');
  assert.equal(comments[1].data.text,'1');assert.equal(rules.activePlayers.size,1);
  assert.equal(events.filter(e=>e.name==='player:spawn').length,1);
  assert.equal(events.filter(e=>e.name==='competition:chat_action').length,0);
});

test('comandos clássicos permanecem disponíveis só quando debug/admin habilita',()=>{
  const {service,events}=setup();service.chatActionsEnabled=true;
  service.handleChatMessage({userId:'debug',nickname:'Debug',comment:'1'});
  const action=events.find(e=>e.name==='competition:chat_action');
  assert.equal(action?.data?.action,'puxar');
});

test('GameApp integra crowd, densidade e comentário genérico no mesmo relógio físico',()=>{
  const app=fs.readFileSync(path.join(__dirname,'../frontend/src/engine/App.js'),'utf8');
  assert.match(app,/CrowdEnergy/);assert.match(app,/LineDensityField/);assert.match(app,/competition:comment/);
  assert.match(app,/Wind\.setCrowdEnergy/);assert.match(app,/lineDensityField\.update/);
  assert.match(app,/applyManeuverMovement\([^\n]*lineDensityField/);
  const start=app.indexOf("on('competition:chat_action'");
  const end=app.indexOf("on('competition:queue'",start);
  const legacy=app.slice(start,end);
  assert.doesNotMatch(legacy,/inputBuffer\?\.addComment/,'debug clássico não pode duplicar gesto de comentário');
});
