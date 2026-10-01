function isLoopbackAddress(address='') {
  const value=String(address||'').trim().toLowerCase().split('%')[0];
  return value==='::1' || value==='localhost' || /^127(?:\.\d{1,3}){3}$/.test(value)
    || /^::ffff:127(?:\.\d{1,3}){3}$/.test(value);
}
function isLoopbackOrigin(originStr='') {
  if (!originStr) return true;
  try {
    const parsed = new URL(originStr);
    return isLoopbackAddress(parsed.hostname);
  } catch (_) {
    return false;
  }
}
function remoteControlAllowed() {
  return process.env.PIPA_ALLOW_REMOTE_CONTROL==='1';
}
function isLocalRequest(req) {
  if (remoteControlAllowed()) return true;
  const ip = req?.socket?.remoteAddress || req?.ip || '';
  if (!isLoopbackAddress(ip)) return false;
  const origin = req?.headers?.origin;
  if (origin && !isLoopbackOrigin(origin)) return false;
  return true;
}
function requireLocalControl(req,res,next) {
  if (isLocalRequest(req)) return next();
  return res.status(403).json({success:false,error:'Controle disponível somente no computador da Live.'});
}
function canClaimCombat(socket) {
  if (remoteControlAllowed()) return true;
  const ip = socket?.handshake?.address || socket?.conn?.remoteAddress || '';
  if (!isLoopbackAddress(ip)) return false;
  const origin = socket?.handshake?.headers?.origin;
  if (origin && !isLoopbackOrigin(origin)) return false;
  return true;
}
module.exports={isLoopbackAddress,isLoopbackOrigin,isLocalRequest,requireLocalControl,canClaimCombat};
