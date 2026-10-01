const { isRecoverableTransportError } = require('./tiktokProcessRecovery');

const TIKTOK_FAILURE = Object.freeze({
  LIVE_NOT_FOUND: 'LIVE_NOT_FOUND',
  TRANSPORT_FAILURE: 'TRANSPORT_FAILURE',
  WORKER_FAILURE: 'WORKER_FAILURE',
  LIVE_ENDED: 'LIVE_ENDED'
});

const FAST_DELAYS = Object.freeze([750, 1500, 3000, 5000, 8000, 12000]);
const SLOW_DELAYS = Object.freeze([120000, 180000, 240000, 300000]);

function classifyTikTokFailure(error = {}) {
  const code = String(error?.code || error?.cause?.code || '').toUpperCase();
  const message = String(error?.message || error?.cause?.message || '').toLowerCase();
  if (code === 'LIVE_ENDED') return TIKTOK_FAILURE.LIVE_ENDED;
  if (/not currently live|offline|hostnotonline|host not online|live.*not found|room.*not found/.test(message) ||
      ['OFFLINE','HOST_NOT_ONLINE','LIVE_NOT_FOUND'].includes(code)) return TIKTOK_FAILURE.LIVE_NOT_FOUND;
  if (code.startsWith('WORKER_')) return TIKTOK_FAILURE.WORKER_FAILURE;
  if (isRecoverableTransportError(error) || /socket|websocket|transport|connection|timeout/.test(message))
    return TIKTOK_FAILURE.TRANSPORT_FAILURE;
  return TIKTOK_FAILURE.WORKER_FAILURE;
}

function applyJitter(base, random = Math.random) {
  const sample = Math.max(0, Math.min(1, Number(random()) || 0));
  return Math.round(base * (0.9 + sample * 0.2));
}
function nextTikTokRetry({ kind, attempt = 1, random = Math.random } = {}) {
  const slow = kind === TIKTOK_FAILURE.LIVE_NOT_FOUND || kind === TIKTOK_FAILURE.LIVE_ENDED;
  const delays = slow ? SLOW_DELAYS : FAST_DELAYS;
  const index = Math.min(delays.length - 1, Math.max(0, Math.floor(Number(attempt) || 1) - 1));
  const jittered = applyJitter(delays[index], random);
  const delayMs = slow ? Math.max(120000, Math.min(300000, jittered)) : jittered;
  return {
    delayMs,
    slow,
    countsTowardExhaustion: !slow
  };
}

module.exports = {
  TIKTOK_FAILURE,
  FAST_DELAYS,
  SLOW_DELAYS,
  classifyTikTokFailure,
  nextTikTokRetry
};
