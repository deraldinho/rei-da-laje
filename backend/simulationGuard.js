function isSimulationEnabled(env = process.env) {
  return String(env?.PIPA_ENABLE_SIMULATION || '').trim() === '1';
}

function isAdminSimulationRequest(req = {}) {
  const value = req?.headers?.['x-pipa-simulation'] ?? req?.get?.('X-Pipa-Simulation');
  return String(value || '').trim().toLowerCase() === 'admin';
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
