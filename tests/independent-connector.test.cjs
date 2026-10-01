const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const TikTokService = require('../backend/tiktokService');

test('conector independente encaminha comentários, presentes, curtidas e novos seguidores', async () => {
  const client = new EventEmitter();
  client.connect = async () => { queueMicrotask(() => client.emit('connected', { roomId: 'test-room' })); return new Promise(() => {}); };
  client.disconnect = async () => {};
  const events = [];
  const io = { emit: (...args) => events.push(args) };
  const joined = [];
  const gifted = [];
  const rules = { handlePlayerComment: p => { joined.push(p); return { status: 'already_active' }; } };
  const buffs = { applyGiftUpgrade: (...args) => { gifted.push(args); return {}; } };
  const service = new TikTokService(io, rules, buffs, async () => client);
  assert.equal((await service.connect('@live_teste')).success, true);
  client.emit('chat', { data: { user: { userId: 123, uniqueId: 'ana', nickname: 'Ana' }, content: 'Oi' } });
  assert.equal(joined.length, 1);
  assert.equal(joined[0].userId, '123');
  client.emit('like', { data: { totalLikes: 7 } });
  assert.equal(events.find(([name]) => name === 'likes:burst')[1].totalLikes, 7);
  client.emit('follow', { data: { user: { userId: 321, uniqueId: 'bia', nickname: 'Bia', avatarThumb: { urlList: ['https://img.test/bia.jpg'] } } } });
  const follow=events.find(([name]) => name === 'follow:new');
  assert.equal(follow[1].userId, '321');
  assert.equal(follow[1].nickname, 'Bia');
  assert.equal(follow[1].profilePictureUrl, 'https://img.test/bia.jpg');
  assert.equal(service.eventCounts.follow, 1);
  await service.disconnect();
  assert.equal(service.isConnected, false);
});

test('erro de transporte do conector não encerra servidor nem fica pendente', async () => {
  const client = new EventEmitter();
  client.connect = async () => { queueMicrotask(() => client.emit('error', { code: 'UND_ERR_SOCKET', message: 'other side closed' })); return new Promise(() => {}); };
  client.disconnect = () => {};
  const events = [];
  const service = new TikTokService({ emit: (...args) => events.push(args) }, {}, {}, async () => client);
  await assert.rejects(service.connect('@live_teste'), error => error.code === 'UND_ERR_SOCKET');
  assert.equal(service.isConnected, false);
  assert.equal(service.connection, null);
  assert.ok(events.some(([event, data]) => event === 'tiktok:status' && data.connected === false));
});

test('queda após sala localizada libera conexão e permite reconectar ao perfil salvo', async () => {
  const clients = [];
  const factory = async () => {
    const client = new EventEmitter();
    client.connect = async () => { queueMicrotask(() => client.emit('connected', { roomId: 'room-a' })); return new Promise(() => {}); };
    client.disconnect = () => { client.closed = true; };
    clients.push(client);
    return client;
  };
  const statuses = [];
  const service = new TikTokService({ emit: (event, data) => { if (event === 'tiktok:status') statuses.push(data); } }, {}, {}, factory);
  assert.equal((await service.connect('deraldinho73')).success, true);
  clients[0].emit('error', { code: 'WORKER_EXIT' });
  assert.equal(service.isConnected, false);
  assert.equal(service.connection, null);
  assert.equal(service.currentUsername, null);
  assert.equal(service.connectionFailures, 1);
  assert.equal((await service.connect('deraldinho73')).success, true);
  assert.equal(clients.length, 2);
  assert.ok(statuses.some(status => status.retrying === true));
  await service.disconnect();
});

test('falha transitória de WebSocket não encerra worker nem força novo connect externo', async () => {
  const client = new EventEmitter();
  let disconnects = 0;
  client.connect = async () => { queueMicrotask(() => client.emit('connected', { roomId:'room-live' })); return new Promise(() => {}); };
  client.disconnect = () => { disconnects++; };
  const statuses = [];
  const service = new TikTokService({ emit:(event,data)=>{if(event==='tiktok:status')statuses.push(data);} }, {}, {}, async()=>client);
  assert.equal((await service.connect('live_teste')).success,true);
  client.emit('transport_warning',{code:'UND_ERR_SOCKET'});
  client.emit('reconnecting',{attempt:1,maxRetries:5,delayMs:2000});
  assert.equal(service.connection,client);
  assert.equal(service.isConnected,true);
  assert.equal(service.hasReceivedEvent,false);
  assert.equal(service.transportReconnecting,true);
  assert.equal(service.connectionFailures,0);
  assert.equal(service.transportWarnings,1);
  assert.equal(service.internalRetry.delayMs,2000);
  assert.ok(statuses.some(s=>s.phase==='reconnecting'));
  assert.equal(disconnects,0);
  client.emit('like',{data:{likeCount:2}});
  assert.equal(service.transportReconnecting,false);
  assert.equal(service.hasReceivedEvent,true);
  assert.ok(service.lastEventAt>0);
  client.emit('error',{code:'TRANSPORT_DISCONNECTED'});
  client.emit('error',{code:'WORKER_EXIT'});
  assert.equal(service.connection,null);
  assert.equal(service.connectionFailures,1);
});

test('restauração interna do worker limpa estado de reconexão sem criar nova conexão externa',async()=>{
 const client=new EventEmitter();
 client.connect=async()=>{queueMicrotask(()=>client.emit('connected',{roomId:'room-stable'}));return new Promise(()=>{});};
 client.disconnect=()=>{};
 const statuses=[];
 const service=new TikTokService({emit:(event,data)=>{if(event==='tiktok:status')statuses.push(data);}}, {}, {}, async()=>client);
 assert.equal((await service.connect('live_teste')).success,true);
 client.emit('reconnecting',{attempt:2,maxRetries:2,delayMs:4000});
 assert.equal(service.transportReconnecting,true);
 client.emit('room_relocated',{roomId:'room-stable',cycle:2});
 assert.equal(service.transportReconnecting,true);
 assert.ok(statuses.some(s=>s.phase==='room_relocated'&&s.retrying===true));
 const activityAt=Date.now();
 client.emit('transport_activity',{cycle:2,at:activityAt});
 assert.equal(service.lastTransportActivityAt,activityAt);
 client.emit('transport_restored',{roomId:'room-stable',cycle:2,at:activityAt});
 assert.equal(service.isConnected,true);
 assert.equal(service.transportReconnecting,false);
 assert.equal(service.transportRecoveries,1);
 assert.ok(service.lastTransportRecoveredAt>0);
 assert.equal(service.connectionFailures,0);
 assert.ok(statuses.some(s=>s.phase==='transport_restored'&&s.retrying===false));
 await service.disconnect();
});

test('presente repetido pelo mesmo msgId após reconexão é ignorado por dois minutos',()=>{
 const service=new TikTokService({emit(){}},{},{});
 const gift={roomId:'r1',messageId:'m123'};
 assert.equal(service.isDuplicateGift(gift,100000),false);
 assert.equal(service.isDuplicateGift(gift,100500),true);
 assert.equal(service.isDuplicateGift({...gift,messageId:'m124'},100500),false);
 assert.equal(service.isDuplicateGift(gift,221000),false);
});

test('fim real da Live preserva worker em espera e só cai se o worker encerrar',async()=>{
 const client=new EventEmitter();
 client.connect=async()=>{queueMicrotask(()=>client.emit('connected',{roomId:'room-end'}));return new Promise(()=>{});};
 client.disconnect=()=>{};
 const service=new TikTokService({emit(){}},{},{},async()=>client);
 let down=0;
 service.onTransportDown=()=>{down++;};
 assert.equal((await service.connect('live_teste')).success,true);
 client.emit('liveEnded',{});
 assert.equal(service.isConnected,false);
 assert.equal(service.connection,client);
 assert.equal(service.lastConnectionError.code,'LIVE_ENDED');
 assert.equal(service.transportReconnecting,true);
 assert.equal(down,0);
 client.emit('error',{code:'WORKER_EXIT'});
 assert.equal(service.connection,null);
 assert.equal(down,1);
});

test('warning isolado não declara reconexão enquanto o WSS não emitir reconnecting',async()=>{
 const client=new EventEmitter();
 client.connect=async()=>{queueMicrotask(()=>client.emit('connected',{roomId:'room-warning'}));return new Promise(()=>{});};
 client.disconnect=()=>{};
 const statuses=[];
 const service=new TikTokService({emit:(event,data)=>{if(event==='tiktok:status')statuses.push(data);}}, {}, {}, async()=>client);
 assert.equal((await service.connect('live_teste')).success,true);
 service.hasReceivedEvent=true;
 client.emit('transport_warning',{code:'FRAME_DECODE_WARNING'});
 assert.equal(service.isConnected,true);
 assert.equal(service.transportReconnecting,false);
 assert.equal(service.hasReceivedEvent,true);
 assert.equal(statuses.at(-1).phase,'transport_warning');
 assert.equal(statuses.at(-1).retrying,false);
 client.emit('reconnecting',{attempt:1,maxRetries:4,delayMs:1000});
 assert.equal(service.transportReconnecting,true);
 assert.equal(service.hasReceivedEvent,false);
 await service.disconnect();
});
