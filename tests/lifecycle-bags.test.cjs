const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {pathToFileURL}=require('node:url');
const path=require('node:path');

async function load(rel){return import(pathToFileURL(path.resolve(__dirname,'..',rel)).href+`?t=${Date.now()}_${Math.random()}`);}

test('P17: LifecycleBag remove listeners exatos e timers de forma idempotente',async()=>{
  const {LifecycleBag}=await load('frontend/src/engine/LifecycleBag.js');
  const calls=[];let next=1;
  const bag=new LifecycleBag({setIntervalFn:(fn,ms)=>({id:next++,fn,ms}),clearIntervalFn:h=>calls.push(['clear',h.id])});
  const target={handlers:new Map(),addEventListener(e,h){this.handlers.set(e,h);},removeEventListener(e,h){if(this.handlers.get(e)===h){this.handlers.delete(e);calls.push(['remove',e]);}}};
  const handler=()=>{};
  bag.listen(target,'resize',handler);
  const timer=bag.interval(()=>{},1000);
  assert.ok(timer);
  assert.equal(target.handlers.get('resize'),handler);
  bag.dispose();bag.dispose();
  assert.equal(target.handlers.has('resize'),false);
  assert.deepEqual(calls,[['clear',1],['remove','resize']]);
});

test('P17: SocketSubscriptionBag remove apenas listeners que registrou',async()=>{
  const {SocketSubscriptionBag}=await load('frontend/src/engine/SocketSubscriptionBag.js');
  const socket=new EventEmitter();
  let external=0,own=0;
  socket.on('event',()=>external++);
  const bag=new SocketSubscriptionBag(socket);
  bag.on('event',()=>own++);
  socket.emit('event');
  bag.dispose();bag.dispose();
  socket.emit('event');
  assert.equal(own,1);
  assert.equal(external,2);
  assert.equal(socket.listenerCount('event'),1);
});