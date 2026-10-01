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
export function getLineMaterial(lineType = 'algodao') {
  const key = String(lineType || '').toLowerCase();
  return LINE_MATERIALS[key] || LINE_MATERIALS.algodao;
}
