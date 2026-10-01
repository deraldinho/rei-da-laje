const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');

const TikTokService=require('../backend/tiktokService');

test('P16: classifica offline, transporte, worker e live encerrada',()=>{
  const {classifyTikTokFailure,TIKTOK_FAILURE}=require('../backend/tiktokRecoveryPolicy');
  assert.equal(classifyTikTokFailure(new Error('HostNotOnline: user is not currently live')),TIKTOK_FAILURE.LIVE_NOT_FOUND);
  assert.equal(classifyTikTokFailure(Object.assign(new Error('other side closed'),{code:'UND_ERR_SOCKET'})),TIKTOK_FAILURE.TRANSPORT_FAILURE);
  assert.equal(classifyTikTokFailure({code:'WORKER_EXIT'}),TIKTOK_FAILURE.WORKER_FAILURE);
  assert.equal(classifyTikTokFailure({code:'LIVE_ENDED'}),TIKTOK_FAILURE.LIVE_ENDED);
});

test('P16: retry offline é lento, com cap de 5 minutos e não esgota supervisor',()=>{
  const {nextTikTokRetry,TIKTOK_FAILURE}=require('../backend/tiktokRecoveryPolicy');
  const first=nextTikTokRetry({kind:TIKTOK_FAILURE.LIVE_NOT_FOUND,attempt:1,random:()=>0.5});
  const capped=nextTikTokRetry({kind:TIKTOK_FAILURE.LIVE_NOT_FOUND,attempt:99,random:()=>0.5});
  assert.equal(first.delayMs,120000);
  assert.equal(capped.delayMs,300000);
  assert.equal(first.countsTowardExhaustion,false);
  assert.equal(first.slow,true);
});

test('P16: falha de transporte usa recuperação rápida e conta para exaustão',()=>{
  const {nextTikTokRetry,TIKTOK_FAILURE}=require('../backend/tiktokRecoveryPolicy');
  const first=nextTikTokRetry({kind:TIKTOK_FAILURE.TRANSPORT_FAILURE,attempt:1,random:()=>0.5});
  const capped=nextTikTokRetry({kind:TIKTOK_FAILURE.TRANSPORT_FAILURE,attempt:99,random:()=>0.5});
  assert.equal(first.delayMs,750);
  assert.equal(capped.delayMs,12000);
  assert.equal(first.countsTowardExhaustion,true);
  assert.equal(first.slow,false);
});
class WaitingClient extends EventEmitter {
  constructor(){ super(); this.disconnects=0; }
  connect(){
    queueMicrotask(()=>this.emit('waiting_for_live',{kind:'LIVE_NOT_FOUND',delayMs:120000,attempt:1}));
    return new Promise(()=>{});
  }
  async disconnect(){ this.disconnects++; }
}

test('P16: serviço mantém worker aguardando Live e promove ao receber connected',async()=>{
  const emitted=[];
  const io={emit:(event,payload)=>emitted.push({event,payload})};
  const client=new WaitingClient();
  const service=new TikTokService(io,{}, {}, async()=>client);
  const result=await service.connect('deraldinho73');
  assert.equal(result.success,true);
  assert.equal(result.waiting,true);
  assert.equal(service.connection,client);
  assert.equal(service.currentUsername,'deraldinho73');
  assert.equal(service.isConnected,false);
  assert.equal(client.disconnects,0);
  client.emit('connected',{roomId:'room-1'});
  assert.equal(service.isConnected,true);
  assert.equal(service.roomFoundCount,1);
  assert.ok(emitted.some(e=>e.event==='tiktok:status'&&e.payload?.phase==='room_found'));
});

test('P16: connect repetido durante waiting reutiliza o mesmo worker',async()=>{
  const io={emit(){}};
  const client=new WaitingClient();
  const service=new TikTokService(io,{}, {}, async()=>client);
  const first=await service.connect('deraldinho73');
  const second=await service.connect('deraldinho73');
  assert.equal(first.waiting,true);
  assert.equal(second.waiting,true);
  assert.equal(client.disconnects,0);
});