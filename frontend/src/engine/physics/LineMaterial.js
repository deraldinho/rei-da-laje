/**
 * LineMaterial - Parâmetros Físicos e Abrasivos dos Materiais de Linha
 * 
 * Modela comportamento mecânico (rigidez, amortecimento, diâmetro) e
 * comportamento tribológico (fricção, abrasividade e resistência ao desgaste por atrito).
 */

export const LINE_MATERIALS = {
  algodao: {
    type: 'algodao',
    name: 'Linha 10 Algodão Pura',
    diameter: 1.0,           // Diâmetro normalizado (mm)
    linearDensity: 0.008,    // Densidade linear (massa relativa por nó)
    stiffness: 0.82,         // Rigidez à tração (0-1)
    damping: 0.965,          // Amortecimento de oscilação por frame
    friction: 0.65,          // Coeficiente de atrito cinético
    abrasiveness: 1.00,      // Poder de desgaste abrasivo
    abrasionResistance: 1.00,// Resistência a sofrer desgaste
    cutResistance: 1.00,     // Energia abrasiva normalizada necessária para ruptura
    maxTension: 35.0         // Limite de ruptura por tração
  },
  cerol: {
    type: 'cerol',
    name: 'Cerol de Vidro Moído Paulista',
    diameter: 1.15,
    linearDensity: 0.010,
    stiffness: 0.88,
    damping: 0.970,
    friction: 0.74,
    abrasiveness: 1.50,
    abrasionResistance: 0.92,
    cutResistance: 1.10,
    maxTension: 45.0
  },
  lampada: {
    type:'lampada', name:'Cerol Lâmpada', diameter:1.15, linearDensity:0.010,
    stiffness:0.88, damping:0.970, friction:0.78, abrasiveness:1.65,
    abrasionResistance:1.00, cutResistance:1.15, maxTension:47.0
  },
  acrilico: {
    type:'acrilico', name:'Cerol Acrílico', diameter:1.15, linearDensity:0.010,
    stiffness:0.88, damping:0.970, friction:0.82, abrasiveness:1.80,
    abrasionResistance:1.08, cutResistance:1.25, maxTension:50.0
  },
  pedra: {
    type:'pedra', name:'Cerol Pedra', diameter:1.15, linearDensity:0.010,
    stiffness:0.88, damping:0.970, friction:0.86, abrasiveness:2.00,
    abrasionResistance:1.12, cutResistance:1.30, maxTension:52.0
  },
  cristal: {
    type:'cristal', name:'Cerol Cristal', diameter:1.15, linearDensity:0.010,
    stiffness:0.88, damping:0.970, friction:0.90, abrasiveness:2.20,
    abrasionResistance:1.20, cutResistance:1.40, maxTension:55.0
  },
  chile: {
    type: 'chile',
    name: 'Linha Chilena 3 Passadas',
    diameter: 1.30,
    linearDensity: 0.012,
    stiffness: 0.93,
    damping: 0.975,
    friction: 0.80,
    abrasiveness: 1.85,
    abrasionResistance: 1.25,
    cutResistance: 1.45,
    maxTension: 60.0
  },
  chilena: {
    type:'chilena', name:'Linha Chilena', diameter:1.30, linearDensity:0.012,
    stiffness:0.93, damping:0.975, friction:0.92, abrasiveness:2.35,
    abrasionResistance:1.35, cutResistance:1.55, maxTension:62.0
  },
  kevlar: {
    type: 'kevlar',
    name: 'Fio de Kevlar Trançado',
    diameter: 1.45,
    linearDensity: 0.015,
    stiffness: 0.96,
    damping: 0.985,
    friction: 0.58,
    abrasiveness: 0.95,
    abrasionResistance: 2.10,
    cutResistance: 2.20,
    maxTension: 85.0
  },
  tornado: {
    type: 'tornado',
    name: 'Linha Vórtice Tornado',
    diameter: 1.25,
    linearDensity: 0.011,
    stiffness: 0.90,
    damping: 0.980,
    friction: 0.72,
    abrasiveness: 1.40,
    abrasionResistance: 1.50,
    cutResistance: 1.65,
    maxTension: 70.0
  },
  mestre_do_ceu: {
    type: 'mestre_do_ceu',
    name: 'Linha Mestre do Céu Solar',
    diameter: 1.50,
    linearDensity: 0.014,
    stiffness: 0.95,
    damping: 0.985,
    friction: 0.82,
    abrasiveness: 1.70,
    abrasionResistance: 2.30,
    cutResistance: 2.40,
    maxTension: 110.0
  }
};

/**
 * Retorna as propriedades do material de acordo com o identificador
 * @param {string} lineType 
 * @returns {object}
 */
const LINE_ALIASES=Object.freeze({
  algodao:'algodao','linha 10':'algodao','linha10':'algodao',lampada:'lampada',
  acrilico:'acrilico',pedra:'pedra',cristal:'cristal',chilena:'chilena',chile:'chile'
});

export function getLineMaterial(lineType = 'algodao') {
  const normalized=String(lineType||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const key=LINE_ALIASES[normalized]||normalized;
  return LINE_MATERIALS[key] || LINE_MATERIALS.algodao;
}

/** Resolve propriedades tribológicas efetivas de um par de linhas. */
export function getLinePairProperties(materialA,materialB){
  const a=typeof materialA==='string'?getLineMaterial(materialA):(materialA||LINE_MATERIALS.algodao);
  const b=typeof materialB==='string'?getLineMaterial(materialB):(materialB||LINE_MATERIALS.algodao);
  const friction=Math.sqrt(Math.max(.001,Number(a.friction)||0)*Math.max(.001,Number(b.friction)||0));
  const abrasivenessA=Math.max(.05,Number(a.abrasiveness)||1)/Math.max(.05,Number(b.abrasionResistance)||1);
  const abrasivenessB=Math.max(.05,Number(b.abrasiveness)||1)/Math.max(.05,Number(a.abrasionResistance)||1);
  return {friction,abrasivenessA,abrasivenessB};
}
