const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const url=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/LiveCombatDirector.js')).href;

const make=(i,n=20)=>({userId:`p${i}`,x:100+i*40,y:320+(i%3)*70,z:100,
  baseX:100+i*40,baseY:1700,baseZ:0,vx:0,vy:0,vz:0,liveAssistTime:5,
  rooftopPlayer:{layoutIndex:i,layoutTotal:n},isInCombat:false});

test('diretor é puro, finito e estritamente limitado',async()=>{
  const {computeLiveAssist}=await import(`${url}?t=${Date.now()}`);
  const kites=Array.from({length:20},(_,i)=>make(i));
  kites[1].x=kites[0].x+10;kites[1].y=kites[0].y+8;
  const before=structuredClone(kites);const a=computeLiveAssist(kites[0],kites,{x:.8,y:.1,z:0},1/60);
  assert.deepEqual(kites,before);assert.deepEqual(Object.keys(a).sort(),['fx','fy','fz']);
  assert.ok([a.fx,a.fy,a.fz].every(Number.isFinite));assert.ok(Math.hypot(a.fx,a.fy,a.fz)<=25+1e-9);assert.ok(Math.abs(a.fz)<=8+1e-9);
  assert.ok(Math.hypot(a.fx,a.fy,a.fz)>0,'aglomerado deve receber separação fraca');
});
test('diretor fica neutro quando o ritmo já está saudável',async()=>{
  const {computeLiveAssist}=await import(`${url}?healthy=${Date.now()}`);
  const kites=Array.from({length:20},(_,i)=>make(i));const k=kites[4];k.isInCombat=true;
  const a=computeLiveAssist(k,kites,{x:.6,y:0,z:0},1/60);
  assert.deepEqual(a,{fx:0,fy:0,fz:0});
});

test('manobra explícita desliga steering de encontro',async()=>{
  const {computeLiveAssist}=await import(`${url}?action=${Date.now()}`);
  const kites=Array.from({length:20},(_,i)=>make(i));const k=kites[2];
  k.intentController={currentAction:'retao'};
  const a=computeLiveAssist(k,kites,{x:.5,y:0,z:0},1/60);
  assert.deepEqual(a,{fx:0,fy:0,fz:0});
});
