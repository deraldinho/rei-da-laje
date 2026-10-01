const test=require('node:test');
const assert=require('node:assert/strict');
const {classifyConnectionError}=require('../backend/tiktokDiagnostics');
const TikTokService=require('../backend/tiktokService');
const GameRules=require('../backend/rules/gameRules');
const BuffManager=require('../backend/rules/buffManager');

test('falhas TikTok recebem código diagnóstico seguro',()=>{
  assert.equal(classifyConnectionError(new Error('user is not currently live')),'LIVE_OFFLINE');
  assert.equal(classifyConnectionError(new Error('Tempo esgotado ao localizar a sala TikTok')),'TIMEOUT');
  assert.equal(classifyConnectionError(new Error('429 too many requests')),'RATE_LIMIT');
  assert.equal(classifyConnectionError(new Error('requires a Business plan')),'PROVIDER_AUTH');
  assert.equal(classifyConnectionError(new Error('falha desconhecida')),'CONNECT_FAILED');
  assert.equal(classifyConnectionError({code:'UND_ERR_SOCKET',message:'socket closed'}),'UND_ERR_SOCKET');
});

test('msgId de presente impede aplicação duplicada por dois minutos',()=>{
  const service=new TikTokService({emit(){}},new GameRules(2),new BuffManager(null));
  const gift={roomId:'room-1',messageId:'123'};
  assert.equal(service.isDuplicateGift(gift,1000),false);
  assert.equal(service.isDuplicateGift(gift,2000),true);
  assert.equal(service.isDuplicateGift({roomId:'room-1',messageId:'124'},2000),false);
  assert.equal(service.isDuplicateGift({roomId:'room-2',messageId:'123'},2000),false);
  assert.equal(service.isDuplicateGift({giftId:'x'},2000),false);
  assert.equal(service.isDuplicateGift(gift,122001),false);
});
