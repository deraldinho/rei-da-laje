const rate=v=>Math.max(0,Number(v)||0);

export function classifyRelinhoDominance(contact={},ratioThreshold=1.22,minRate=1e-6){
  const damageOnA=rate(contact.abrasionRateA);
  const damageOnB=rate(contact.abrasionRateB);
  const peak=Math.max(damageOnA,damageOnB);
  if(peak<minRate)return {mode:'NONE',damageOnA,damageOnB,intensity:0};
  if(damageOnA>damageOnB*ratioThreshold){
    return {mode:'B_ATTACKS_A',damageOnA,damageOnB,intensity:(damageOnA-damageOnB)/peak};
  }
  if(damageOnB>damageOnA*ratioThreshold){
    return {mode:'A_ATTACKS_B',damageOnA,damageOnB,intensity:(damageOnB-damageOnA)/peak};
  }
  return {mode:'MUTUAL',damageOnA,damageOnB,intensity:1-Math.abs(damageOnA-damageOnB)/peak};
}

export function stampRelinhoVisualState(contact,now=Date.now(),durationMs=260){
  const state=classifyRelinhoDominance(contact);
  const a=contact?.kiteA,b=contact?.kiteB,until=now+Math.max(80,Number(durationMs)||260);
  if(!a||!b||state.mode==='NONE')return state;
  const set=(kite,role,other)=>{kite.relinhoVisual={role,againstId:String(other.userId??''),againstNick:String(other.nickname||''),intensity:state.intensity,until};};
  if(state.mode==='A_ATTACKS_B'){set(a,'attacker',b);set(b,'victim',a);}
  else if(state.mode==='B_ATTACKS_A'){set(b,'attacker',a);set(a,'victim',b);}
  else {set(a,'mutual',b);set(b,'mutual',a);}
  return state;
}
