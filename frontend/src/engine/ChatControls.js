/** Controles curtos vindos do chat. O voo, a tensão e as janelas de defesa são físicas. */
function recordChatCombo(kite,action,now=Date.now()) {
  kite.commandHistory=(kite.commandHistory||[]).filter(x=>now-x.at<=1400);
  kite.commandHistory.push({action,at:now});
  if(kite.commandHistory.length>3)kite.commandHistory.shift();
  const seq=kite.commandHistory.map(x=>x.action).join('>');
  let combo=null;
  if(seq.endsWith('descarregar>embicar>puxar')) combo={name:'estilingue',attack:1.18,defense:1,duration:1.5};
  else if(seq.endsWith('puxar>pegar')) combo={name:'trava',attack:1,defense:.76,duration:1.2};
  else if(seq.endsWith('descarregar>puxar')) combo={name:'puxada_seca',attack:1.12,defense:.95,duration:1.15};
  if(combo) kite.chatCombo={...combo,remaining:combo.duration};
  return combo;
}

export const CHAT_ACTION_DURATION = Object.freeze({
  puxar: 1.15,
  descarregar: 1.35,
  embicar: 0.95,
  pegar: 1.0
});

export function startChatAction(kite, action) {
  if (!kite || !CHAT_ACTION_DURATION[action]) return false;
  const combo=recordChatCombo(kite,action);
  kite.chatAction = {
    name: action,
    duration: CHAT_ACTION_DURATION[action],
    remaining: CHAT_ACTION_DURATION[action],
    direction: 0,
    combo:combo?.name||null
  };
  if(action==='puxar') kite.targetLineTension=combo?.name==='puxada_seca'||combo?.name==='estilingue'?1:.94;
  else if(action==='descarregar') kite.targetLineTension=.2;
  else if(action==='embicar') kite.targetLineTension=.48;
  else if(action==='pegar'){kite.targetLineTension=.82;kite.defenseWindowRemaining=Math.max(kite.defenseWindowRemaining||0,.9);}

  // Acoplamento com PlayerIntentController e LiveInputBuffer (P11/P12)
  if (kite.intentController) {
    const intensity = combo ? (combo.attack || 1.2) : 1.0;
    kite.intentController.triggerAction(action, CHAT_ACTION_DURATION[action], { intensity });
  }
  if (kite.inputBuffer) {
    kite.inputBuffer.addComment(action, kite.nickname);
  }
  return true;
}

export function applyChatAction(kite, delta, wind={x:0,y:0,gust:1}) {
  const action=kite?.chatAction;
  if(!action || kite.isAscending || kite.spawnProtection>0 || action.remaining<=0) return false;
  const step=Math.min(3,Math.max(0,Number(delta)||0));
  const wx=Number(wind?.x)||0, gust=Math.max(.6,Number(wind?.gust)||1);
  const dir=Math.abs(wx)>.06?Math.sign(wx):(action.direction||1);
  action.direction=dir;
  const elapsed=action.duration-action.remaining;
  const progress=Math.min(1,Math.max(0,elapsed/action.duration));

  // Aplica aceleração vetorial e ajuste contínuo suave
  if(action.name==='puxar'){
    kite.y -= 2.45 * step;
    kite.x -= dir * 0.32 * step;
    kite.vy = (kite.vy || 0) - 1.8 * step;
    kite.vx = (kite.vx || 0) - dir * 0.4 * step;
    kite.lineSlack = Math.max(0, (kite.lineSlack || 0) - 0.24 * step);
    kite.rotation = Math.max(-0.5, Math.min(0.5, -dir * 0.13));
  }else if(action.name==='descarregar'){
    kite.lineSlack = Math.max(kite.lineSlack || 0, 0.72);
    kite.x += dir * (1.7 + Math.abs(wx) * 0.75) * gust * step;
    kite.y += (0.35 + Math.max(0, Number(wind?.y) || 0) * 0.18) * step;
    kite.vx = (kite.vx || 0) + dir * (1.2 + Math.abs(wx) * 0.5) * gust * step;
    kite.vy = (kite.vy || 0) + (0.35 + Math.max(0, Number(wind?.y) || 0) * 0.18) * step;
    kite.rotation = Math.max(-0.5, Math.min(0.5, dir * 0.24));
  }else if(action.name==='embicar'){
    const bite = 1 - Math.abs(progress * 2 - 1);
    kite.x += dir * (1.9 + Math.abs(wx) * 0.6) * step;
    kite.y += (1.25 + 0.75 * bite) * step;
    kite.vx = (kite.vx || 0) + dir * (1.4 + Math.abs(wx) * 0.4) * step;
    kite.vy = (kite.vy || 0) + (1.1 + 0.6 * bite) * step;
    kite.lineSlack = Math.max(kite.lineSlack || 0, 0.38 + 0.34 * bite);
    kite.rotation = Math.max(-0.7, Math.min(0.7, dir * (0.38 + 0.22 * bite)));
    kite.contactSpeed = Math.max(kite.contactSpeed || 0, 10 + 8 * bite);
  }else if(action.name==='pegar'){
    const hook = Math.sin(progress * Math.PI);
    kite.x += -dir * (1.15 + 0.9 * hook) * step;
    kite.y -= 0.42 * hook * step;
    kite.vx = (kite.vx || 0) - dir * (0.9 + 0.7 * hook) * step;
    kite.vy = (kite.vy || 0) - 0.35 * hook * step;
    kite.lineSlack = Math.max(0, (kite.lineSlack || 0) - 0.18 * step);
    kite.rotation = Math.max(-0.55, Math.min(0.55, -dir * 0.34 * hook));
  }

  action.remaining=Math.max(0,action.remaining-step/60);
  if(action.remaining<=0){kite.chatAction=null;if((kite.likeSpoolRemaining||0)<=0)kite.targetLineTension=.58;}
  kite.x=Math.min(kite.screenWidth-30,Math.max(30,kite.x));
  kite.y=Math.min(kite.screenHeight*.65,Math.max(40,kite.y));
  return true;
}
