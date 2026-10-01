module.exports=Object.freeze({
  HTTP_TIMEOUT_MS: 15000,
  INTERNAL_MAX_RETRIES: 4,
  STALE_TIMEOUT_MS: 600000, // Live silenciosa não deve parecer desconectada; close/error continuam imediatos.
  SUPERVISOR_MAX_RECOVERY_FAILURES: 20
});
