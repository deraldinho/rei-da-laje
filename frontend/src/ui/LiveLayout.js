/** Escala exclusivamente visual: coordenadas e colisões continuam em pixels da arena. */
export function liveVisualScale(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return 1;
  if (height <= width) return 1;
  if (width < 700) return 1;
  return Math.min(1.85, Math.max(1.2, (width / 900) * 1.2));
}
