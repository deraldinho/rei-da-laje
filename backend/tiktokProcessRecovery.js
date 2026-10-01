const RECOVERABLE_TRANSPORT_CODES=new Set([
  'UND_ERR_SOCKET','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT',
  'ECONNRESET','ECONNABORTED','ETIMEDOUT','EPIPE','ENETRESET','ENETDOWN','ENETUNREACH','EHOSTUNREACH'
]);
function isRecoverableTransportError(error){
  const code=String(error?.code || error?.cause?.code || '');
  const message=String(error?.message || error?.cause?.message || '');
  return RECOVERABLE_TRANSPORT_CODES.has(code) || /other side closed|socket hang up|network.*(?:reset|closed)/i.test(message);
}
module.exports={RECOVERABLE_TRANSPORT_CODES,isRecoverableTransportError};
