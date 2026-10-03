const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');

test('bot ocioso não recebe manobra especial automática',()=>{
 const SimulationBotPilot=require('../backend/simulationBotPilot');const events=[];const io={emit:(name,data)=>events.push({name,data})};
 const rules={activePlayers:new Map([['sim_a',{userId:'sim_a',joinedAt:0,isSimulation:true}]])};
 const pilot=new SimulationBotPilot(io,rules,{minAgeMs:0});assert.equal(pilot.tick(5000),0);assert.equal(events.length,0);
});

test('servidor não agenda piloto automático de manobras para bots',()=>{
 const source=fs.readFileSync(path.resolve(__dirname,'../backend/server.js'),'utf8');
 assert.doesNotMatch(source,/simulationBotPilot\.tick/);assert.doesNotMatch(source,/new SimulationBotPilot/);
});