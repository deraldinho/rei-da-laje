const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'../frontend/src/engine/physics');
const load=file=>import(pathToFileURL(path.join(root,file)).href+`?t=${Date.now()}-${Math.random()}`);

const kite={x:420,y:360,z:90,vx:.2,vy:-.1,vz:.05,lineTension:.62,lineSlack:.14,
  attitude:{heading:.2,pitch:-.05,roll:0},rope:{spoolLength:900}};
const wind={x:.8,y:-.08,z:.12,gust:1.04,turbulence:.03};

test('comentário arbitrário gera gesto físico determinístico e limitado',async()=>{
  const {createCommentGesture}=await load('CommentGestureEngine.js');
  const input={text:'bora passar no meio delas 🔥🔥',userId:'u42',kite,wind,engagement:.72};
  const a=createCommentGesture(input),b=createCommentGesture(input);
  assert.deepEqual(a,b);
  assert.ok(a.duration>=.3&&a.duration<=2);
  assert.ok(Math.abs(a.spoolCommand)<=1&&Math.abs(a.debicoTorque)<=1.2);
  assert.ok(Math.abs(a.trimPitch)<=.4&&Math.abs(a.tensionAssist)<=.4);
  assert.ok(a.intensity>=.35&&a.intensity<=1.5);
});

test('1 2 3 são comentários comuns e não mapeiam comandos fixos',async()=>{
  const {createCommentGesture}=await load('CommentGestureEngine.js');
  const gestures=['1','2','3'].map(text=>createCommentGesture({text,userId:'same',kite,wind,engagement:.3}));
  assert.ok(gestures.every(Boolean));
  assert.notDeepEqual(gestures.map(g=>g.spoolCommand),[-1,1,.58]);
  assert.ok(gestures.every(g=>g.source==='comment'));
});

test('PlayerIntentController executa envelope de comentário sem alvo nem coordenada',async()=>{
  const {PlayerIntentController}=await load('PlayerIntentController.js');
  const k={x:10,y:20,z:30,vx:0,vy:0,vz:0};
  const c=new PlayerIntentController(k);
  c.triggerIntentEnvelope({source:'comment',spoolCommand:.42,debicoTorque:-.7,trimPitch:.18,tensionAssist:.12,duration:.6,intensity:.9});
  assert.equal(c.currentAction,'comment_gesture');
  const intent=c.update(1/60,wind,[]);
  assert.ok(intent.spoolCommand>.3&&intent.spoolCommand<=1);
  assert.ok(intent.debicoTorque<-.5);
  assert.ok(intent.trimPitch>0&&intent.tensionAssist>0);
  assert.deepEqual({x:k.x,y:k.y,z:k.z},{x:10,y:20,z:30});
});
