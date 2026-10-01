const fs = require('node:fs');
const path = require('node:path');
const PROFILE_PATH = path.join(__dirname, 'data', 'live-profile.json');

function normalizeUsername(value) {
  const username = String(value || '').trim().replace(/^@/, '');
  if (!/^[a-zA-Z0-9._]{2,24}$/.test(username)) throw new Error('Informe um @usuário válido do TikTok.');
  return username;
}

function readSavedUsername(filePath = PROFILE_PATH) {
  try { return normalizeUsername(JSON.parse(fs.readFileSync(filePath, 'utf8')).username); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    console.error('[TikTok Live] Configuração salva inválida ou inacessível.');
    return null;
  }
}

function saveUsername(value, filePath = PROFILE_PATH) {
  const username = normalizeUsername(value);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = filePath + '.tmp';
  fs.writeFileSync(tempPath, JSON.stringify({ username }, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tempPath, filePath);
  return username;
}

function clearSavedUsername(filePath = PROFILE_PATH) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return true;
  } catch (_) {
    return false;
  }
}

module.exports = { PROFILE_PATH, normalizeUsername, readSavedUsername, saveUsername, clearSavedUsername };
