import { buildThemeAC } from './states/ThemeAC.js';
import { buildThemeAL } from './states/ThemeAL.js';
import { buildThemeAP } from './states/ThemeAP.js';
import { buildThemeAM } from './states/ThemeAM.js';
import { buildThemeBA } from './states/ThemeBA.js';
import { buildThemeCE } from './states/ThemeCE.js';
import { buildThemeDF } from './states/ThemeDF.js';
import { buildThemeES } from './states/ThemeES.js';
import { buildThemeGO } from './states/ThemeGO.js';
import { buildThemeMA } from './states/ThemeMA.js';
import { buildThemeMT } from './states/ThemeMT.js';
import { buildThemeMS } from './states/ThemeMS.js';
import { buildThemeMG } from './states/ThemeMG.js';
import { buildThemePA } from './states/ThemePA.js';
import { buildThemePB } from './states/ThemePB.js';
import { buildThemePR } from './states/ThemePR.js';
import { buildThemePE } from './states/ThemePE.js';
import { buildThemePI } from './states/ThemePI.js';
import { buildThemeRJ } from './states/ThemeRJ.js';
import { buildThemeRN } from './states/ThemeRN.js';
import { buildThemeRS } from './states/ThemeRS.js';
import { buildThemeRO } from './states/ThemeRO.js';
import { buildThemeRR } from './states/ThemeRR.js';
import { buildThemeSC } from './states/ThemeSC.js';
import { buildThemeSP } from './states/ThemeSP.js';
import { buildThemeSE } from './states/ThemeSE.js';
import { buildThemeTO } from './states/ThemeTO.js';

export const STATE_THEME_BUILDERS = Object.freeze({
  AC: buildThemeAC,
  AL: buildThemeAL,
  AP: buildThemeAP,
  AM: buildThemeAM,
  BA: buildThemeBA,
  CE: buildThemeCE,
  DF: buildThemeDF,
  ES: buildThemeES,
  GO: buildThemeGO,
  MA: buildThemeMA,
  MT: buildThemeMT,
  MS: buildThemeMS,
  MG: buildThemeMG,
  PA: buildThemePA,
  PB: buildThemePB,
  PR: buildThemePR,
  PE: buildThemePE,
  PI: buildThemePI,
  RJ: buildThemeRJ,
  RN: buildThemeRN,
  RS: buildThemeRS,
  RO: buildThemeRO,
  RR: buildThemeRR,
  SC: buildThemeSC,
  SP: buildThemeSP,
  SE: buildThemeSE,
  TO: buildThemeTO
});

export function buildStateTheme(code, group, theme, ctx) {
  const c = String(code || 'RJ').toUpperCase();
  const builder = STATE_THEME_BUILDERS[c] || STATE_THEME_BUILDERS.RJ;
  if (typeof builder === 'function') {
    builder(group, theme, ctx);
  }
}
