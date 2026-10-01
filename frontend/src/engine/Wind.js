/** Correntes compartilhadas: vento e fase de cada pipa conduzem o voo. */
export class Wind {
  static config = {
    intensityMultiplier: 1.0,
    direction: 'auto',
    pace: 'normal'
  };

  static setSettings(settings) {
    if (!settings) return;
    if (settings.windIntensity) {
      const map = { calmo: 0.5, fraco: 0.7, moderado: 1.0, forte: 1.6, tempestade: 2.3 };
      this.config.intensityMultiplier = map[String(settings.windIntensity).toLowerCase()] || 1.0;
    }
    if (settings.windDirection) {
      this.config.direction = String(settings.windDirection).toLowerCase();
    }
    if (settings.relinhoPace) {
      this.config.pace = String(settings.relinhoPace).toLowerCase();
    }
  }

  static sample(time) {
    const t = Number.isFinite(time) ? time : 0;
    const mult = Wind.config.intensityMultiplier || 1.0;
    let dirBias = 0;
    if (Wind.config.direction === 'left') dirBias = -1.2;
    else if (Wind.config.direction === 'right') dirBias = 1.2;

    const baseSpeed = Wind.config.pace === 'frenetico' ? 1.4 : (Wind.config.pace === 'calmo' ? 0.7 : 1.0);
    const effectiveTime = t * baseSpeed;

    return {
      time: effectiveTime,
      x: ((Math.sin(effectiveTime * 0.31) * 1.4 + Math.sin(effectiveTime * 0.79) * 0.55) + dirBias) * mult,
      y: (Math.cos(effectiveTime * 0.43) * 0.7) * mult,
      z: (Math.sin(effectiveTime * 0.23) * 0.65) * mult,
      gust: (0.7 + (Math.sin(effectiveTime * 0.19) + 1) * 0.35) * mult,
      turbulence: (Math.sin(effectiveTime * 1.8) * 0.18 + Math.cos(effectiveTime * 3.4) * 0.08) * mult,
      current: Math.sin(effectiveTime * 0.13) > 0.68 ? 'updraft' : Math.sin(effectiveTime * 0.13) < -0.68 ? 'downdraft' : Math.cos(effectiveTime * 0.17) > 0.93 ? 'crosswind' : 'normal'
    };
  }

  /**
   * Amostra o vento considerando o gradiente de altitude real:
   * No alto do céu o vento é mais forte e laminar; perto da laje sofre atrito urbano.
   */
  static sampleAt(time, y = 300, screenHeight = 1920) {
    const base = Wind.sample(time);
    const h = Number.isFinite(screenHeight) && screenHeight > 0 ? screenHeight : 1920;
    const altitudeRatio = Math.max(0, Math.min(1, (h - (Number.isFinite(y) ? y : 300)) / h));
    const altitudeFactor = 0.75 + altitudeRatio * 0.45; // 0.75 na base até 1.20 no alto
    return {
      ...base,
      x: base.x * altitudeFactor,
      gust: base.gust * altitudeFactor,
      altitudeRatio
    };
  }
  static contactRadius(width, height) {
    const w = Number.isFinite(width) ? width : 1080;
    const h = Number.isFinite(height) ? height : 1920;
    return Math.min(220, Math.max(120, Math.min(w, h) * 0.18));
  }
  static move(kite, delta, timeOrWind, population = 2) {
    let numericTime = 0;
    let wind = null;

    if (typeof timeOrWind === 'number' && Number.isFinite(timeOrWind)) {
      numericTime = timeOrWind;
    } else if (timeOrWind && typeof timeOrWind === 'object') {
      if (Number.isFinite(timeOrWind.time)) {
        numericTime = timeOrWind.time;
      } else if (Number.isFinite(kite.oscillationTimer)) {
        numericTime = kite.oscillationTimer;
      }
      if (Number.isFinite(timeOrWind.x) && Number.isFinite(timeOrWind.y) && Number.isFinite(timeOrWind.gust)) {
        wind = timeOrWind;
      }
    } else if (Number.isFinite(kite.oscillationTimer)) {
      numericTime = kite.oscillationTimer;
    }

    numericTime *= 0.6;
    const safeDelta = (Number.isFinite(delta) ? Math.max(0, Math.min(delta, 3)) : 1) * 0.6;
    if (!wind) {
      wind = Wind.sample(numericTime);
    }

    const phase = Number.isFinite(kite.windPhase) ? kite.windPhase : 0;
    const width = Number.isFinite(kite.screenWidth) && kite.screenWidth > 0 ? kite.screenWidth : 1080;
    const height = Number.isFinite(kite.screenHeight) && kite.screenHeight > 0 ? kite.screenHeight : 1920;
    const sparse = population <= 4;
    const convergence = sparse ? Math.pow((1 + Math.sin(numericTime * 0.65)) / 2, 2) * 0.9 : 0;
    const drift = Math.sin(numericTime * (sparse ? 0.55 : 0.26) + phase);
    const lift = Math.sin(numericTime * (sparse ? 0.48 : 0.32) + phase * 1.7);
    const targetX = width * (0.5 + drift * 0.34 * (1 - convergence)) + (Number.isFinite(wind.x) ? wind.x : 0) * 30 * (Number.isFinite(kite.windInfluence) ? kite.windInfluence : 1);
    const verticalCurrent = wind.current === 'updraft' ? -height * 0.045 : wind.current === 'downdraft' ? height * 0.045 : 0;
    const lateralCurrent = wind.current === 'crosswind' ? width * 0.04 * Math.sign(wind.x || 1) : 0;
    const targetY = height * (0.31 + lift * 0.17 * (1 - convergence)) + (Number.isFinite(wind.y) ? wind.y : 0) * 25 + verticalCurrent;
    const speed = (kite.likeBoostRemaining || 0) > 0 ? 1.25 : 1;
    const gust = Number.isFinite(wind.gust) ? wind.gust : 1;
    const blend = 1 - Math.exp(-(sparse ? 0.038 : 0.021) * safeDelta * gust * speed);
    const before = Number.isFinite(kite.x) ? kite.x : targetX;
    const beforeY = Number.isFinite(kite.y) ? kite.y : targetY;
    kite.x = before + (targetX + lateralCurrent - before) * blend;
    kite.y = beforeY + (targetY - beforeY) * blend;
    kite.contactSpeed = Math.hypot(kite.x - before, kite.y - beforeY) / Math.max(0.25, safeDelta);
    kite.x = Math.max(30, Math.min(width - 30, kite.x));
    kite.y = Math.max(height * 0.12, Math.min(height * 0.44, kite.y));
    kite.rotation = Math.max(-0.4, Math.min(0.4, (kite.x - before) * 0.06 + (Number.isFinite(wind.x) ? wind.x : 0) * 0.07));
    return wind;
  }
  static attract(owner, kites, delta) {
    if (!owner || !Number.isFinite(owner.x) || !Number.isFinite(owner.y)) return 0;
    const nearby = [...kites].filter(k => k !== owner && !k.isAscending && k.spawnProtection <= 0 && Number.isFinite(k.x) && Number.isFinite(k.y))
      .map(k => ({k, distance: Math.hypot(k.x-owner.x, k.y-owner.y)}))
      .filter(v => v.distance <= 300)
      .sort((a,b) => a.distance-b.distance).slice(0,3);
    const blend = 1 - Math.exp(-0.035 * (Number.isFinite(delta) ? delta : 1));
    for (const {k} of nearby) {
      k.x += (owner.x-k.x)*blend;
      k.y += (owner.y-k.y)*blend;
    }
    return nearby.length;
  }
}