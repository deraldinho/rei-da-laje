import { windSpeedKmh } from '../../engine/physics/ForwardWind.js';

/**
 * ThreeExperienceHub.js
 * Arquitetura de UI/UX para Experiência 3D (/3d-web-experience)
 * 
 * Responsabilidades:
 * - Telemetria da Rosa dos Ventos 3D (Vetor de vento sincronizado em tempo real)
 * - Indicador dinâmico do Tema 3D e Monumento ativo (27 Estados do Brasil)
 * - Monitor de status WebGL & Fallback para dispositivos sem aceleração gráfica
 * - Feedback áudio-reativo visual do Boombox 3D da laje
 */

export class ThreeExperienceHub {
  constructor(options = {}) {
    this.container = options.container || null;
    this.activeTheme = null;
    this.windAngle = 0;
    this.windSpeed = 0;
    this.isWebGLSupported = this.checkWebGLSupport();
    this.initDOM();
  }

  /**
   * Validação de WebGL exigida pela diretriz /3d-web-experience (Fallback Strategy)
   */
  checkWebGLSupport() {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      );
    } catch (_) {
      return false;
    }
  }

  initDOM() {
    // Garante que o contêiner de telemetria 3D exista no DOM
    let hubEl = document.getElementById('threeExperienceHub');
    if (!hubEl) {
      hubEl = document.createElement('div');
      hubEl.id = 'threeExperienceHub';
      hubEl.className = 'three-experience-hub';
      hubEl.setAttribute('aria-label', 'Telemetria da Experiência 3D');

      // Elementos internos da experiência 3D:
      // 1. Rosa dos Ventos 3D (Bússola Vetorial)
      // 2. Chip de Tema 3D e Monumento Estadual
      // 3. Indicador de Aceleração WebGL
      hubEl.innerHTML = `
        <div class="hud-3d-pill theme-indicator-pill" id="themeIndicatorPill" title="Cenário 3D e Monumento Estadual Ativo">
          <span class="hud-3d-icon" id="themeStateFlag">📍</span>
          <div class="hud-3d-text">
            <span class="hud-3d-sub" id="themeRegionText">BRASIL 3D</span>
            <strong class="hud-3d-title" id="themeLandmarkText">RIO DE JANEIRO</strong>
          </div>
        </div>
        <div class="hud-3d-pill wind-vector-pill" id="windVectorPill" title="Vetor de Vento 3D">
          <div class="wind-compass" id="windCompassNeedle">
            <span class="compass-arrow">➤</span>
          </div>
          <div class="hud-3d-text">
            <span class="hud-3d-sub">VENTO 3D</span>
            <strong class="hud-3d-title" id="windVectorText">SUAVE · 0 km/h</strong>
          </div>
        </div>
        <div class="hud-3d-pill webgl-status-pill ${this.isWebGLSupported ? 'webgl-active' : 'webgl-fallback'}" id="webglStatusPill" title="${this.isWebGLSupported ? 'Aceleração Gráfica WebGL 60 FPS' : 'Modo Seguro 2D / Sem WebGL'}">
          <span class="webgl-dot"></span>
          <span class="webgl-badge-label">${this.isWebGLSupported ? '3D 60FPS' : 'MODO 2D'}</span>
        </div>
      `;

      // Injeta de forma não-intrusiva no header ou overlay
      const headerActions = document.querySelector('.header-actions');
      if (headerActions) {
        headerActions.insertBefore(hubEl, headerActions.firstChild);
      } else {
        const overlay = document.getElementById('uiOverlay');
        if (overlay) overlay.prepend(hubEl);
      }
    }

    this.hubEl = hubEl;
    this.themeFlagEl = document.getElementById('themeStateFlag');
    this.themeRegionEl = document.getElementById('themeRegionText');
    this.themeLandmarkEl = document.getElementById('themeLandmarkText');
    this.compassNeedleEl = document.getElementById('windCompassNeedle');
    this.windVectorTextEl = document.getElementById('windVectorText');
    this.webglStatusEl = document.getElementById('webglStatusPill');

    // Escuta mudanças de mapa emitidas pelo ThreeSkyScene
    if (typeof window !== 'undefined') {
      window.addEventListener('pipa:map_changed', (e) => {
        if (e.detail?.theme) {
          this.updateTheme(e.detail.theme);
        }
      });

      // Escuta pulso do boombox da laje
      window.addEventListener('pipa:boombox_beat', () => {
        this.triggerAudioBeatPulse();
      });
    }
  }

  /**
   * Atualiza a telemetria do vetor de vento 3D sincronizado com Three.js e PixiJS
   */
  updateWindVector(wind) {
    if (!wind) return;
    const wx = Number(wind.x) || 0;
    const wy = Number(wind.y) || 0;
    const gust = Number(wind.gust) || 1.0;

    // Ângulo em graus do vetor de vento (0 = direita, 90 = baixo, 180 = esquerda, 270 = cima)
    const angleRad = Math.atan2(wy, wx);
    const angleDeg = (angleRad * (180 / Math.PI));

    // Intensidade calibrada
    const speedKmh = Math.round(windSpeedKmh(wind));
    const intensity = gust > 1.25 ? 'FORTE' : gust > 0.95 ? 'MODERADO' : 'SUAVE';

    if (this.compassNeedleEl) {
      this.compassNeedleEl.style.transform = `rotate(${angleDeg}deg)`;
    }

    if (this.windVectorTextEl) {
      this.windVectorTextEl.textContent = `${intensity} · ${speedKmh} km/h`;
    }
  }

  /**
   * Atualiza o badge do Tema 3D e Monumento com feedback cromático semântico
   */
  updateTheme(theme) {
    if (!theme) return;
    this.activeTheme = theme;
    const stateName = (theme.name || 'Brasil').toUpperCase();
    const landmark = (theme.landmark || 'Cenário 3D').toUpperCase();
    const region = (theme.region || 'BR').toUpperCase();
    const accentHex = '#' + (theme.accent || 0x38bdf8).toString(16).padStart(6, '0');

    if (this.themeRegionEl) {
      this.themeRegionEl.textContent = `${region} · 3D`;
    }
    if (this.themeLandmarkEl) {
      this.themeLandmarkEl.textContent = `${stateName}`;
      this.themeLandmarkEl.title = `${stateName} — ${landmark}`;
    }

    const pill = document.getElementById('themeIndicatorPill');
    if (pill) {
      pill.style.borderColor = `${accentHex}66`;
      pill.style.boxShadow = `0 0 14px ${accentHex}33`;
    }
  }

  /**
   * Microinteração áudio-reativa: pulso luminoso sincronizado com batidas da laje
   */
  triggerAudioBeatPulse() {
    const pill = document.getElementById('themeIndicatorPill');
    if (pill) {
      pill.classList.remove('pill-audio-pulse');
      void pill.offsetWidth;
      pill.classList.add('pill-audio-pulse');
    }
  }
}
