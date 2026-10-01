const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const load=async file=>import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(path.join(__dirname,'../frontend/src/engine/',file),'utf8')).toString('base64'));

test('aliases de chat preservam os quatro controles oficiais',()=>{
  const GameRules=require('../backend/rules/gameRules');
  const rules=new GameRules();
  for(const value of ['puxar','1','sobe','puxa']) assert.equal(rules.parseChatCommand(value),'puxar');
  for(const value of ['descarregar','2','solta','linha']) assert.equal(rules.parseChatCommand(value),'descarregar');
  for(const value of ['embicar','3','bicar','vira']) assert.equal(rules.parseChatCommand(value),'embicar');
  for(const value of ['#pegar','pegar','#aparar','aparar']) assert.equal(rules.parseChatCommand(value),'pegar');
  assert.equal(rules.parseChatCommand('oi galera'),null);
});

test('puxar sobe a pipa e descarregar usa a direção do vento',async()=>{
  const {startChatAction,applyChatAction}=await load('ChatControls.js');
  const kite={x:300,y:400,screenWidth:1080,screenHeight:1920,isAscending:false,spawnProtection:0,lineSlack:.5,rotation:0,chatAction:null};
  startChatAction(kite,'puxar');
  const y=kite.y;
  assert.equal(applyChatAction(kite,1,{x:1,y:0,gust:1}),true);
  assert.ok(kite.y<y);
  startChatAction(kite,'descarregar');
  const x=kite.x;
  applyChatAction(kite,1,{x:1.2,y:0,gust:1});
  assert.ok(kite.x>x);
  assert.ok(kite.lineSlack>=.72);
});

test('embicar mergulha e aparar faz gancho curto sem conceder buff',async()=>{
  const {startChatAction,applyChatAction}=await load('ChatControls.js');
  const kite={x:300,y:400,screenWidth:1080,screenHeight:1920,isAscending:false,spawnProtection:0,lineSlack:0,rotation:0,chatAction:null};
  startChatAction(kite,'embicar');
  const y=kite.y;
  applyChatAction(kite,1,{x:-1,y:0,gust:1});
  assert.ok(kite.y>y);
  assert.equal(kite.powerMultiplier,undefined);
  startChatAction(kite,'pegar');
  const x=kite.x;
  applyChatAction(kite,1,{x:1,y:0,gust:1});
  assert.ok(kite.x<x);
  assert.equal(kite.powerMultiplier,undefined);
});
