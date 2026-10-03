const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ArenaStateStore = require('../backend/arenaStateStore');
const GameRules = require('../backend/rules/gameRules');

test('guard aceita simulação manual explicitamente marcada pelo Admin local', () => {
  const { isAdminSimulationRequest } = require('../backend/simulationGuard');
  assert.equal(isAdminSimulationRequest({ headers: {} }), false);
  assert.equal(isAdminSimulationRequest({ headers: { 'x-pipa-simulation': 'admin' } }), true);
});

test('GameRules preserva marca efêmera em bot manual', () => {
  const rules = new GameRules(40);
  const result = rules.handlePlayerComment({ userId:'sim_manual_1', nickname:'Bot', isSimulation:true });
  assert.equal(result.status, 'spawn');
  assert.equal(result.player.isSimulation, true);
});
test('snapshot não persiste bots marcados como simulação', () => {
  const store = new ArenaStateStore(path.join(process.env.TEMP, `arena-sim-${Date.now()}.json`));
  const rules = {
    activePlayers:new Map([
      ['sim_manual_1',{userId:'sim_manual_1',nickname:'Bot',isSimulation:true}],
      ['real_1',{userId:'real_1',nickname:'Real'}]
    ]),
    queue:[{userId:'catcher_1',nickname:'Catch',isSimulation:true},{userId:'real_q',nickname:'Real Q'}],
    sessionStats:new Map([
      ['sim_manual_1',{nickname:'Bot'}],['catcher_1',{nickname:'Catch'}],['real_1',{nickname:'Real'}]
    ]), leaderId:'sim_manual_1', kingId:'sim_manual_1'
  };
  const buffs={activeBuffs:new Map(),activeSpecials:new Map()};
  store.playerStates=new Map([
    ['sim_manual_1',{userId:'sim_manual_1',lineHP:50}],['real_1',{userId:'real_1',lineHP:80}]
  ]);
  const snap=store.snapshot(rules,buffs);
  assert.deepEqual(snap.players.map(p=>p.userId),['real_1']);
  assert.deepEqual(snap.queue.map(p=>p.userId),['real_q']);
  assert.equal(snap.stats.some(([id])=>id==='sim_manual_1'||id==='catcher_1'),false);
  assert.deepEqual(snap.playerStates.map(s=>s.userId),['real_1']);
  assert.equal(snap.leaderId,null);
  assert.equal(snap.kingId,null);
});
test('painel Admin marca chamadas de simulação explicitamente', () => {
  const source=fs.readFileSync(path.resolve(__dirname,'../backend/views/admin.html'),'utf8');
  assert.match(source,/function simulationFetch\(/);
  assert.match(source,/['"]X-Pipa-Simulation['"]\s*:\s*['"]admin['"]/i);
  assert.equal((source.match(/fetch\('\/api\/simulate\//g)||[]).length,0,
    'Admin não deve chamar rota de simulação sem o wrapper marcado');
});
test('chat simulado não grava perfil persistente e chega marcado ao GameRules', () => {
  const TikTokService=require('../backend/tiktokService');
  let observed=0,received=null;
  const rules={
    parseChatCommand:()=>null,
    handlePlayerComment:data=>{received=data;return {status:'already_active',player:{...data}};},
    queue:[]
  };
  const service=new TikTokService({emit(){}},rules,{});
  service.playerPlatform={observeProfile(){observed++;return {};}};
  service.handleChatMessage({userId:'sim_manual_2',nickname:'Bot 2',comment:'teste',simulation:true});
  assert.equal(observed,0);
  assert.equal(received.isSimulation,true);
});

test('painel Admin já aberto continua autorizado pelo referer local', () => {
  const { isAdminSimulationRequest } = require('../backend/simulationGuard');
  const req={
    headers:{ referer:'http://127.0.0.1:3000/admin' },
    socket:{ remoteAddress:'127.0.0.1' }
  };
  assert.equal(isAdminSimulationRequest(req),true);
});

test('rota /admin desativa cache para não manter JavaScript antigo', () => {
  const source=fs.readFileSync(path.resolve(__dirname,'../backend/server.js'),'utf8');
  assert.match(source,/app\.get\('\/admin',[\s\S]{0,180}Cache-Control['"],\s*['"]no-store['"]/);
});
