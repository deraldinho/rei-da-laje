const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { readSavedUsername, saveUsername, normalizeUsername } = require('../backend/savedLiveProfile');

test('perfil TikTok é persistido e reutilizado após reinício', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipa-profile-'));
  const file = path.join(dir, 'nested', 'profile.json');
  try {
    assert.equal(readSavedUsername(file), null);
    assert.equal(saveUsername('@deraldinho73', file), 'deraldinho73');
    assert.equal(readSavedUsername(file), 'deraldinho73');
    assert.equal(saveUsername('outro.perfil', file), 'outro.perfil');
    assert.equal(readSavedUsername(file), 'outro.perfil');
    assert.throws(() => saveUsername('https://exemplo.com/', file), /válido/);
    assert.equal(readSavedUsername(file), 'outro.perfil');
    assert.equal(normalizeUsername(' @deraldinho73 '), 'deraldinho73');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
