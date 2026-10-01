function classifyConnectionError(error) {
  const code=String(error?.code||'').trim().toUpperCase();
  const message=String(error?.message||error||'').toLowerCase();
  if (/not currently live|offline|not live|live.*not found|room.*not found/.test(message)) return 'LIVE_OFFLINE';
  if (/timeout|timed out|tempo esgotado/.test(message)) return 'TIMEOUT';
  if (code==='429' || /rate.?limit|too many requests|429/.test(message)) return 'RATE_LIMIT';
  if (/business plan|unauthorized|forbidden|auth|cookie|signature/.test(message)) return 'PROVIDER_AUTH';
  if (code) return code.slice(0,48);
  return 'CONNECT_FAILED';
}
module.exports={classifyConnectionError};
