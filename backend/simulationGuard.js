function isSimulationEnabled(env = process.env) {
  return String(env?.PIPA_ENABLE_SIMULATION || '').trim() === '1';
}

function requireSimulationEnabled(req, res, next) {
  if (isSimulationEnabled()) return next();
  return res.status(404).json({
    success: false,
    error: 'Rotas de simulação desabilitadas neste runtime.'
  });
}

module.exports = {
  isSimulationEnabled,
  requireSimulationEnabled
};
