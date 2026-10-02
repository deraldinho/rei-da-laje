const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src/engine');
const load=file=>import(pathToFileURL(path.join(root,file)).href+`?t=${Date.now()}-${Math.random()}`);

function kite(controller){
 const k={x:300,y:400,z:90,vx:0,vy:0,vz:0,screenWidth:1080,screenHeight:1920,
  isAscending:false,spawnProtection:0,lineSlack:.5,rotation:0,chatAction:null};
 k.intentController=new controller(k);return k;
}

test('aliases de chat preservam os quatro controles oficiais',()=>{
 const GameRules=require('../backend/rules/gameRules');const rules=new GameRules();
 for(const value of ['puxar','1','sobe','puxa']) assert.equal(rules.parseChatCommand(value),'puxar');
 for(const value of ['descarregar','2','solta','linha']) assert.equal(rules.parseChatCommand(value),'descarregar');
 for(const value of ['embicar','3','bicar','vira']) assert.equal(rules.parseChatCommand(value),'embicar');
 for(const value of ['#pegar','pegar','#aparar','aparar']) assert.equal(rules.parseChatCommand(value),'pegar');
 assert.equal(rules.parseChatCommand('oi galera'),null);
});

test('puxar recolhe linha e descarregar libera sem teleporte',async()=>{
 const [{startChatAction,applyChatAction},{PlayerIntentController}]=await Promise.all([load('ChatControls.js'),load('physics/PlayerIntentController.js')]);
 const k=kite(PlayerIntentController),before={x:k.x,y:k.y,z:k.z};
 startChatAction(k,'puxar');assert.equal(applyChatAction(k,1),true);
 let intent=k.intentController.update(1/60,{x:1,y:0,z:0},[]);
 assert.ok(intent.spoolCommand<0&&intent.tensionAssist>0);assert.deepEqual({x:k.x,y:k.y,z:k.z},before);
 startChatAction(k,'descarregar');intent=k.intentController.update(1/60,{x:1.2,y:0,z:0},[]);
 assert.ok(intent.spoolCommand>0&&intent.tensionAssist<0);assert.deepEqual({x:k.x,y:k.y,z:k.z},before);
});

test('embicar gera torque e aparar abre defesa sem conceder buff',async()=>{
 const [{startChatAction},{PlayerIntentController}]=await Promise.all([load('ChatControls.js'),load('physics/PlayerIntentController.js')]);
 const k=kite(PlayerIntentController),beforeX=k.x,beforeY=k.y;
 startChatAction(k,'embicar');let intent=k.intentController.update(1/60,{x:-1,y:0,z:0},[]);
 assert.ok(intent.spoolCommand>0);assert.ok(intent.debicoTorque<0);assert.equal(k.x,beforeX);assert.equal(k.y,beforeY);
 assert.equal(k.powerMultiplier,undefined);
 startChatAction(k,'pegar');intent=k.intentController.update(1/60,{x:1,y:0,z:0},[]);
 assert.equal(k.intentController.currentAction,'aparar');assert.ok(intent.tensionAssist<0);
 assert.ok(k.defenseWindowRemaining>0);assert.equal(k.powerMultiplier,undefined);
});
