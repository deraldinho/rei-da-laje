const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));

test('P18: package expõe gates unit/browser/perf/soak/verify',()=>{
  for(const name of ['test:unit','test:browser','test:perf','test:soak','verify']){
    assert.equal(typeof pkg.scripts?.[name],'string',`script ${name} ausente`);
  }
  assert.match(pkg.scripts.verify,/verify\.mjs/);
});

test('P18: Vite separa Three, Pixi e Socket do chunk principal',()=>{
  const file=path.join(root,'frontend','vite.config.js');
  assert.equal(fs.existsSync(file),true,'frontend/vite.config.js ausente');
  const code=fs.readFileSync(file,'utf8');
  assert.match(code,/manualChunks/);
  assert.match(code,/vendor-three/);
  assert.match(code,/vendor-pixi/);
  assert.match(code,/vendor-socket/);
});

test('P18: artefatos pesados e runtime local ficam fora de versionamento',()=>{
  const file=path.join(root,'.gitignore');
  assert.equal(fs.existsSync(file),true,'.gitignore ausente');
  const code=fs.readFileSync(file,'utf8');
  assert.match(code,/node_modules\//);
  assert.match(code,/frontend\/dist\//);
  assert.match(code,/backups\//);
});