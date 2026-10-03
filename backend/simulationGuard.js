function isSimulationEnabled(env = process.env) {
  return String(env?.PIPA_ENABLE_SIMULATION || '').trim() === '1';
}

function isAdminSimulationRequest(req = {}) {
  const value = req?.headers?.['x-pipa-simulation'] ?? req?.get?.('X-Pipa-Simulation');
  if (String(value || '').trim().toLowerCase() === 'admin') return true;

  const referer = String(req?.headers?.referer || req?.headers?.referrer || '');
  const remoteAddress = String(req?.socket?.remoteAddress || req?.ip || '').toLowerCase();
  const loopback = remoteAddress === '::1' || remoteAddress === 'localhost'
    || /^127(?:\.\d{1,3}){3}$/.test(remoteAddress)
    || /^::ffff:127(?:\.\d{1,3}){3}$/.test(remoteAddress);
  if (!loopback || !referer) return false;
  try {
    const url = new URL(referer);
    const host = String(url.hostname || '').toLowerCase();
    const localHost = host === 'localhost' || host === '::1' || /^127(?:\.\d{1,3}){3}$/.test(host);
    return localHost && url.pathname === '/admin';
  } catch (_) {
    return false;
  }
}

function isSimulationUserId(value = '') {
  const id = String(value || '');
  return id.startsWith('sim_') || id.startsWith('catcher_');
}

function isSimulationPlayer(value) {
  return Boolean(value?.isSimulation) || isSimulationUserId(value?.userId ?? value);
}

function requireSimulationEnabled(req, res, next) {
  if (isSimulationEnabled() || isAdminSimulationRequest(req)) {
    req.isSimulation = true;
    return next();
  }
  return res.status(404).json({
    success: false,
    error: 'Rotas de simulação desabilitadas neste runtime.'
  });
}

module.exports = {
  isSimulationEnabled,
  isAdminSimulationRequest,
  isSimulationUserId,
  isSimulationPlayer,
  requireSimulationEnabled
};
