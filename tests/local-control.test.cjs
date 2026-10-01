const test=require('node:test');
const assert=require('node:assert/strict');
const {isLoopbackAddress,isLocalRequest,requireLocalControl,canClaimCombat}=require('../backend/localControl');

test('somente loopback controla APIs e pode assumir combate por padrão',()=>{
  for(const address of ['127.0.0.1','127.23.9.4','::1','::ffff:127.0.0.1']){
    assert.equal(isLoopbackAddress(address),true,address);
    assert.equal(isLocalRequest({socket:{remoteAddress:address}}),true,address);
    assert.equal(canClaimCombat({handshake:{address}}),true,address);
  }
  for(const address of ['192.168.1.22','10.0.0.8','8.8.8.8','::ffff:192.168.1.22']){
    assert.equal(isLoopbackAddress(address),false,address);
    assert.equal(canClaimCombat({handshake:{address}}),false,address);
  }
});

test('middleware rejeita controle remoto sem executar next',()=>{
  let nextCalled=false,statusCode=null,payload=null;
  const res={status(code){statusCode=code;return this;},json(body){payload=body;return body;}};
  requireLocalControl({socket:{remoteAddress:'192.168.1.33'}},res,()=>{nextCalled=true;});
  assert.equal(nextCalled,false);assert.equal(statusCode,403);assert.equal(payload.success,false);
});

test('override remoto é somente opt-in explícito',()=>{
  const old=process.env.PIPA_ALLOW_REMOTE_CONTROL;
  try{
    process.env.PIPA_ALLOW_REMOTE_CONTROL='1';
    assert.equal(isLocalRequest({socket:{remoteAddress:'203.0.113.8'}}),true);
    assert.equal(canClaimCombat({handshake:{address:'203.0.113.8'}}),true);
  }finally{
    if(old===undefined)delete process.env.PIPA_ALLOW_REMOTE_CONTROL;else process.env.PIPA_ALLOW_REMOTE_CONTROL=old;
  }
});
