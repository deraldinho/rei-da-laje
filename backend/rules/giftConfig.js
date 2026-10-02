/**
 * Configuração dos Presentes (TikTok Gifts) e Upgrades no Relinho
 */
const GIFTS = {
  // Presente básico: 1 moeda
  ROSA: {
    id: 5655,
    name: 'Rosa',
    cost: 1,
    lineType: 'cerol',
    powerMultiplier: 1.5,
    durationSeconds: 30,
    maxDurationSeconds: 45,
    color: '#ff3344',
    lineWidth: 2.5,
    shieldCount: 0,
    specialAbility: null,
    description: 'Linha Cerol e retão por 30s (até 45s com combos)'
  },
  // Presente médio: 30 moedas
  DONUT: {
    id: 5827,
    name: 'Donut',
    cost: 30,
    lineType: 'chile',
    powerMultiplier: 3.0,
    durationSeconds: 30,
    maxDurationSeconds: 45,
    color: '#00f0ff',
    lineWidth: 3.0,
    shieldCount: 0,
    specialAbility: null,
    description: 'Linha Chile e mergulho por 30s (até 45s com combos)'
  },
  // Presente alto: 100 moedas
  CAPIVARA: {
    id: 6064,
    name: 'Capivara',
    cost: 100,
    lineType: 'kevlar',
    powerMultiplier: 2.5,
    durationSeconds: 45,
    maxDurationSeconds: 45,
    color: '#ffcc00',
    lineWidth: 3.5,
    shieldCount: 2,
    specialAbility: 'shield',
    description: 'Linha Kevlar e relo lateral por 45s; 2 escudos iniciais'
  },
  // Presente especial: 500 moedas
  PERFUME: {
    id: 5984,
    name: 'Perfume',
    cost: 500,
    lineType: 'tornado',
    powerMultiplier: 4.0,
    durationSeconds: 45,
    maxDurationSeconds: 45,
    color: '#bf55ec',
    lineWidth: 4.0,
    shieldCount: 1,
    specialAbility: 'tornado',
    description: 'Tornado e fluxo denso por 45s'
  },
  // Presente épico: Leão / Universo
  LEAO: {
    id: 6267,
    name: 'Leão',
    cost: 29999,
    lineType: 'mestre_do_ceu',
    powerMultiplier: 6.0,
    durationSeconds: 45,
    maxDurationSeconds: 45,
    color: '#ffffff',
    lineWidth: 5.0,
    shieldCount: 3,
    specialAbility: 'invulnerable',
    description: 'Mestre do Céu: linha épica, 3 escudos e resistência celestial por 45s'
  }
};

/**
 * Retorna a configuração de upgrade por nome ou ID do presente
 */
function getGiftUpgrade(giftIdOrName) {
  if (!giftIdOrName) return null;
  if (String(giftIdOrName).trim().toLowerCase() === 'flor') return GIFTS.ROSA;
  if (String(giftIdOrName).trim().toLowerCase() === 'universo') return GIFTS.LEAO;
  const key = Object.keys(GIFTS).find(
    k => GIFTS[k].id === Number(giftIdOrName) ||
         GIFTS[k].name.toLowerCase() === String(giftIdOrName).toLowerCase() ||
         k.toLowerCase() === String(giftIdOrName).toLowerCase()
  );
  return key ? GIFTS[key] : null;
}


/** Resolve o tier exclusivamente pelo valor canônico da sequência. */
function getGiftUpgradeByValue(giftName, coinValue) {
  const cost=Math.max(0,Number(coinValue)||0);
  if (!(cost > 0)) return null;
  const name=String(giftName||'Presente TikTok').slice(0,90);
  const tier=Object.values(GIFTS).slice().sort((x,y)=>Number(y.cost)-Number(x.cost))
    .find(config=>cost>=Number(config.cost));
  if(!tier) return null;
  return { ...tier, id:String(giftName||'dynamic'), name, cost, maneuverGiftName:tier.name };
}
module.exports = {
  GIFTS,
  getGiftUpgrade,
  getGiftUpgradeByValue
};
