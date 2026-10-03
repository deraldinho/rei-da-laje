const test=require('node:test');
const assert=require('node:assert/strict');

test('piloto de bots ignora jogadores reais e espera fim da proteção',()=>{
 const SimulationBotPilot=require('../backend/simulationBotPilot');
 const events=[];const io={emit:(name,data)=>events.push({name,data})};
 const rules={activePlayers:new Map([
  ['real',{userId:'real',nickname:'Real',joinedAt:1000}],
  ['sim_a',{userId:'sim_a',nickname:'Bot A',joinedAt:1000,isSimulation:true}]
 ])};
 const pilot=new SimulationBotPilot(io,rules,{minAgeMs:3000});
 assert.equal(pilot.tick(3500),0);
 assert.equal(events.length,0);
 assert.equal(pilot.tick(4100),1);
 assert.equal(events.length,1);
 assert.equal(events[0].data.userId,'sim_a');
 assert.equal(events[0].data.simulation,true);
});

test('bots recebem fases físicas diferentes e estado removido é limpo',()=>{
 const SimulationBotPilot=require('../backend/simulationBotPilot');
 const events=[];const io={emit:(name,data)=>events.push({name,data})};
 const rules={activePlayers:new Map([
  ['sim_a',{userId:'sim_a',joinedAt:0,isSimulation:true}],
  ['sim_b',{userId:'sim_b',joinedAt:0,isSimulation:true}]
 ])};
 const pilot=new SimulationBotPilot(io,rules,{minAgeMs:0});
 assert.equal(pilot.tick(5000),2);
 assert.notEqual(events[0].data.giftName,events[1].data.giftName);
 rules.activePlayers.delete('sim_a');events.length=0;pilot.tick(6000);
 assert.equal(pilot.states.has('sim_a'),false);
 assert.equal(events.every(e=>e.data.userId==='sim_b'),true);
});

test('servidor agenda piloto apenas quando existe autoridade de física',()=>{
 const fs=require('node:fs');const path=require('node:path');
 const source=fs.readFileSync(path.resolve(__dirname,'../backend/server.js'),'utf8');
 assert.match(source,/SimulationBotPilot/);
 assert.match(source,/combatOwnerSocketId[\s\S]{0,240}simulationBotPilot\.tick/);
});
