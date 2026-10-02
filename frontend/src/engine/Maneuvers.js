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

/** Manobra física: escolhe alvo/intensidade e agenda intenção; nunca move coordenadas. */
export function applyManeuverMovement(kite,kites,delta,wind=null){
  const maneuver=kite?.maneuver;
  if(!maneuver||kite.isAscending||kite.spawnProtection>0||!(maneuver.remaining>0))return false;
  const mName=String(maneuver.name||'retao').toLowerCase();
  if(!kite.intentController)return false;
  if(kite.intentController.currentAction!==mName||kite.intentController.actionTimer<=.05){
    const target=maneuverTarget(kite,kites,maneuver.reach);
    const steerDir=target&&Number.isFinite(target.x)?(target.x>=kite.x?1:-1):null;
    kite.intentController.triggerAction(mName,Math.max(.25,Math.min(2.4,maneuver.remaining)),{
      intensity:Math.min(2,(maneuver.speed||1.3)*1.1),target,steerDir
    });
  }
  return true;
}
