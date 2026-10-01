/**
 * GiftDockComponent.js
 * Gerenciador da Barra Inferior Tática (Dock de Presentes e Guia de Poderes)
 * 
 * Responsabilidades:
 * - Indicador da direção e intensidade do vento (#windStatus)
 * - Badges táticos de superpoderes dos presentes (Rosa, Donut, Capivara, Perfume, Leão)
 * - Microinterações de ativação com brilho e escala elástica (gift-active)
 * - Indicador de Boost temporário de agilidade (#boostStatus)
 */

export class GiftDockComponent {
  constructor() {
    this.windEl = document.getElementById('windStatus');
    this.boostEl = document.getElementById('boostStatus');
    this.boostTimer = null;
  }

  updateWind(wind) {
    if (!wind || !this.windEl) return;
    const intensity = wind.gust > 1.17 ? 'FORTE' : wind.gust > 0.93 ? 'MODERADO' : 'SUAVE';
    const label = `${Math.abs(wind.x) < 0.25 ? 'VENTO ↔' : wind.x > 0 ? 'VENTO →' : '← VENTO'} · ${intensity}`;
    if (this.windEl.textContent !== label) {
      this.windEl.textContent = label;
    }
  }

  highlightGiftBadge(name, duration = 3) {
    const key = String(name || '').toLowerCase();
    const map = {
      retao: '.gift-retao', rosa: '.gift-retao',
      despicar: '.gift-despicar', donut: '.gift-despicar',
      aparar: '.gift-aparar', capivara: '.gift-aparar', aparar_retao: '.gift-aparar', aparar_despicada: '.gift-aparar',
      perseguir: '.gift-perseguir', perfume: '.gift-perseguir', tornado: '.gift-perseguir',
      leao: '.gift-protecao', protecao: '.gift-protecao', invulnerable: '.gift-protecao'
    };
    const selector = map[key];
    if (!selector) return;

    const badge = document.querySelector(selector);
    if (!badge) return;

    badge.classList.remove('gift-active');
    void badge.offsetWidth;
    badge.classList.add('gift-active');

    clearTimeout(badge._activeTimer);
    badge._activeTimer = setTimeout(() => {
      badge.classList.remove('gift-active');
    }, Math.min(8000, Math.max(1500, duration * 1000)));
  }

  showBoost() {
    if (!this.boostEl) return;
    this.boostEl.hidden = false;
    clearTimeout(this.boostTimer);
    this.boostTimer = setTimeout(() => {
      this.boostEl.hidden = true;
    }, 30000);
  }
}
