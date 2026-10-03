const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const TikTokService = require('../backend/tiktokService');

test('liveEnded notifica o servidor uma vez sem matar o worker em espera', async () => {
  const client = new EventEmitter();
  client.connect = async () => { queueMicrotask(() => client.emit('connected', { roomId:'room-end' })); return new Promise(() => {}); };
  client.disconnect = () => {};
  const service = new TikTokService({ emit(){} }, {}, {}, async () => client);
  let ended = 0;
  service.onLiveEnded = () => { ended++; };
  assert.equal((await service.connect('live_teste')).success, true);
  client.emit('liveEnded', {});
  assert.equal(ended, 1);
  assert.equal(service.connection, client);
});

test('servidor limpa somente pipas quando a Live termina', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../backend/server.js'), 'utf8');
  assert.match(source, /tiktokService\.onLiveEnded\s*=\s*\(\)\s*=>/);
  assert.match(source, /arenaStore\.reset\(gameRules,\s*buffManager,\s*\{\s*scope:\s*'kites'\s*\}\)/);
  assert.match(source, /io\.emit\('arena:reset',\s*\{[^}]*scope:\s*'kites'[^}]*reason:\s*'live_ended'/s);
  assert.doesNotMatch(source, /tiktokService\.onLiveEnded[\s\S]{0,500}clearSavedUsername/);
});
