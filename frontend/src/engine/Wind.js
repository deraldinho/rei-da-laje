import { sampleWindField } from './physics/WindField.js';
import { SkyWindDirector } from './physics/SkyWindDirector.js';

/** Correntes compartilhadas: vento e fase de cada pipa conduzem o voo. */
export class Wind {
  static config = {
    intensityMultiplier: 1.0,
    direction: 'auto',
    pace: 'normal'
  };
  static director = new SkyWindDirector({ seed: 0 });
  static crowdEnergy = 0;

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

  static setCrowdEnergy(value = 0) {
    Wind.crowdEnergy = Math.max(0, Math.min(1, Number(value) || 0));
  }

  static sample(time) {
    const base = sampleWindField(time, Wind.config);
    const directed = Wind.director.sample(time, base, Wind.crowdEnergy);
    if (Wind.config.direction === 'left') directed.x = -Math.abs(directed.x);
    else if (Wind.config.direction === 'right') directed.x = Math.abs(directed.x);
    return directed;
  }

  /**
   * Amostra o vento considerando o gradiente de altitude real:
   * No alto do cÃ©u o vento Ã© mais forte e laminar; perto da laje sofre atrito urbano.
   */
  static sampleAt(time, y = 300, screenHeight = 1920) {
    const base = Wind.sample(time);
    const h = Number.isFinite(screenHeight) && screenHeight > 0 ? screenHeight : 1920;
    const altitudeRatio = Math.max(0, Math.min(1, (h - (Number.isFinite(y) ? y : 300)) / h));
    const altitudeFactor = 0.75 + altitudeRatio * 0.45; // 0.75 na base atÃ© 1.20 no alto
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
  static withLocalVortices(baseWind, kite, kites) {
    const base = { ...(baseWind || { x:0, y:0, z:0, gust:1, turbulence:0 }) };
    if (!kite || !kites || typeof kites[Symbol.iterator] !== 'function') return base;
    let fx=0, fy=0, fz=0, activity=0, sources=0;
    const radius=340;
    for (const source of kites) {
      if (source===kite || !(Number(source?.specials?.tornado)>0)) continue;
      const dx=(Number(kite.x)||0)-(Number(source.x)||0);
      const dy=(Number(kite.y)||0)-(Number(source.y)||0);
      const dz=(Number(kite.z)||0)-(Number(source.z)||0);
      const dist=Math.hypot(dx,dy,dz);
      if (!(dist>1) || dist>=radius) continue;
      const falloff=Math.pow(1-dist/radius,2), xy=Math.hypot(dx,dy)||1;
      const strength=.72*falloff;
      fx+=(-dy/xy)*strength*.75+(-dx/dist)*strength*.25;
      fy+=( dx/xy)*strength*.55+(-dy/dist)*strength*.22;
      fz+=((-dy/xy)*.22+(-dz/dist)*.28)*strength;
      activity+=falloff;
      if (++sources>=6) break;
    }

    const magnitude=Math.hypot(fx,fy,fz);
    if (magnitude>.85) { const scale=.85/magnitude; fx*=scale; fy*=scale; fz*=scale; }
    return {
      ...base,
      x:(Number(base.x)||0)+fx,
      y:(Number(base.y)||0)+fy,
      z:(Number(base.z)||0)+fz,
      gust:Math.max(.4,Math.min(1.8,(Number(base.gust)||1)+Math.min(.22,activity*.08))),
      turbulence:Math.max(0,Math.min(.65,(Number(base.turbulence)||0)+Math.min(.18,activity*.06))),
      localVortex:activity>0
    };
  }

}
