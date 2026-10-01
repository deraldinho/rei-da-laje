import { spawn } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=path.join(root,'tests','evidence');
await mkdir(evidence,{recursive:true});
const port=3119, debugPort=9349;
const durationMs=Math.max(5000,Number(process.env.PIPA_SOAK_MS)||60000);
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=spawn(process.execPath,['backend/server.js'],{cwd:root,env:{...process.env,
  PORT:String(port),PIPA_DISABLE_TIKTOK_AUTOCONNECT:'1',
  PIPA_ARENA_STATE_FILE:path.join(process.env.TEMP,'pipa-soak-'+Date.now()+'.json')},stdio:'ignore'});
let browser,ws,seq=0;
const pending=new Map(),errors=[];
async function waitFor(url){for(let i=0;i<100;i++){try{const r=await fetch(url);if(r.ok)return r;}catch{}await pause(150);}throw Error('Timeout '+url);}
async function send(method,params={}){const id=++seq;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout '+method));},30000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject});ws.send(JSON.stringify({id,method,params}));});}
async function evaluate(expression){const out=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(out.exceptionDetails)throw Error(JSON.stringify(out.exceptionDetails));return out.result.value;}
async function comment(i){const r=await fetch(`http://127.0.0.1:${port}/api/simulate/comment`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:`soak_${i}`,nickname:`Soak ${i+1}`,comment:'entrar'})});assert.ok(r.ok);}
try{
  await waitFor(`http://127.0.0.1:${port}/admin`);
  browser=spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',[
    '--headless=new','--no-first-run','--no-default-browser-check','--disable-background-timer-throttling',
    `--remote-debugging-port=${debugPort}`,'--user-data-dir='+path.join(process.env.TEMP,'pipa-soak-browser-'+Date.now()),'about:blank'
  ],{stdio:'ignore'});
  const tabs=await (await waitFor(`http://127.0.0.1:${debugPort}/json`)).json();
  ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  ws.onmessage=event=>{const msg=JSON.parse(event.data);if(msg.id){const p=pending.get(msg.id);if(p){pending.delete(msg.id);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails);};
  await send('Page.enable');await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:2560,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:`http://127.0.0.1:${port}`});
  for(let i=0;i<80;i++){if(await evaluate('!!window.__PIPA_GAME__?.socket.connected'))break;await pause(150);}
  assert.equal(await evaluate('!!window.__PIPA_GAME__?.socket.connected'),true);
  await evaluate('window.__PIPA_GAME__.app.ticker.stop()');
  await Promise.all(Array.from({length:40},(_,i)=>comment(i)));
  for(let i=0;i<40;i++){if(await evaluate('window.__PIPA_GAME__.kites.size')===40)break;await pause(100);}
  assert.equal(await evaluate('window.__PIPA_GAME__.kites.size'),40);
