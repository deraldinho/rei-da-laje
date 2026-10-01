/** Horários absolutos vêm do backend; nunca estender benefício ao recarregar a tela. */
export function benefitExpiry(expiresAt, durationSeconds, now = Date.now()) {
  const absolute = Number(expiresAt);
  if (Number.isFinite(absolute) && absolute > 0) return absolute;
  const seconds = Number(durationSeconds);
  return Number.isFinite(seconds) && seconds > 0 ? now + Math.min(86400,seconds)*1000 : 0;
}
export function benefitRemaining(expiresAt, now = Date.now()) {
  return Number.isFinite(expiresAt) ? Math.max(0, Math.ceil((expiresAt-now)/1000)) : 0;
}
export function formatBenefitTime(seconds) {
  const remaining = Math.max(0,Math.floor(Number(seconds)||0));
  const hours = Math.floor(remaining/3600),minutes=Math.floor(remaining%3600/60),secs=remaining%60;
  const p=n=>String(n).padStart(2,'0');
  return hours>0 ? `${hours}:${p(minutes)}:${p(secs)}` : `${p(minutes)}:${p(secs)}`;
}
export function benefitLabels(lineType, buffExpiry, specials, now = Date.now()) {
  const labels=[];
  const buff=benefitRemaining(buffExpiry,now);
  if (lineType && lineType!=='algodao' && buff>0) labels.push({name:{cerol:'🌹 CEROL',chile:'🍩 CHILE',kevlar:'🦫 KEVLAR'}[lineType]||'LINHA EXTRA',seconds:buff});
  for(const [ability,expiresAt] of Object.entries(specials||{})) {
    const seconds=benefitRemaining(expiresAt,now);
    if(seconds>0)labels.push({name:ability==='tornado'?'🌪 TORNADO':ability==='invulnerable'?'🦁 PROTEÇÃO':ability,seconds});
  }
  return labels;
}
