import {spawn} from 'node:child_process';
import {writeFile, mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.join(root,'tests','evidence');
await mkdir(evidence,{recursive:true});
const port = 3107, debugPort = 9337;
const server = spawn(process.execPath,['backend/server.js'],{cwd:root,env:{...process.env,
  PORT:String(port),PIPA_DISABLE_TIKTOK_AUTOCONNECT:'1',
  PIPA_FRONTEND_DIST:path.join(root,'frontend','dist-preview'),
  PIPA_ARENA_STATE_FILE:path.join(process.env.TEMP,'pipa-browser-smoke-'+Date.now()+'.json')},stdio:'ignore'});
let browser, ws;
const pause = ms => new Promise(r=>setTimeout(r,ms));
async function waitFor(url) {
  for(let i=0;i<60;i++) { try { const r=await fetch(url); if(r.ok)return r; } catch {} await pause(200); }
  throw Error('Timeout: '+url);
}
let seq=0;
const pending = new Map(), errors=[];
async function send(method,params={}) {
  const id=++seq;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},15000);
    pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression) {
  const out=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(out.exceptionDetails)throw Error(JSON.stringify(out.exceptionDetails));
  return out.result.value;
}
async function shot(name) {
  const out=await send('Page.captureScreenshot',{format:'png'});
  await writeFile(path.join(evidence,name+'.png'),Buffer.from(out.data,'base64'));
}
async function comment(userId,nickname=userId,profilePictureUrl='') {
  await fetch('http://127.0.0.1:'+port+'/api/simulate/comment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId,nickname,profilePictureUrl,comment:'entrar'})});
}
try {
  await waitFor('http://127.0.0.1:'+port+'/admin');
  browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',[
    '--headless=new','--no-first-run','--no-default-browser-check',
    '--use-angle=swiftshader','--enable-unsafe-swiftshader',
    '--remote-debugging-port='+debugPort,
    '--user-data-dir='+path.join(process.env.TEMP,'pipa-qa-'+Date.now()),'about:blank'
  ],{stdio:'ignore'});
  const tabs=await (await waitFor('http://127.0.0.1:'+debugPort+'/json')).json();
  ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=event=>{
    const msg=JSON.parse(event.data);
    if(msg.id){const p=pending.get(msg.id);if(p){pending.delete(msg.id);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}}
    if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails);
  };
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port});
  for(let i=0;i<60;i++){if(await evaluate('!!window.__PIPA_GAME__?.socket.connected'))break;await pause(200);}
  assert.equal(await evaluate('!!window.__PIPA_GAME__?.socket.connected'),true);
  for(let i=0;i<30;i++){if(await evaluate('window.__PIPA_GAME__.isCombatAuthority'))break;await pause(100);}
  assert.equal(await evaluate('window.__PIPA_GAME__.isCombatAuthority'),true);
  assert.ok(await evaluate('document.getElementById("tiktokLiveStatus") !== null'));
  await shot('desktop-empty');
  await evaluate('window.__PIPA_GAME__.app.ticker.stop()');
  for(let i=0;i<40;i++)await comment('qa_'+i,i===0?'<img src=x onerror=alert(1)>':'Pipa '+String(i+1).padStart(2,'0'),i===0?'https://cdn.test/avatar.png':'');
  await pause(300);
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.size'),40);
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").nickname'),'<img src=x onerror=alert(1)>');
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").profilePictureUrl'),'https://cdn.test/avatar.png');
  await pause(100);
  assert.ok(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").rooftopPlayer.children.length>=3'));
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").rooftopPlayer.initial.visible'),true);
  await comment('qa_0','Avatar Atualizado','https://cdn.test/avatar2.png');
  await pause(100);
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").profilePictureUrl'),'https://cdn.test/avatar2.png');
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").nickname'),'Avatar Atualizado');
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").rooftopPlayer.initial.visible'),true);
  assert.equal(await evaluate('document.querySelectorAll("#leaderboardList .leader-name img").length'),0);
  // Restaurar uma arena com 40 pipas e HP parcial sem perda de participantes.
  await evaluate('window.__PIPA_GAME__.kites.get("qa_0").lineHP=41;window.__PIPA_GAME__.kites.get("qa_0").updateHPBar();window.__PIPA_GAME__.saveArenaCheckpoint()');
  const beforeReload = await evaluate('({baseX:window.__PIPA_GAME__.kites.get("qa_0").baseX,targetX:window.__PIPA_GAME__.kites.get("qa_0").targetX,targetY:window.__PIPA_GAME__.kites.get("qa_0").targetY})');
  await pause(450);
  await send('Page.reload',{ignoreCache:true});
  for(let i=0;i<60;i++){if(await evaluate('window.__PIPA_GAME__?.kites.size===40'))break;await pause(200);}
  assert.equal(await evaluate('window.__PIPA_GAME__?.kites.size'),40);
  assert.ok(Math.abs((await evaluate('window.__PIPA_GAME__.kites.get("qa_0").lineHP'))-41)<0.1);
  const afterReload = await evaluate('({baseX:window.__PIPA_GAME__.kites.get("qa_0").baseX,targetX:window.__PIPA_GAME__.kites.get("qa_0").targetX,targetY:window.__PIPA_GAME__.kites.get("qa_0").targetY})');
  assert.ok(Math.abs(beforeReload.baseX-afterReload.baseX)<0.1);
  assert.ok(Math.abs(beforeReload.targetX-afterReload.targetX)<0.1);
  assert.ok(Math.abs(beforeReload.targetY-afterReload.targetY)<0.1);
  await evaluate('window.__PIPA_GAME__.app.ticker.stop()');
  for(let i=0;i<5;i++)await comment('queued');
  await evaluate(`[...window.__PIPA_GAME__.kites.values()].forEach((k,i)=>{k.x=310+(i%8)*110;k.y=155+Math.floor(i/8)*70;k.isAscending=false;k.spawnProtection=0;});window.__PIPA_GAME__.app.render()`);
  await shot('desktop-40-kites');
  await fetch('http://127.0.0.1:'+port+'/api/simulate/gift',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:'qa_0',giftName:'CAPIVARA',repeatCount:3})});
  await fetch('http://127.0.0.1:'+port+'/api/simulate/likes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({count:50})});
  await pause(200);
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").shieldCount'),6);
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").maneuver.name'), 'aparar_retao');
  assert.ok(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").maneuver.remaining<=45'));
  assert.ok(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").buffExpiresAt-Date.now()<=45000'));
  await evaluate('window.__PIPA_GAME__.kites.get("qa_0").updateBenefitCountdown()');
  assert.ok(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").benefitText.text.includes("KEVLAR")'));
  assert.ok(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").benefitText.text.includes("APARAR")'));
  assert.ok(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").buffExpiresAt>Date.now()'));
  assert.ok(await evaluate('document.querySelector("#giftCelebration").textContent.includes("CAPIVARA")'));
  assert.equal(await evaluate('document.querySelector("#giftCelebration").hidden'),false);
  assert.ok(await evaluate('window.__PIPA_GAME__.giftShowcase.effects.length>0'));
  assert.ok(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").rooftopPlayer.celebrationRemaining>0'));
  await evaluate('window.__PIPA_GAME__.kites.get("qa_0").updateManeuverVisual(1)');
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").maneuverLabel.visible'),true);
  assert.ok(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").maneuverGlow.geometry.graphicsData.length>0'));
  const maneuverVisuals=await evaluate(`(()=>{const k=window.__PIPA_GAME__.kites.get('qa_0');
    return ['retao','despicar','perseguir','aparar_retao','aparar_despicada'].map(name=>{
      k.setManeuver({name,duration:3});k.maneuver.remaining=2;k.updateManeuverVisual(1);
      return {name,visible:k.maneuverLabel.visible,rotation:k.bodyGraphic.rotation,glow:k.maneuverGlow.geometry.graphicsData.length};
    });})()`);
  assert.equal(maneuverVisuals.length,5);
  assert.ok(maneuverVisuals.every(v=>v.visible && v.glow>0));
  assert.ok(maneuverVisuals.some(v=>v.rotation>0));
  assert.ok(maneuverVisuals.some(v=>v.rotation<0));
  await evaluate('window.__PIPA_GAME__.refreshCompetitionStats()');
  await pause(150);
  assert.ok(await evaluate('document.querySelector("#hallOfFame .hall-row") !== null'));
  assert.ok(await evaluate('document.querySelector("#leaderboardList .competition-rank") !== null'));
  assert.ok(await evaluate('document.querySelector("#maneuverToast") !== null'));
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").likeBoostRemaining'),30);
  await fetch('http://127.0.0.1:'+port+'/api/simulate/gift',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({userId:'qa_0',giftId:882244,giftName:'Presente-surpresa',diamondCount:90,repeatCount:2,iconUrl:'https://cdn.test/gift.png'})});
  await pause(150);
  assert.ok((await (await fetch('http://127.0.0.1:'+port+'/api/gifts/catalog')).json()).gifts.some(g=>g.id==='882244'));
  assert.ok(await evaluate('window.__PIPA_GAME__.giftShowcase.effects.some(e=>e.theme.name==="Presente-surpresa")'));
  assert.ok(await evaluate('window.__PIPA_GAME__.giftShowcase.effects.some(e=>e.theme.iconUrl==="https://cdn.test/gift.png")'));
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").lineType'),'kevlar');

  // Rajada visual: filas/effects devem permanecer limitados e não alterar gameplay de presente desconhecido.
  await Promise.all(Array.from({length:60},(_,i)=>fetch('http://127.0.0.1:'+port+'/api/simulate/gift',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({userId:'qa_'+(i%40),giftId:970000+i,giftName:'Rajada '+i,diamondCount:1,repeatCount:1})
  })));
  await pause(300);
  assert.ok(await evaluate('window.__PIPA_GAME__.giftShowcase.effects.length<=4'));
  assert.ok(await evaluate('window.__PIPA_GAME__.hud.giftQueue.length<=8'));
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").lineType'),'kevlar');
  const stormCatalog=await (await fetch('http://127.0.0.1:'+port+'/api/gifts/catalog')).json();
  assert.ok(stormCatalog.gifts.filter(g=>String(g.id).startsWith('970')).length>=60);
  assert.equal(await evaluate('document.querySelector(".commands").textContent.includes("PUXAR")'),false);
  await fetch('http://127.0.0.1:'+port+'/api/simulate/gift',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:'qa_0',giftName:'Perfume'})});
  await fetch('http://127.0.0.1:'+port+'/api/simulate/gift',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:'qa_0',giftName:'Leão'})});
  await pause(200);
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").lineType'),'kevlar');
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").isInvulnerable'),true);
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").specials.tornado'),45);
  await evaluate('window.__PIPA_GAME__.kites.get("qa_0").updateBenefitCountdown()');
  assert.ok(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").benefitText.text.includes("TORNADO")'));
  assert.ok(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").benefitText.text.includes("PROTEÇÃO")'));
  // Contato visual da linha não altera a geometria lógica usada pelo Physics.
  await evaluate('(()=>{const k=window.__PIPA_GAME__.kites.get("qa_0");k.line.triggerContact(1,500);const pv=k.line.parent?.visible;if(k.line.parent)k.line.parent.visible=true;k.line.update(k.x,k.y,k.visualScale);if(k.line.parent)k.line.parent.visible=pv;})()');
  assert.ok(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").line.contactUntil>performance.now()'));
  assert.ok(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").line.geometry.graphicsData.length>0'));
  // Registro de corte pela tela autorizada atualiza TOP 5, recorde e destaque de liderança.
  await evaluate('(()=>{const game=window.__PIPA_GAME__;const a=game.kites.get("qa_0"),b=game.kites.get("qa_1");b.x=a.x;b.y=a.y;if(b.rope)b.rope.resetPositions({x:b.baseX,y:b.baseY,z:0},{x:b.x,y:b.y,z:0});if(a.rope)a.rope.resetPositions({x:a.baseX,y:a.baseY,z:0},{x:a.x,y:a.y,z:0});game.handleCutSuccess(a,b,a.x,a.y);})()');
  await pause(400);
  assert.ok(await evaluate('window.__PIPA_GAME__.sparks.cutBursts.length>0'));
  assert.ok(await evaluate('window.__PIPA_GAME__.fallingKites.length>0'));
  assert.ok(await evaluate('["VOADA","CORTADA"].some(w=>window.__PIPA_GAME__.fallingKites.at(-1).tagText.text.includes(w))'));
  await pause(300);
  await evaluate('window.__PIPA_GAME__.refreshCompetitionStats()');
  await pause(200);
  assert.equal(await evaluate('document.querySelector("#leaderboardList .competition-rank .leader-name").textContent'),'Avatar Atualizado');
  assert.ok(await evaluate('document.querySelector("#leaderboardList .competition-rank .leader-cuts").textContent.includes("1")'));
  assert.ok(await evaluate('document.querySelector("#sessionRecord").textContent.includes("1 CORTES")'));
  assert.ok(await evaluate('document.querySelector("#activeKing").textContent.includes("LÍDER ATUAL")'));
  assert.equal(await evaluate('document.querySelectorAll("#leaderboardList .leader-name img").length'),0);
  const behavior=await evaluate(`(() => {
    const game=window.__PIPA_GAME__, k=game.kites.get('qa_0'), before={x:k.x,y:k.y};
    for(let i=0;i<300;i++) k.update(1,i/60);
    return {moved:Math.hypot(k.x-before.x,k.y-before.y)>20,tornadoExpired:k.specials.tornado===0,protected:k.isInvulnerable};
  })()`);
  assert.equal(behavior.moved,true);assert.equal(behavior.tornadoExpired,false);assert.equal(behavior.protected,true);
  await evaluate('(()=>{const k=window.__PIPA_GAME__.kites.get("qa_0");k.specialExpiresAt.tornado=Date.now()-10;k.update(1,0);})()');
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").specials.tornado'),0);

  // Resolução real do monitor/OBS informada pelo usuário: 1440 x 2560 a 100%.
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:2560,deviceScaleFactor:1,mobile:false});
  await pause(250);
  await evaluate('window.__PIPA_GAME__.app.render()');
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").screenWidth'),1440);
  const flexWrap = await evaluate('getComputedStyle(document.querySelector(".commands.gift-guide")).flexWrap');
  assert.ok(['wrap', 'nowrap'].includes(flexWrap), 'flexWrap deve ser wrap ou nowrap responsivo');
  await evaluate(`(()=>{
    const leader=document.getElementById('leadershipBanner'),gift=document.getElementById('giftCelebration'),
      notice=document.getElementById('competitionNotice'),maneuver=document.getElementById('maneuverToast');
    [leader,gift,notice,maneuver].forEach(el=>{if(el)el.hidden=false;});
    notice.textContent='SEQUÊNCIA DE CORTES!';maneuver.textContent='⚡ MANOBRA ATIVA';
  })()`);
  const lanes=await evaluate(`(()=>{
    const ids=['leadershipBanner','giftCelebration','competitionNotice','maneuverToast'];
    return ids.map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,top:r.top,bottom:r.bottom,height:r.height};});
  })()`);
  const lanesSorted=[...lanes].sort((a,b)=>a.top-b.top);
  for(let i=1;i<lanesSorted.length;i++) assert.ok(lanesSorted[i-1].bottom+8<lanesSorted[i].top,
    'banners centrais sobrepostos: '+JSON.stringify(lanesSorted));
  const layout1440=await evaluate(`(()=>{
    const game=window.__PIPA_GAME__,footer=document.querySelector('.arena-footer').getBoundingClientRect();
    const player=game.kites.get('qa_0').rooftopPlayer;
    return {footerTop:footer.top,footerHeight:footer.height,playerBaseY:player.y,
      playerTop:player.y-82*player.scale.y,stageW:game.app.screen.width,stageH:game.app.screen.height};
  })()`);
  assert.equal(layout1440.stageW,1440);assert.equal(layout1440.stageH,2560);
  assert.ok(layout1440.footerTop>layout1440.playerBaseY+25,
    'barra inferior invadiu a faixa dos bonequinhos em 1440x2560: '+JSON.stringify(layout1440));
  assert.ok(layout1440.playerTop>layout1440.stageH*0.82 &&
    layout1440.playerBaseY>layout1440.stageH*0.88 && layout1440.playerBaseY<layout1440.stageH*0.96,
    'laje/bonequinhos fora da faixa vertical esperada: '+JSON.stringify(layout1440));
  const rooftop1440=await evaluate(`(()=>{
    const players=[...window.__PIPA_GAME__.kites.values()].map(k=>k.rooftopPlayer);
    return {rows:[...new Set(players.map(p=>p.y.toFixed(1)))].length,
      nicknamesVisible:players.filter(p=>p.nicknameText?.visible).length,
      minX:Math.min(...players.map(p=>p.x)),maxX:Math.max(...players.map(p=>p.x))};
  })()`);
  assert.equal(rooftop1440.rows,2);
  assert.equal(rooftop1440.nicknamesVisible,0);
  assert.ok(rooftop1440.minX>50 && rooftop1440.maxX<1390);
  await shot('portrait-1440x2560');

  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});
  await pause(200);
  await evaluate('window.__PIPA_GAME__.app.render()');
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.get("qa_0").screenWidth'),390);
  const flexWrapMobile = await evaluate('getComputedStyle(document.querySelector(".commands.gift-guide")).flexWrap');
  assert.ok(['wrap', 'nowrap'].includes(flexWrapMobile), 'flexWrap deve ser wrap ou nowrap responsivo no mobile');
  await shot('portrait-40-kites');
  await evaluate('document.querySelector("#btnToggleScene").click();window.__PIPA_GAME__.app.render()');
  assert.equal(await evaluate('window.__PIPA_GAME__.skyScene.isTransparent'),true);
  await shot('overlay');
  await evaluate('window.__PIPA_GAME__.app.ticker.start()');
  await pause(4500);
  const health=await (await fetch('http://127.0.0.1:'+port+'/api/competition/health')).json();
  assert.equal(health.combat.authorityActive,true);
  assert.ok(health.savedAt);
  const arena=await (await fetch('http://127.0.0.1:'+port+'/api/competition/arena')).json();
  assert.ok(arena.sessionId);
  const state=await evaluate('({count:window.__PIPA_GAME__.kites.size,particles:window.__PIPA_GAME__.sparks.particles.length,fps:window.__PIPA_GAME__.app.ticker.FPS})');
  assert.ok(state.particles<=350);
  assert.equal(errors.length,0,JSON.stringify(errors));
  await shot('portrait-combat');
  const report={passed:true,tests:['boot','40 pipas','DOM seguro','checkpoint e restauração após reload de teste','executor único de combate','combo 3x Capivara','manobra de aparar','likes','resize portrait','overlay','combate sem exceções'],state,errors};
  await writeFile(path.join(evidence,'browser-report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally {
  if(ws?.readyState===1){try{await send('Browser.close');}catch{}ws.close();}
  browser?.kill();server.kill();
}
