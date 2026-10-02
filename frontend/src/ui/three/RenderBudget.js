export function computeRenderBudget({ quality = 'high', population = 0 } = {}) {
  const count = Math.max(0, Math.floor(Number(population) || 0));
  const level = ['high', 'medium', 'low'].includes(quality) ? quality : 'high';
  const crowded = count >= 24;
  const busy = count >= 14;

  if (level === 'low') {
    return {
      pixelRatioScale: crowded ? 0.68 : 0.78,
      shadows: false,
      environmentStride: crowded ? 4 : 3,
      idleLineOpacityScale: crowded ? 0.22 : 0.35,
      ambientLod: crowded ? 3 : 2,
      kiteDetailLod: crowded ? 2 : 1
    };
  }

  if (level === 'medium' || crowded) {
    return {
      pixelRatioScale: crowded ? 0.82 : 0.9,
      shadows: false,
      environmentStride: crowded ? 3 : 2,
      idleLineOpacityScale: crowded ? 0.3 : 0.45,
      ambientLod: 2,
      kiteDetailLod: crowded ? 1 : 0
    };
  }

  if (busy) {
    return {
      pixelRatioScale: 0.95,
      shadows: false,
      environmentStride: 2,
      idleLineOpacityScale: 0.55,
      ambientLod: 1,
      kiteDetailLod: 0
    };
  }

  return {
    pixelRatioScale: 1,
    shadows: true,
    environmentStride: 1,
    idleLineOpacityScale: 1,
    ambientLod: 0,
    kiteDetailLod: 0
  };
}
