/** Benefícios por presentes e manobras paulistas autênticas */
export const MANEUVERS = Object.freeze({
  retao: { duration: 30, maxDuration: 45, reach: 240, speed: 1.55, damage: 1.25 },
  mergulho: { duration: 30, maxDuration: 45, reach: 220, speed: 1.50, damage: 1.22 },
  relo_lateral: { duration: 45, maxDuration: 45, reach: 200, speed: 1.30, damage: 1.15, defense: 0.60 },
  despicar: { duration: 30, maxDuration: 45, reach: 180, speed: 1.35, damage: 1.18 },
  mestre_do_ceu: { duration: 45, maxDuration: 45, reach: 320, speed: 1.65, damage: 1.25, defense: 0.50 },
  perseguir: { duration: 45, maxDuration: 45, reach: 230, speed: 1.1, damage: 1.04 },
  aparar_retao: { duration: 45, maxDuration: 45, reach: 150, speed: 1, defense: 0.65 },
  aparar_despicada: { duration: 45, maxDuration: 45, reach: 165, speed: 1, defense: 0.6 },
  tenteio: { duration: 35, maxDuration: 45, reach: 180, speed: 1.15, damage: 1.20 },
  largada: { duration: 30, maxDuration: 45, reach: 120, speed: 0.95, defense: 0.55 },
  mergulho_parafuso: { duration: 35, maxDuration: 45, reach: 210, speed: 1.30, damage: 1.18 },
  lacada: { duration: 40, maxDuration: 45, reach: 220, speed: 1.22, damage: 1.15 }
});

export function selectGiftManeuver(giftName) {
  const name = String(giftName || '').trim().toLowerCase();
  if (name === 'mergulho' || name === 'mergulho vertical') return 'mergulho';
  if (name === 'relo_lateral' || name === 'lateral' || name === 'relo' || name === 'relo lateral') return 'relo_lateral';
  if (name === 'mestre_do_ceu' || name === 'mestre' || name === 'mestre do ceu') return 'mestre_do_ceu';
  if (name === 'leao' || name === ('le'+String.fromCharCode(227)+'o') || name === 'universo') return 'aparar_despicada';
  if (name === 'retao' || name === 'retão' || name === 'retao paulista' || name === 'rosa' || name === 'flor') return 'retao';
  if (name === 'donut' || name === 'despicar' || name === 'despicada' || name === 'desbicada') return 'despicar';
  if (name === 'capivara') return 'aparar_retao';
  if (name === 'perfume') return 'perseguir';
  if (name === 'voadora' || name === 'puxao' || name === 'puxão') return 'retao';
  if (name === 'cafe' || name === 'café' || name === 'pipoca') return 'tenteio';
  if (name === 'coracao' || name === 'coração' || name === 'balão' || name === 'balao') return 'largada';
  if (name === 'foguete' || name === 'trovao' || name === 'trovão' || name === 'raio') return 'mergulho_parafuso';
  if (name === 'coroa' || name === 'dragao' || name === 'dragão' || name === 'diamante') return 'lacada';
  if (MANEUVERS[name]) return name;
  return null;
}

export function maneuverStats(name, giftCost = 1, repeatCount = 1) {
  const mName = (typeof name === 'string' && MANEUVERS[name]) ? name : (selectGiftManeuver(name) || 'retao');
  const base = MANEUVERS[mName] || MANEUVERS.retao;
  const count = Math.min(20, Math.max(1, Math.floor(Number(repeatCount) || 1)));
  // Alcance cresce sublinearmente: presente caro não atinge o céu inteiro.
  const tier = Math.min(2.0, 1 + Math.log10(Math.max(1, Number(giftCost) || 1)) * 0.22);
  return {
    ...base,
    name: mName,
    duration: Math.min(base.maxDuration, base.duration * count),
    reach: Math.min(390, Math.round(base.reach * tier)),
    damage: Math.min(1.25, base.damage || 1),
    defense: Math.max(0.5, base.defense || 1)
  };
}

export function maneuverTarget(owner, kites, reach) {
  if (!owner || !(reach > 0)) return null;
  const list = Array.isArray(kites) ? kites : [...(kites || [])];
  return list.filter(k => k !== owner && !k.isAscending && k.spawnProtection <= 0)
    .map(k => ({ kite: k, distance: Math.hypot(k.x - owner.x, k.y - owner.y) }))
    .filter(item => item.distance <= reach)
    .sort((a,b) => a.distance - b.distance)[0]?.kite || null;
}

/** Deslocamento curto e limitado, executado após o vento e antes da detecção de linhas. */
export function applyManeuverMovement(kite, kites, delta, wind = null) {
  const maneuver = kite.maneuver;
  if (!maneuver || kite.isAscending || kite.spawnProtection > 0 || !maneuver.remaining) return false;
  const mName = String(maneuver.name || 'retao').toLowerCase();
  const step = Math.min(3, Math.max(0, delta));
  const elapsed = Math.max(0, maneuver.duration - maneuver.remaining);

  // Sincroniza com PlayerIntentController para cálculo de física determinística a 60 Hz
  if (kite.intentController && kite.intentController.currentAction !== mName) {
    const target = maneuverTarget(kite, kites, maneuver.reach);
    kite.intentController.triggerAction(mName, maneuver.remaining || maneuver.duration, {
      intensity: Math.min(2.0, (maneuver.speed || 1.3) * 1.1),
      target
    });
  }

  // 1. RETÃO (Rosa / Retão Paulista): Avança atropelando em linha reta com alta tração e velocidade sem oscilar
  if (mName === 'retao') {
    const target = maneuverTarget(kite, kites, maneuver.reach);
    if (!maneuver.dir) {
      maneuver.dir = target ? (target.x >= kite.x ? 1 : -1) : (kite.x < kite.screenWidth * 0.5 ? 1 : -1);
    }
    // Rebate suave nas bordas da tela
    if (kite.x >= kite.screenWidth - 35) maneuver.dir = -1;
    else if (kite.x <= 35) maneuver.dir = 1;

    kite.x += maneuver.dir * 2.85 * step * (maneuver.speed || 1.55);
    kite.y -= 0.38 * step; // tração ascendente de retão
    kite.lineTension = 1.0;
    kite.lineSlack = 0;
    if (kite.rope) kite.rope.pullIn(step * 1.8);
    kite.contactSpeed = Math.max(kite.contactSpeed || 0, 22);
    kite.rotation = -maneuver.dir * 0.18;
    kite.x = Math.min(kite.screenWidth - 30, Math.max(30, kite.x));
    kite.y = Math.min(kite.screenHeight * 0.60, Math.max(kite.screenHeight * 0.15, kite.y));
    return true;
  }

  // 2. MERGULHO (Donut): Desce em mergulho vertical furioso com bico pro chão, subindo em U-curve sem travar
  if (mName === 'mergulho') {
    const target = maneuverTarget(kite, kites, maneuver.reach);
    const lateralShift = target ? Math.sign(target.x - kite.x) * 1.2 : Math.sin(elapsed * 4) * 0.8;
    kite.x += lateralShift * step;

    // Histerese para curva em U dinâmica: mergulha até 0.56, depois sobe até 0.25
    if (kite.y >= kite.screenHeight * 0.56) {
      maneuver.divePhase = 'climb';
    } else if (kite.y <= kite.screenHeight * 0.25) {
      maneuver.divePhase = 'dive';
    }

    if (maneuver.divePhase === 'climb') {
      kite.y -= 2.2 * step;
      kite.rotation = -0.28;
      if (kite.rope) kite.rope.pullIn(step * 1.5);
    } else {
      kite.y += 3.4 * step * (maneuver.speed || 1.5);
      kite.rotation = 0.52; // bico apontado para baixo
      if (kite.rope) kite.rope.releaseSpool(step * 1.2);
    }

    kite.contactSpeed = Math.max(kite.contactSpeed || 0, 24);
    kite.lineTension = 0.95;
    kite.x = Math.min(kite.screenWidth - 30, Math.max(30, kite.x));
    kite.y = Math.min(kite.screenHeight * 0.62, Math.max(kite.screenHeight * 0.15, kite.y));
    return true;
  }

  // 3. RELO LATERAL (Capivara): Ataque no flanco lateral da linha adversária com escudo
  if (mName === 'relo_lateral') {
    const target = maneuverTarget(kite, kites, maneuver.reach);
    if (!maneuver.sweepDir) {
      maneuver.sweepDir = target ? (target.x >= kite.x ? 1 : -1) : (kite.x < kite.screenWidth * 0.5 ? 1 : -1);
    }
    if (kite.x >= kite.screenWidth - 35) maneuver.sweepDir = -1;
    else if (kite.x <= 35) maneuver.sweepDir = 1;

    kite.x += maneuver.sweepDir * 2.6 * step * (maneuver.speed || 1.3);
    kite.y += Math.sin(elapsed * 5) * 0.6 * step;
    kite.rotation = maneuver.sweepDir * 0.35;
    kite.lineTension = 0.88;
    kite.x = Math.min(kite.screenWidth - 30, Math.max(30, kite.x));
    kite.y = Math.min(kite.screenHeight * 0.60, Math.max(kite.screenHeight * 0.15, kite.y));
    return true;
  }

  // 4. MESTRE DO CÉU (Leão): Ataque cósmico supremo com velocidade celestial e varredura circular
  if (mName === 'mestre_do_ceu') {
    const target = maneuverTarget(kite, kites, maneuver.reach);
    if (target) {
      const angle = elapsed * 4.5;
      const targetDesiredX = target.x + Math.cos(angle) * 35;
      const targetDesiredY = target.y - 15 + Math.sin(angle) * 20;
      const blend = 1 - Math.exp(-0.065 * step * (maneuver.speed || 1.65));
      kite.x += (targetDesiredX - kite.x) * blend;
      kite.y += (targetDesiredY - kite.y) * blend;
    } else {
      kite.x += Math.sin(elapsed * 3) * 2.8 * step;
      kite.y += Math.cos(elapsed * 2) * 1.2 * step;
    }
    kite.lineTension = 1.0;
    kite.contactSpeed = 24;
    kite.x = Math.min(kite.screenWidth - 30, Math.max(30, kite.x));
    kite.y = Math.min(kite.screenHeight * 0.60, Math.max(kite.screenHeight * 0.15, kite.y));
    return true;
  }

  if (mName.startsWith('aparar')) {
    if (mName === 'aparar_retao') kite.x += Math.cos(elapsed * 13) * 0.65 * step;
    else {
      kite.y += (elapsed < maneuver.duration * 0.5 ? -0.34 : 0.34) * step;
      kite.x += Math.sin(elapsed * 10) * 0.38 * step;
    }
    if (kite.rope) kite.rope.pullIn(step * 0.3);
    kite.x = Math.min(kite.screenWidth - 30, Math.max(30, kite.x));
    kite.y = Math.min(kite.screenHeight * 0.65, Math.max(40, kite.y));
    return true;
  }

  if (mName === 'despicar') {
    const wx = Number(wind?.x) || 0, wy = Number(wind?.y) || 0;
    const cycle=(elapsed%0.62)/0.62;
    const dir = Math.abs(wx) > .06 ? Math.sign(wx) : (maneuver.windDir || 1);
    maneuver.windDir = dir;
    // Despique real no sentido do vento: bicada -> folga -> vento arrasta -> retensionamento
    const bite = cycle < .18 ? cycle / .18 : 0, loose = cycle >= .18 && cycle < .68 ? 1 : 0;
    const catchWind = cycle < .18 ? 1.12 + cycle * 1.8 : cycle < .68 ? .92 + Math.abs(wx) * .34 : .42 * (1 - cycle) / .32;
    const gust = 2.45 + Math.min(1.7, Math.abs(wx)) * 1.55;
    kite.x += dir * gust * catchWind * step;
    kite.y += ((bite * .95) + (loose * .16) - Math.max(0, -wy) * .12) * step;
    kite.lineSlack = Math.max(kite.lineSlack || 0, cycle < .18 ? .28 : cycle < .68 ? .82 : Math.max(0, (1 - cycle) / .32) * .38);
    kite.despikeWindDir=dir;
    if (kite.rope) kite.rope.releaseSpool(step * 2.2);
    kite.x = Math.min(kite.screenWidth - 30, Math.max(30, kite.x));
    kite.y = Math.min(kite.screenHeight * .65, Math.max(40, kite.y));
    return true;
  }

  if (maneuver.name === 'tenteio') {
    const sawFreq = 18;
    const sawCycle = Math.sin(elapsed * sawFreq);
    kite.x += Math.cos(elapsed * 12) * 0.72 * step;
    kite.y += sawCycle * 0.65 * step;
    kite.lineTension = 0.75 + sawCycle * 0.22;
    kite.x = Math.min(kite.screenWidth - 30, Math.max(30, kite.x));
    kite.y = Math.min(kite.screenHeight * 0.65, Math.max(40, kite.y));
    return true;
  }

  if (maneuver.name === 'largada') {
    const wx = Number(wind?.x) || 0;
    const driftDir = Math.abs(wx) > 0.05 ? Math.sign(wx) : 1;
    kite.x += driftDir * (1.1 + Math.abs(wx) * 0.6) * step;
    kite.y -= 0.35 * step;
    kite.lineSlack = Math.min(0.9, (kite.lineSlack || 0) + 0.06 * step);
    kite.lineTension = 0.28;
    if (kite.rope) kite.rope.releaseSpool(step * 1.6);
    kite.x = Math.min(kite.screenWidth - 30, Math.max(30, kite.x));
    kite.y = Math.min(kite.screenHeight * 0.65, Math.max(40, kite.y));
    return true;
  }

  if (maneuver.name === 'mergulho_parafuso') {
    const spiralRadius = 14;
    const spiralAngle = elapsed * 15;
    kite.x += Math.cos(spiralAngle) * spiralRadius * 0.12 * step;
    kite.y += (0.95 + Math.sin(spiralAngle) * 0.4) * step;
    kite.lineTension = 0.92;
    kite.x = Math.min(kite.screenWidth - 30, Math.max(30, kite.x));
    kite.y = Math.min(kite.screenHeight * 0.65, Math.max(40, kite.y));
    return true;
  }

  if (maneuver.name === 'lacada') {
    const target = maneuverTarget(kite, kites, maneuver.reach);
    if (target) {
      const orbitAngle = elapsed * 5.5;
      const orbitRadius = 38;
      const targetDesiredX = target.x + Math.cos(orbitAngle) * orbitRadius;
      const targetDesiredY = target.y + Math.sin(orbitAngle) * (orbitRadius * 0.65);
      const blend = 1 - Math.exp(-0.055 * step * maneuver.speed);
      kite.x = Math.min(kite.screenWidth - 30, Math.max(30, kite.x + (targetDesiredX - kite.x) * blend));
      kite.y = Math.min(kite.screenHeight * 0.65, Math.max(40, kite.y + (targetDesiredY - kite.y) * blend));
      kite.lineTension = 0.88;
      return true;
    }
  }

  const target = maneuverTarget(kite, kites, maneuver.reach);
  if (!target) return false;
  const blend = 1 - Math.exp(-0.042 * Math.min(3, Math.max(0, delta)) * maneuver.speed);
  const desiredX = target.x + (kite.x < target.x ? -25 : 25);
  const desiredY = target.y + 8;
  kite.x = Math.min(kite.screenWidth - 30, Math.max(30, kite.x + (desiredX - kite.x) * blend));
  kite.y = Math.min(kite.screenHeight * 0.65, Math.max(40, kite.y + (desiredY - kite.y) * blend));
  return true;
}


