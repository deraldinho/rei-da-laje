import { normalizePhysicalAction } from './physics/PlayerIntentController.js';

function recordChatCombo(kite,action,now=Date.now()){
  kite.commandHistory=(kite.commandHistory||[]).filter(x=>now-x.at<=1400);
  kite.commandHistory.push({action,at:now});
  if(kite.commandHistory.length>3)kite.commandHistory.shift();
  const seq=kite.commandHistory.map(x=>x.action).join('>');
  let combo=null;
  if(seq.endsWith('descarregar>despicar>puxar'))combo={name:'estilingue',attack:1.18,defense:1,duration:1.5};
  else if(seq.endsWith('puxar>aparar'))combo={name:'trava',attack:1,defense:.76,duration:1.2};
  else if(seq.endsWith('descarregar>puxar'))combo={name:'puxada_seca',attack:1.12,defense:.95,duration:1.15};
  if(combo)kite.chatCombo={...combo,remaining:combo.duration};
  return combo;
}

export const CHAT_ACTION_DURATION=Object.freeze({
  puxar:1.15,
  descarregar:1.35,
  despicar:.95,
  tenteio:1.15,
  aparar:1.0
});

export function startChatAction(kite,action){
  if(!kite)return false;
  const canonical=normalizePhysicalAction(action);
  const duration=CHAT_ACTION_DURATION[canonical];
  if(!duration)return false;
  const combo=recordChatCombo(kite,canonical);
  kite.chatAction={name:canonical,duration,remaining:duration,combo:combo?.name||null};
  if(canonical==='aparar')kite.defenseWindowRemaining=Math.max(kite.defenseWindowRemaining||0,.9);
  kite.intentController?.triggerAction(canonical,duration,{intensity:combo?.attack||1});
  return true;
}

export function applyChatAction(kite,delta){
  const action=kite?.chatAction;
  if(!action||kite.isAscending||kite.spawnProtection>0||action.remaining<=0)return false;
  const step=Math.min(3,Math.max(0,Number(delta)||0));
  action.remaining=Math.max(0,action.remaining-step/60);
  if(action.remaining<=0)kite.chatAction=null;
  return true;
}
