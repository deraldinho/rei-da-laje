const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const LiveActivityMonitor=require('../backend/liveActivityMonitor');
const GameReplayStore=require('../backend/gameReplayStore');

test('activity monitor detects stale transport, stuck reconnect and failure growth',()=>{
  let now=100000;
  const m=new LiveActivityMonitor(()=>now);
  m.transport(now); m.record('chat',now);
  assert.equal(m.snapshot({connected:true,eventsActive:true}).healthy,true);
  m.reconnecting(true); now+=31000;
  let h=m.snapshot({connected:true,eventsActive:false});
  assert.ok(h.reasons.includes('RECONNECT_STUCK'));
  assert.ok(h.reasons.includes('TRANSPORT_STALE'));
  m.failure('X');m.failure('X');m.failure('X');
  h=m.snapshot({connected:true});
  assert.ok(h.reasons.includes('FAILURE_GROWTH'));
  m.reconnecting(false);m.transport(now);
  assert.equal(m.snapshot({connected:false}).reasons.includes('DISCONNECTED'),true);
});

test('recorded game can be archived and replayed deterministically',async()=>{
  let now=1000;
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pipa-replay-'));
  const store=new GameReplayStore(dir,()=>now);
  store.record('chat',{userId:'u1',nickname:'A',comment:'subir'});
  now+=100; store.record('gift',{userId:'u1',giftId:'rose',giftName:'Rose',repeatCount:1,diamondCount:1});
  now+=100; store.record('like',{count:25});
  const file=store.save('historical');
  const seen=[];
  const result=await store.replay(path.basename(file),{
    chat:d=>seen.push(['chat',d.userId]),gift:d=>seen.push(['gift',d.giftName]),like:d=>seen.push(['like',d.count])
  },{speed:100,maxDelayMs:0});
  assert.equal(result.events,3);
  assert.deepEqual(seen,[['chat','u1'],['gift','Rose'],['like',25]]);
});
