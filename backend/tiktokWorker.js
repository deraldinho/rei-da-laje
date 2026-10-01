// Processo isolado: falhas internas do transporte TikTok não encerram o GameServer.
const { superviseTikTok } = require('./tiktokWorkerSupervisor');
const TRANSPORT = require('./tiktokTransportConfig');
const { transportLog } = require('./tiktokTransportLog');
const { isRecoverableTransportError } = require('./tiktokProcessRecovery');
const { installTtwidFetchGuard, invalidateTtwidCache } = require('./tiktokFetchGuard');
let client = null;
let stopping = false;
let running = false;

const send = (event, payload) => {
  if (!['chat','gift','like','follow','transport_activity'].includes(event)) transportLog(event,payload);
  if (process.connected) process.send({ event, payload });
};

async function stop() {
  stopping = true;
  try { await client?.disconnect?.(); } catch (_) {}
}

process.on('message', async message => {
  if (message?.action === 'disconnect') {
    await stop();
    process.exit(0);
    return;
  }
  if (message?.action !== 'connect' || running) return;
  running = true;
  transportLog('worker_start',{username:message.username,config:TRANSPORT});
  installTtwidFetchGuard({onFallback:info=>transportLog('ttwid_cache_fallback',info)});
  try {
    const { TikTokLiveClient } = await import('piratetok-live-js');
    const supervisorResult=await superviseTikTok({
      username:message.username,
      send,
      isStopping:()=>stopping,
      setCurrentClient:value=>{client=value;},
      maxRecoveryFailures:TRANSPORT.SUPERVISOR_MAX_RECOVERY_FAILURES,
      onDeviceBlocked:()=>{invalidateTtwidCache();transportLog('ttwid_cache_invalidated',{reason:'DEVICE_BLOCKED'});},
      createClient:async username=>new TikTokLiveClient(username)
        .timeout(TRANSPORT.HTTP_TIMEOUT_MS)
        .maxRetries(TRANSPORT.INTERNAL_MAX_RETRIES)
        .staleTimeout(TRANSPORT.STALE_TIMEOUT_MS)
    });
    transportLog('supervisor_return',{result:supervisorResult,stopping});
  } catch (error) {
    transportLog('worker_exception',{code:error?.code,name:error?.name,message:error?.message,stack:String(error?.stack||'').slice(0,1200)});
    send('error', {
      code:String(error?.code || error?.cause?.code || ''),
      message:/not currently live|offline/i.test(String(error?.message||''))
        ? 'Live não encontrada pelo conector.'
        : 'Falha ao abrir a conexão TikTok.'
    });
  } finally {
    running = false;
    transportLog('worker_finally',{stopping});
    if (!stopping) setTimeout(()=>process.exit(1),50).unref();
  }
});

function recoverProcessTransport(kind,error){
  const payload={code:error?.code || error?.cause?.code,name:error?.name,message:String(error?.message||error||'').slice(0,600),stack:String(error?.stack||'').slice(0,1200)};
  transportLog(kind,payload);
  if(!isRecoverableTransportError(error))return false;
  transportLog('recoverable_process_transport',payload);
  send('transport_diagnostic',{code:String(payload.code||'PROCESS_TRANSPORT'),name:String(payload.name||''),detail:payload.message});
  try{client?.disconnect?.();}catch(_){}
  return true;
}
process.on('unhandledRejection', reason => {
  if(!recoverProcessTransport('unhandled_rejection',reason)){
    transportLog('fatal_unhandled_rejection',{});
    process.exit(1);
  }
});
process.on('uncaughtException', error => {
  if(!recoverProcessTransport('uncaught_exception',error)){
    transportLog('fatal_uncaught_exception',{});
    process.exit(1);
  }
});
process.on('disconnect', async () => {
  transportLog('ipc_disconnect',{});
  await stop();
  process.exit(0);
});
