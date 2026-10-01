const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number(n)||0));

export function lineAngleFactor(a,b){
  const ax=(a.x||0)-(a.baseX||0), ay=(a.y||0)-(a.baseY||0);
  const bx=(b.x||0)-(b.baseX||0), by=(b.y||0)-(b.baseY||0);
  const al=Math.hypot(ax,ay)||1, bl=Math.hypot(bx,by)||1;
  const dot=clamp((ax*bx+ay*by)/(al*bl),-1,1);
  const sin=Math.sqrt(Math.max(0,1-dot*dot));
  return 0.45+sin*0.85;
}

export function evolveRelinhoContact(previous, a, b, now = Date.now()) {
  const state = !previous || previous.phase === 'RELEASE'
    ? { phase: 'CONTACT', startedAt: now, lastSeenAt: now, friction: 0 } : previous;
  const elapsed = Math.max(0, now - state.startedAt);
  const angle = lineAngleFactor(a, b);

  // Velocidade relativa vetorial:
  // Se as pipas vêm em sentidos opostos ou oblíquos, a velocidade relativa é a magnitude da diferença vetorial.
  const vxA = Number.isFinite(a.vx) ? a.vx : 0;
  const vyA = Number.isFinite(a.vy) ? a.vy : 0;
  const vxB = Number.isFinite(b.vx) ? b.vx : 0;
  const vyB = Number.isFinite(b.vy) ? b.vy : 0;
  const rvx = vxA - vxB;
  const rvy = vyA - vyB;
  const vectorRel = Math.hypot(rvx, rvy);
  const csA = Number.isFinite(a.contactSpeed) ? Math.abs(a.contactSpeed) : 0;
  const csB = Number.isFinite(b.contactSpeed) ? Math.abs(b.contactSpeed) : 0;
  const relative = Math.max(vectorRel, csA + csB);

  const tension = (clamp(a.lineTension, .05, 1) + clamp(b.lineTension, .05, 1)) / 2;

  // No primeiro toque (t=0), o delta é zero; nos quadros seguintes, dtSeconds é o intervalo exato
  const isNew = !previous || previous.phase === 'RELEASE';
  const dtSeconds = isNew
    ? 0
    : (previous && Number.isFinite(previous.lastSeenAt) && now > previous.lastSeenAt
        ? Math.min(0.2, (now - previous.lastSeenAt) / 1000)
        : (1 / 60));
  const dtFactor = dtSeconds * 60; // 1.0 a 60 FPS

  const frictionRate = 0.018 + angle * 0.012 + relative * 0.0015 + tension * 0.01;
  const friction = clamp(state.friction + frictionRate * dtFactor, 0, 1.5);

  return {
    ...state,
    phase: (elapsed >= 120 || friction >= .16) ? 'GRINDING' : 'CONTACT',
    lastSeenAt: now,
    friction,
    angleFactor: angle,
    relativeSpeed: relative
  };
}

export function applyLikeSpool(kite,likes=1){
  const count=clamp(likes,1,100);
  kite.likeSpool=clamp((kite.likeSpool||0)+Math.min(.45,.035*count),0,1);
  kite.likeSpoolRemaining=clamp((kite.likeSpoolRemaining||0)+.25+count*.025,0,2.8);
  kite.lineSlack=Math.max(kite.lineSlack||0,.25+kite.likeSpool*.6);
  kite.targetLineTension=Math.min(kite.targetLineTension??.58,.58-kite.likeSpool*.36);
  return kite.likeSpool;
}

export function updateLineControl(kite,delta){
  const seconds=Math.max(0,Math.min(3,Number(delta)||0))/60;
  kite.likeSpoolRemaining=Math.max(0,(kite.likeSpoolRemaining||0)-seconds);
  if(kite.likeSpoolRemaining<=0) kite.likeSpool=Math.max(0,(kite.likeSpool||0)-seconds*.7);
  if(kite.defenseWindowRemaining>0) kite.defenseWindowRemaining=Math.max(0,kite.defenseWindowRemaining-seconds);
  if(kite.chatCombo){
    kite.chatCombo.remaining=Math.max(0,kite.chatCombo.remaining-seconds);
    if(kite.chatCombo.remaining<=0) kite.chatCombo=null;
  }
  if(!kite.chatAction){
    const rest=.58-(kite.likeSpool||0)*.34;
    kite.targetLineTension=rest;
  }
  const target=clamp(kite.targetLineTension??.58,.12,1);
  const rate=Math.min(1,seconds*5.5);
  kite.lineTension=clamp((kite.lineTension??.58)+(target-(kite.lineTension??.58))*rate,.12,1);
  return kite.lineTension;
}
