const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const GameRules=require('../backend/rules/gameRules');
const source=fs.readFileSync(path.join(__dirname,'../frontend/src/engine/ManeuverVisuals.js'),'utf8');
const visuals=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('ranking preserva cortes, sequência e categorias sem inventar liderança empatada',()=>{
 const rules=new GameRules(4);
 for(const userId of ['a','b','c'])rules.handlePlayerComment({userId,nickname:userId.toUpperCase()});
 assert.ok(rules.recordCut('a','c'));
 rules.handlePlayerComment({userId:'c',nickname:'C'});
 assert.ok(rules.recordCut('b','c'));
 assert.equal(rules.leaderId,null);
 assert.equal(rules.sessionRanking()[0].cuts,1);
 assert.equal(rules.sessionHighlights().cuts.cuts,1);
 rules.recordGift('a',2,10);
 assert.equal(rules.sessionHighlights().gifts.gifts,2);
 assert.equal(rules.sessionHighlights().gifts.diamonds,20);
 rules.handlePlayerComment({userId:'c',nickname:'C'});
 assert.ok(rules.recordCut('a','c'));
 assert.equal(rules.leaderId,'a');
 assert.equal(rules.sessionHighlights().streak.bestStreak,2);
 assert.equal(rules.sessionHighlights().kingCuts?.kingCuts || 0,0);
 for(let i=0;i<3;i++){
  rules.handlePlayerComment({userId:'c',nickname:'C'});
  assert.ok(rules.recordCut('a','c'));
 }
 assert.equal(rules.kingId,'a');
 assert.equal(rules.activePlayers.get('a').isKing,true);
 rules.handlePlayerComment({userId:'c',nickname:'C'});
 assert.ok(rules.recordCut('c','a'));
 assert.equal(rules.kingId,'c');
 assert.equal(rules.sessionHighlights().kingCuts.userId,'c');
 assert.equal(rules.sessionHighlights().kingCuts.kingCuts,1);
});

test('cinco manobras produzem poses temporárias diferentes e revertem ao normal',async()=>{
 const {maneuverPose}=await visuals;
 const types=['retao','despicar','perseguir','aparar_retao','aparar_despicada'];
 const poses=types.map(name=>maneuverPose({name,duration:3,remaining:2},0.7));
 for(const pose of poses){assert.ok(pose.glow>0);assert.ok(pose.scale>=1);assert.ok(pose.label);}
 assert.ok(poses[0].trail>poses[3].trail);
 assert.ok(poses[1].angle>poses[2].angle);
 assert.ok(poses[3].glow>poses[0].glow);
 assert.ok(poses[4].angle<0);
 const idle=maneuverPose(null,0);
 const expired=maneuverPose({name:'retao',duration:2,remaining:0},5);
 assert.deepEqual(expired,idle);
 assert.equal(idle.angle,0);assert.equal(idle.scale,1);assert.equal(idle.trail,0);
});

test('aparadas geram intenção defensiva curta sem teleporte nem HP extra',async()=>{
 const {applyManeuverMovement,maneuverStats}=await import(require('node:url').pathToFileURL(path.join(__dirname,'../frontend/src/engine/Maneuvers.js')).href);
 const {PlayerIntentController}=await import('../frontend/src/engine/physics/PlayerIntentController.js');
 for(const name of ['aparar_retao','aparar_despicada']){
  const maneuver=maneuverStats(name,1,1);maneuver.remaining=maneuver.duration-.5;
  const kite={x:400,y:500,screenWidth:1080,screenHeight:1920,isAscending:false,spawnProtection:0,maneuver};kite.intentController=new PlayerIntentController(kite);
  const before={x:kite.x,y:kite.y};assert.equal(applyManeuverMovement(kite,[kite],1),true);
  const intent=kite.intentController.update(1/60,{x:.2,y:0},[kite]);assert.ok(intent.tensionAssist<0);assert.deepEqual({x:kite.x,y:kite.y},before);
 }
});

test('novas manobras autênticas brasileiras possuem poses 3D ricas e física balanceada', async()=>{
 const {maneuverPose}=await visuals;
 const newTypes=['tenteio','largada','mergulho_parafuso','lacada'];
 for(const name of newTypes){
   const pose=maneuverPose({name,duration:4,remaining:3},1.2);
   assert.ok(pose.glow>0, `${name} deve ter brilho ativo`);
   assert.ok(pose.scale>=1, `${name} deve ter escala >= 1`);
   assert.equal(pose.label, name);
   assert.ok(pose.color>0);
   assert.ok(typeof pose.pitch3D === 'number');
   assert.ok(typeof pose.roll3D === 'number');
 }

 // Mergulho parafuso ativa giro contínuo 3D (spin3D) e rastro intenso
 const parafuso=maneuverPose({name:'mergulho_parafuso',duration:4,remaining:3},1.5);
 assert.equal(parafuso.spin3D, true);
 assert.ok(parafuso.trail >= 1.0);
 assert.ok(parafuso.pitch3D < 0, 'parafuso deve apontar bico para baixo');

 // Largada alivia a linha com cauda relaxada
 const largada=maneuverPose({name:'largada',duration:3,remaining:2},1.0);
 assert.ok(largada.pitch3D > 0, 'largada deve empinar suavemente para trás');

 // Física das novas manobras é expressa por intenção, não coordenadas roteirizadas.
 const {applyManeuverMovement,maneuverStats}=await import(require('node:url').pathToFileURL(path.join(__dirname,'../frontend/src/engine/Maneuvers.js')).href);
 const {PlayerIntentController}=await import('../frontend/src/engine/physics/PlayerIntentController.js');
 for(const name of newTypes){
   const maneuver=maneuverStats(name,1,1);assert.ok(maneuver);maneuver.remaining=maneuver.duration-.5;
   const targetKite={x:450,y:480,isAscending:false,spawnProtection:0};
   const kite={x:400,y:500,screenWidth:1080,screenHeight:1920,isAscending:false,spawnProtection:0,maneuver};kite.intentController=new PlayerIntentController(kite);
   const before={x:kite.x,y:kite.y};assert.equal(applyManeuverMovement(kite,[kite,targetKite],1,{x:.2,y:0}),true);
   const intent=kite.intentController.update(1/60,{x:.2,y:0},[kite,targetKite]);assert.ok(intent.spoolCommand!==0||intent.debicoTorque!==0||intent.trimPitch!==0);
   assert.deepEqual({x:kite.x,y:kite.y},before,`${name} não pode teleportar`);
 }
});
