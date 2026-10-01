const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const overlayUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/ui/LineContactDebugOverlay.js')).href;
const managerUrl=pathToFileURL(path.resolve(__dirname,'../frontend/src/engine/physics/LineContactManager.js')).href;

class StubElement{
  constructor(tag){this.tagName=tag.toUpperCase();this.style={};this.children=[];this.textContent='';this.parentNode=null;}
  appendChild(el){this.children.push(el);el.parentNode=this;return el;}
  remove(){if(this.parentNode){const i=this.parentNode.children.indexOf(this);if(i>=0)this.parentNode.children.splice(i,1);}this.parentNode=null;}
}
function stubDocument(){
  const body=new StubElement('body');
  return {body,createElement:tag=>new StubElement(tag)};
}
function sample(){return [{pairKey:'A|B',lineAId:'A',lineBId:'B',x:123.4,y:456.7,crossingAngle:Math.PI/4,
  tensionA:.71,tensionB:.82,normalForce:.63,vSlide:2.31,contactTime:.42,slidingDistance:1.37,
  abrasionRateA:.12,abrasionRateB:.22,abrasionA:.38,abrasionB:.61,cutResistanceA:1.1,cutResistanceB:1.45,
  s:.35,t:.64,phase:'CONTACT',active:true}];}

test('modo desabilitado não cria DOM',async()=>{
  const doc=stubDocument(); global.document=doc;
  const {LineContactDebugOverlay}=await import(`${overlayUrl}?t=${Date.now()}`);
  const overlay=new LineContactDebugOverlay({enabled:false});
  overlay.update(sample());
  assert.equal(doc.body.children.length,0);
  overlay.destroy();
});

test('modo habilitado exibe todas as métricas físicas e reutiliza os mesmos nós DOM',async()=>{
  const doc=stubDocument(); global.document=doc;
  const {LineContactDebugOverlay}=await import(`${overlayUrl}?t=${Date.now()}-on`);
  const snapshot=sample(); const before=JSON.stringify(snapshot);
  const overlay=new LineContactDebugOverlay({enabled:true});
  assert.equal(doc.body.children.length,1);
  const root=doc.body.children[0], panel=root.children[0];
  overlay.update(snapshot);
  const text=panel.textContent;
  for(const token of ['A|B','123.4','456.7','45.0°','0.71','0.82','0.63','2.31','0.42','1.37','0.12','0.22','0.38','0.61','1.10','1.45','0.35','0.64']) assert.ok(text.includes(token),`faltou ${token}`);
  overlay.update(sample());
  assert.strictEqual(doc.body.children[0],root); assert.strictEqual(root.children[0],panel);
  assert.equal(JSON.stringify(snapshot),before,'overlay não pode mutar snapshot');
  overlay.destroy(); assert.equal(doc.body.children.length,0);
});

test('snapshot do manager inclui resistência de corte das duas linhas',async()=>{
  const {LineContactManager}=await import(`${managerUrl}?t=${Date.now()}-manager`);
  const manager=new LineContactManager();
  const a={userId:'A',rope:{material:{cutResistance:1.1}}};
  const b={userId:'B',rope:{material:{cutResistance:1.45}}};
  manager.beginStep(0,1/60);
  manager.touch('A|B',a,b,{hit:true,x:1,y:2,s:.3,t:.6,segmentIndexA:0,segmentIndexB:0,distance:0,contactRadius:2},
    {sinAngle:.7,crossingAngle:.8,tensionA:.7,tensionB:.8,effectiveTension:.75,normalForce:.5,vSlide:2});
  manager.endStep(0);
  const [snap]=manager.snapshot(1);
  assert.equal(snap.cutResistanceA,1.1);
  assert.equal(snap.cutResistanceB,1.45);
});

test('GameApp liga debug somente por query, atualiza fora da física a no máximo 10 Hz e destrói overlay',()=>{
  const fs=require('node:fs');
  const app=fs.readFileSync(path.resolve(__dirname,'../frontend/src/engine/App.js'),'utf8');
  assert.match(app,/LineContactDebugOverlay/);
  assert.match(app,/debugRelinho/);
  assert.match(app,/lineContactDebugOverlay\s*=\s*new LineContactDebugOverlay/);
  assert.match(app,/now\s*-\s*this\._lastRelinhoDebugUpdate\s*>=\s*100/);
  assert.match(app,/relinhoContactSystem\.manager\.snapshot\(8\)/);
  assert.match(app,/lineContactDebugOverlay\?\.destroy\?\.\(\)/);
  const physicsStart=app.indexOf('this._physicsClock.update');
  const renderStart=app.indexOf('// Render visual consistente',physicsStart);
  const physicsBlock=app.slice(physicsStart,renderStart);
  assert.doesNotMatch(physicsBlock,/lineContactDebugOverlay\.update/,'DOM não pode ser atualizado dentro do fixed timestep');
});
